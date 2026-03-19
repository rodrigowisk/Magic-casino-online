using System.Collections.Concurrent;
using Backend.Cacheta.Models.RealTime;
using Microsoft.AspNetCore.SignalR;
using Backend.Cacheta.Hubs;
using Microsoft.Extensions.DependencyInjection;
using Backend.Cacheta.Data;
using Backend.Cacheta.Messaging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Backend.Cacheta.Services;

public class GameManager
{
    private const int TurnDurationSeconds = 60;

    private readonly ConcurrentDictionary<string, TableState> _tables = new();
    private readonly ConcurrentDictionary<string, List<string>> _tableDecks = new();
    private readonly IServiceProvider _serviceProvider;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly Timer _serverTickTimer;
    private readonly IRabbitMqService _rabbitMqService;
    private readonly IWalletService _walletService;

    public GameManager(
        IServiceProvider serviceProvider,
        IServiceScopeFactory scopeFactory,
        IRabbitMqService rabbitMqService,
        IWalletService walletService)
    {
        _serviceProvider = serviceProvider;
        _scopeFactory = scopeFactory;
        _rabbitMqService = rabbitMqService;
        _walletService = walletService;
        _serverTickTimer = new Timer(CheckTimeouts, null, 1000, 1000);
    }

    private void CheckTimeouts(object? state)
    {
        foreach (var table in _tables.Values)
        {
            bool isTimeout = false;
            int timeoutSeat = -1;

            lock (table.Players)
            {
                if (table.Phase == "betting" && table.TurnEndTime.HasValue && DateTime.UtcNow >= table.TurnEndTime.Value)
                {
                    isTimeout = true;
                    timeoutSeat = table.CurrentTurnSeat;
                    table.TurnEndTime = null;

                    var player = table.Players.FirstOrDefault(p => p.Seat == timeoutSeat);
                    if (player != null)
                    {
                        if (!player.HasDrawnThisTurn)
                        {
                            if (_tableDecks.TryGetValue(table.TableId, out var deck))
                            {
                                if (deck.Count == 0 && table.DiscardPile.Count > 0)
                                {
                                    var newDeck = new List<string>(table.DiscardPile);
                                    table.DiscardPile.Clear();

                                    var rnd = new Random();
                                    deck = newDeck.OrderBy(x => rnd.Next()).ToList();
                                    _tableDecks[table.TableId] = deck;
                                }

                                if (deck.Count > 0)
                                {
                                    string drawnCard = deck.First();
                                    deck.RemoveAt(0);
                                    player.Cards.Add(drawnCard);
                                    table.StockPileCount = deck.Count;
                                }
                            }
                        }

                        if (player.Cards.Count > 0)
                        {
                            string cardToDiscard = player.Cards.Last();
                            player.Cards.Remove(cardToDiscard);
                            table.DiscardPile.Add(cardToDiscard);
                        }

                        player.HasDrawnThisTurn = false;
                        AdvanceTurn(table);
                        table.TurnEndTime = DateTime.UtcNow.AddSeconds(TurnDurationSeconds);
                    }
                }

                table.Players.RemoveAll(p => !p.IsSeated && string.IsNullOrEmpty(p.ConnectionId) && p.LastActiveAt < DateTime.UtcNow.AddHours(-6));
            }

            if (isTimeout)
            {
                var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                _ = hubContext.Clients.Group(table.TableId).SendAsync("TableStateUpdated", table);
            }
        }
    }

    public async Task ProcessNextRoundLoop(string tableId, bool roundEnded, int delayMs)
    {
        var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();

        var resolvingState = GetOrCreateTable(tableId);
        lock (resolvingState.Players)
        {
            resolvingState.Phase = "resolving";
        }
        await hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", resolvingState);

        await Task.Delay(delayMs);

        if (roundEnded)
        {
            List<Task> cashoutTasks = new List<Task>();

            lock (resolvingState.Players)
            {
                foreach (var p in resolvingState.Players)
                {
                    p.Cards.Clear();
                    p.HasDrawnThisTurn = false;

                    if (p.LeaveNextHand)
                    {
                        decimal refund = p.Chips;
                        string uId = p.UserId;

                        p.IsSeated = false;
                        p.Seat = -1;
                        p.LeaveNextHand = false;
                        p.Status = "waiting";
                        p.TotalCashOut += p.Chips;
                        p.LastChips = p.Chips;
                        p.Chips = 0;
                        p.LastActiveAt = DateTime.UtcNow;

                        if (refund > 0 && !string.IsNullOrEmpty(uId))
                        {
                            cashoutTasks.Add(Task.Run(async () => {
                                var result = await _walletService.AddCashOutAsync(uId, refund, tableId);
                                if (result.Success)
                                {
                                    var hubCtx = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                                    await hubCtx.Clients.Group($"user_{uId}").SendAsync("WalletBalanceUpdated", result.NewBalance);
                                }
                            }));
                        }
                    }
                    else if (p.IsSeated)
                    {
                        // Todos os sentados vão para WAITING e precisam confirmar o "Continuar"
                        p.Status = "waiting";
                    }
                }

                resolvingState.ViraCard = string.Empty;
                resolvingState.DiscardPile.Clear();
                resolvingState.StockPileCount = 0;
                resolvingState.Phase = "waiting";
            }

            if (cashoutTasks.Any()) await Task.WhenAll(cashoutTasks);

            // Atualiza a mesa para waiting e pede ao frontend para mostrar o botão de Continuar
            var finalWaitingState = GetOrCreateTable(tableId);
            await hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", finalWaitingState);
            await hubContext.Clients.Group(tableId).SendAsync("PromptNextRound");
        }
        else
        {
            var nextTurnState = GetOrCreateTable(tableId);
            lock (nextTurnState.Players)
            {
                nextTurnState.Phase = "betting";
                nextTurnState.TurnEndTime = DateTime.UtcNow.AddSeconds(TurnDurationSeconds);
            }
            await hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", nextTurnState);
        }
    }

    public TableState GetOrCreateTable(string tableId)
    {
        if (!_tables.ContainsKey(tableId))
        {
            int maxPlayers = 6;
            decimal rake = 0;
            decimal minBuyIn = 100;
            decimal ante = 10;
            string tableName = string.Empty;
            DateTime expiresAt = DateTime.UtcNow.AddHours(12);

            using (var scope = _scopeFactory.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var dbTable = dbContext.GameTables.FirstOrDefault(t => t.Id.ToString() == tableId);
                if (dbTable != null)
                {
                    maxPlayers = dbTable.MaxPlayers;
                    rake = dbTable.Rake;
                    minBuyIn = dbTable.MinBuyIn;
                    ante = dbTable.Ante;
                    tableName = dbTable.Name;
                    expiresAt = dbTable.CreatedAt.AddHours(dbTable.DurationHours);
                }
            }

            _tables.TryAdd(tableId, new TableState
            {
                TableId = tableId,
                Name = tableName,
                MaxPlayers = maxPlayers,
                Rake = rake,
                MinBuyIn = minBuyIn,
                MinBet = ante,
                ExpiresAt = expiresAt,
                Players = new List<PlayerState>()
            });
        }
        return _tables[tableId];
    }

    public void AddPlayerToTable(string tableId, PlayerState player)
    {
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            var existingPlayer = table.Players.FirstOrDefault(p => p.UserId == player.UserId);

            if (existingPlayer != null)
            {
                existingPlayer.ConnectionId = player.ConnectionId;
                existingPlayer.Name = player.Name;
                existingPlayer.Avatar = player.Avatar;
                existingPlayer.LastActiveAt = DateTime.UtcNow;
            }
            else
            {
                table.Players.Add(player);
            }
        }
    }

    public bool UpdatePlayerAvatar(string tableId, string connectionId, string newAvatar)
    {
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player != null)
            {
                player.Avatar = newAvatar;
                return true;
            }
        }
        return false;
    }

    public async Task<string?> RemovePlayerByConnectionIdAsync(string connectionId)
    {
        string? tableId = null;
        decimal chipsToReturn = 0;
        string userId = string.Empty;

        foreach (var table in _tables.Values)
        {
            lock (table.Players)
            {
                var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
                if (player != null)
                {
                    tableId = table.TableId;

                    if (player.IsSeated && player.Status == "playing")
                    {
                        player.Status = "out";

                        if (table.Phase == "betting" && table.CurrentTurnSeat == player.Seat)
                        {
                            AdvanceTurn(table);
                            table.TurnEndTime = DateTime.UtcNow.AddSeconds(TurnDurationSeconds);
                        }
                    }

                    if (player.IsSeated)
                    {
                        chipsToReturn = player.Chips;
                        userId = player.UserId;
                        player.TotalCashOut += player.Chips;
                        player.LastChips = player.Chips;
                        player.Chips = 0;
                        player.IsSeated = false;
                        player.Seat = -1;
                    }

                    player.ConnectionId = string.Empty;
                    player.LastActiveAt = DateTime.UtcNow;
                    break;
                }
            }
        }

        if (chipsToReturn > 0 && !string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(tableId))
        {
            var result = await _walletService.AddCashOutAsync(userId, chipsToReturn, tableId);
            if (result.Success)
            {
                var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                await hubContext.Clients.Group($"user_{userId}").SendAsync("WalletBalanceUpdated", result.NewBalance);
            }
        }

        return tableId;
    }

    public async Task<bool> SitPlayer(string tableId, string connectionId, int seat, decimal buyIn)
    {
        var table = GetOrCreateTable(tableId);
        PlayerState? player = null;

        lock (table.Players)
        {
            if (seat >= table.MaxPlayers) return false;
            if (table.Players.Count(p => p.IsSeated) >= table.MaxPlayers) return false;
            if (table.Players.Any(p => p.Seat == seat && p.IsSeated)) return false;

            player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player == null || player.IsSeated) return false;
        }

        var result = await _walletService.DeductBuyInAsync(player.UserId, buyIn, tableId);
        if (!result.Success) return false;

        var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
        await hubContext.Clients.Group($"user_{player.UserId}").SendAsync("WalletBalanceUpdated", result.NewBalance);

        lock (table.Players)
        {
            if (table.Players.Any(p => p.Seat == seat && p.IsSeated))
            {
                _ = Task.Run(async () => {
                    var refundResult = await _walletService.AddCashOutAsync(player.UserId, buyIn, tableId);
                    if (refundResult.Success)
                        await hubContext.Clients.Group($"user_{player.UserId}").SendAsync("WalletBalanceUpdated", refundResult.NewBalance);
                });
                return false;
            }

            player.Seat = seat;
            player.Chips = buyIn;
            player.TotalBuyIn += buyIn;
            player.LastChips = 0;
            player.IsSeated = true;
            player.Status = "ready"; // Já senta com status READY para a próxima mão
            player.LeaveNextHand = false;
            player.LastActiveAt = DateTime.UtcNow;
            return true;
        }
    }

    public async Task<bool> Rebuy(string tableId, string connectionId, decimal amount)
    {
        var table = GetOrCreateTable(tableId);
        PlayerState? player = null;

        lock (table.Players)
        {
            player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player == null || !player.IsSeated) return false;
        }

        var result = await _walletService.DeductBuyInAsync(player.UserId, amount, tableId);
        if (!result.Success) return false;

        var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
        await hubContext.Clients.Group($"user_{player.UserId}").SendAsync("WalletBalanceUpdated", result.NewBalance);

        lock (table.Players)
        {
            player.Chips += amount;
            player.TotalBuyIn += amount;
            player.LastActiveAt = DateTime.UtcNow;
            player.Status = "ready"; // Ao comprar mais fichas, fica pronto.
            return true;
        }
    }

    public bool SetPlayerReady(string tableId, string connectionId)
    {
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player != null && player.IsSeated)
            {
                player.Status = "ready";
                player.LastActiveAt = DateTime.UtcNow;
                return true;
            }
        }
        return false;
    }

    public async Task<bool> StandUp(string tableId, string connectionId)
    {
        var table = GetOrCreateTable(tableId);
        decimal chipsToReturn = 0;
        string userId = string.Empty;
        bool wasSeated = false;

        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player != null && player.IsSeated)
            {
                chipsToReturn = player.Chips;
                userId = player.UserId;

                player.IsSeated = false;
                player.Seat = -1;
                player.Status = "waiting";
                player.Cards.Clear();
                player.LeaveNextHand = false;

                player.TotalCashOut += player.Chips;
                player.LastChips = player.Chips;
                player.Chips = 0;
                player.LastActiveAt = DateTime.UtcNow;

                wasSeated = true;
            }
        }

        if (chipsToReturn > 0 && !string.IsNullOrEmpty(userId))
        {
            var result = await _walletService.AddCashOutAsync(userId, chipsToReturn, tableId);
            if (result.Success)
            {
                var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                await hubContext.Clients.Group($"user_{userId}").SendAsync("WalletBalanceUpdated", result.NewBalance);
                return true;
            }
            return false;
        }

        return wasSeated;
    }

    public void SetLeaveNextHand(string tableId, string connectionId, bool willLeave)
    {
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player != null && player.IsSeated)
            {
                player.LeaveNextHand = willLeave;
                player.LastActiveAt = DateTime.UtcNow;
            }
        }
    }

    public bool CheckAndStartGame(string tableId)
    {
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            bool chargeAnte = table.Pot <= 0;

            // Só começa se tiverem 2 ou mais jogadores no status READY
            var eligiblePlayers = table.Players.Where(p =>
                p.IsSeated && p.Chips > 0 && p.Status == "ready" && (!chargeAnte || p.Chips >= table.MinBet)
            ).OrderBy(p => p.Seat).ToList();

            if (eligiblePlayers.Count >= 2 && table.Phase == "waiting")
            {
                table.Phase = "dealing";

                var ranks = new[] { "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K" };
                var suits = new[] { "♥", "♦", "♣", "♠" };
                var deck = new List<string>();

                for (int i = 0; i < 2; i++)
                {
                    foreach (var r in ranks) foreach (var s in suits) deck.Add(r + s);
                }

                var rnd = new Random();
                deck = deck.OrderBy(x => rnd.Next()).ToList();

                foreach (var p in eligiblePlayers)
                {
                    if (chargeAnte)
                    {
                        p.Chips -= table.MinBet;
                        table.Pot += table.MinBet;
                    }

                    p.Cards = deck.Take(9).ToList();
                    deck.RemoveRange(0, 9);

                    p.Status = "playing";
                    p.LastActiveAt = DateTime.UtcNow;
                    p.HasDrawnThisTurn = false;
                }

                table.ViraCard = deck[0];
                deck.RemoveAt(0);

                table.DiscardPile = new List<string>();
                _tableDecks[tableId] = deck;
                table.StockPileCount = deck.Count;

                table.CurrentTurnSeat = eligiblePlayers[0].Seat;
                return true;
            }
        }
        return false;
    }

    public bool DrawCard(string tableId, string connectionId, bool fromDiscard, out int seat)
    {
        seat = -1;
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);

            if (player == null || table.CurrentTurnSeat < 0 || player.Seat != table.CurrentTurnSeat || player.Status != "playing")
                return false;

            if (player.HasDrawnThisTurn)
                return false;

            seat = player.Seat;

            if (fromDiscard)
            {
                if (table.DiscardPile.Count == 0) return false;

                string drawnCard = table.DiscardPile.Last();
                table.DiscardPile.RemoveAt(table.DiscardPile.Count - 1);
                player.Cards.Add(drawnCard);
            }
            else
            {
                if (!_tableDecks.TryGetValue(tableId, out var deck) || deck.Count == 0)
                {
                    if (table.DiscardPile.Count > 0)
                    {
                        var newDeck = new List<string>(table.DiscardPile);
                        table.DiscardPile.Clear();

                        var rnd = new Random();
                        deck = newDeck.OrderBy(x => rnd.Next()).ToList();
                        _tableDecks[tableId] = deck;
                    }
                    else return false;
                }

                string drawnCard = deck.First();
                deck.RemoveAt(0);
                player.Cards.Add(drawnCard);
                table.StockPileCount = deck.Count;
            }

            player.HasDrawnThisTurn = true;
            player.LastActiveAt = DateTime.UtcNow;
            table.TurnEndTime = DateTime.UtcNow.AddSeconds(TurnDurationSeconds);

            return true;
        }
    }

    public bool DiscardCard(string tableId, string connectionId, string cardToDiscard, out int seat, out bool roundEnded)
    {
        seat = -1;
        roundEnded = false;
        var table = GetOrCreateTable(tableId);

        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);

            if (player == null || table.CurrentTurnSeat < 0 || player.Seat != table.CurrentTurnSeat || player.Status != "playing")
                return false;

            if (!player.HasDrawnThisTurn)
                return false;

            if (!player.Cards.Contains(cardToDiscard))
                return false;

            seat = player.Seat;

            player.Cards.Remove(cardToDiscard);
            table.DiscardPile.Add(cardToDiscard);

            player.HasDrawnThisTurn = false;
            player.LastActiveAt = DateTime.UtcNow;

            AdvanceTurn(table);
            table.TurnEndTime = DateTime.UtcNow.AddSeconds(TurnDurationSeconds);

            return true;
        }
    }

    public bool DeclareWin(string tableId, string connectionId, string? cardToDiscard, out int seat, out string playerName, out List<List<string>> winningGroups)
    {
        seat = -1;
        playerName = string.Empty;
        winningGroups = new List<List<string>>();
        var table = GetOrCreateTable(tableId);

        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);

            if (player == null || table.CurrentTurnSeat < 0 || player.Seat != table.CurrentTurnSeat || player.Status != "playing")
                return false;

            var handToValidate = new List<string>(player.Cards);
            if (!string.IsNullOrEmpty(cardToDiscard) && handToValidate.Contains(cardToDiscard))
            {
                handToValidate.Remove(cardToDiscard);
            }

            // O Motor C# de Backtracking que previne completamente o "bater furado"
            if (!ValidateCachetaHand(handToValidate, table.ViraCard, out winningGroups))
            {
                return false;
            }

            if (!string.IsNullOrEmpty(cardToDiscard) && player.Cards.Contains(cardToDiscard))
            {
                player.Cards.Remove(cardToDiscard);
                table.DiscardPile.Add(cardToDiscard);
            }

            seat = player.Seat;
            playerName = player.Name;

            player.HasDrawnThisTurn = false;
            player.LastActiveAt = DateTime.UtcNow;

            table.CurrentTurnSeat = -1;
            table.TurnEndTime = null;

            return true;
        }
    }

    private bool AdvanceTurn(TableState table)
    {
        for (int i = 1; i <= table.MaxPlayers; i++)
        {
            int nextSeat = (table.CurrentTurnSeat + i) % table.MaxPlayers;
            var playerInSeat = table.Players.FirstOrDefault(p => p.Seat == nextSeat && p.IsSeated);

            if (playerInSeat != null && playerInSeat.Status == "playing")
            {
                table.CurrentTurnSeat = nextSeat;
                return false;
            }
        }
        table.CurrentTurnSeat = -1;
        return true;
    }

    // =========================================================================
    // 👇 MOTOR MATEMÁTICO BLINDADO DE CACHETA/RUMMY 👇
    // =========================================================================

    private int GetRankValue(string rankStr)
    {
        return rankStr switch
        {
            "A" => 1,
            "2" => 2,
            "3" => 3,
            "4" => 4,
            "5" => 5,
            "6" => 6,
            "7" => 7,
            "8" => 8,
            "9" => 9,
            "10" => 10,
            "J" => 11,
            "Q" => 12,
            "K" => 13,
            _ => 0
        };
    }

    private bool ValidateCachetaHand(List<string> hand, string viraCard, out List<List<string>> winningGroups)
    {
        winningGroups = new List<List<string>>();
        if (hand.Count != 9 && hand.Count != 10) return false;

        int viraRank = GetRankValue(viraCard.Substring(0, viraCard.Length - 1));
        int wildcardRank = viraRank == 13 ? 1 : viraRank + 1;

        var wildcards = hand.Where(c => GetRankValue(c.Substring(0, c.Length - 1)) == wildcardRank).ToList();
        var normals = hand.Where(c => GetRankValue(c.Substring(0, c.Length - 1)) != wildcardRank).ToList();

        return BacktrackCacheta(normals, wildcards.Count, new List<List<string>>(), out winningGroups, wildcards);
    }

    private bool BacktrackCacheta(List<string> normals, int wildcardsLeft, List<List<string>> currentGroups, out List<List<string>> finalGroups, List<string> actualWildcards)
    {
        finalGroups = currentGroups;
        if (normals.Count == 0)
        {
            if (currentGroups.Count == 3)
            {
                finalGroups = new List<List<string>>(currentGroups);
                int wIndex = actualWildcards.Count - wildcardsLeft;
                for (int i = 0; i < wildcardsLeft; i++) finalGroups[0].Add(actualWildcards[wIndex + i]);
                return true;
            }
            return false;
        }

        if (currentGroups.Count >= 3) return false;

        var firstCard = normals[0];
        string rankStr = firstCard.Substring(0, firstCard.Length - 1);
        char suit = firstCard.Last();
        int rankVal = GetRankValue(rankStr);

        // 1. Trinca/Quadra (Mesmo número, Naipes OBRIGATORIAMENTE diferentes)
        var sameRankCards = normals.Where(c => GetRankValue(c.Substring(0, c.Length - 1)) == rankVal)
                                   .GroupBy(c => c.Last()).Select(g => g.First()).Take(4).ToList();

        for (int size = 3; size <= 4; size++)
        {
            for (int wUse = 0; wUse <= wildcardsLeft && wUse <= size - 1; wUse++)
            {
                int neededNormal = size - wUse;
                if (sameRankCards.Count >= neededNormal && sameRankCards.Contains(firstCard))
                {
                    var group = sameRankCards.Take(neededNormal).ToList();
                    if (!group.Contains(firstCard))
                    {
                        group.RemoveAt(group.Count - 1);
                        group.Add(firstCard);
                    }

                    var remainingNormals = new List<string>(normals);
                    foreach (var c in group) remainingNormals.Remove(c);

                    var newGroups = new List<List<string>>(currentGroups);
                    var fullGroup = new List<string>(group);
                    for (int i = 0; i < wUse; i++) fullGroup.Add(actualWildcards[actualWildcards.Count - wildcardsLeft + i]);
                    newGroups.Add(fullGroup);

                    if (BacktrackCacheta(remainingNormals, wildcardsLeft - wUse, newGroups, out finalGroups, actualWildcards))
                        return true;
                }
            }
        }

        // 2. Sequência (Mesmo Naipe, em ordem, sem repetir a mesma carta)
        var sameSuitCards = normals.Where(c => c.Last() == suit)
                                   .GroupBy(c => GetRankValue(c.Substring(0, c.Length - 1)))
                                   .Select(g => g.First()).ToList();

        for (int startOffset = 0; startOffset <= 3; startOffset++)
        {
            int startRank = rankVal - startOffset;
            if (startRank < 1) continue;

            for (int size = 3; size <= 4; size++)
            {
                if (startOffset >= size) continue;

                for (int wUse = 0; wUse <= wildcardsLeft && wUse <= size - 1; wUse++)
                {
                    var group = new List<string>();
                    int currentW = wUse;
                    for (int i = 0; i < size; i++)
                    {
                        int targetRank = startRank + i;
                        int searchRank = targetRank == 14 ? 1 : targetRank; // Permite sequência com Ás no final (Q K A)
                        var card = sameSuitCards.FirstOrDefault(c => GetRankValue(c.Substring(0, c.Length - 1)) == searchRank);

                        if (card != null) group.Add(card);
                        else if (currentW > 0) currentW--;
                        else break;
                    }

                    if (group.Count + (wUse - currentW) == size && group.Contains(firstCard))
                    {
                        var remainingNormals = new List<string>(normals);
                        foreach (var c in group) remainingNormals.Remove(c);

                        var newGroups = new List<List<string>>(currentGroups);
                        var fullGroup = new List<string>(group);
                        for (int i = 0; i < (wUse - currentW); i++) fullGroup.Add(actualWildcards[actualWildcards.Count - wildcardsLeft + i]);
                        newGroups.Add(fullGroup);

                        if (BacktrackCacheta(remainingNormals, wildcardsLeft - (wUse - currentW), newGroups, out finalGroups, actualWildcards))
                            return true;
                    }
                }
            }
        }

        return false;
    }
}