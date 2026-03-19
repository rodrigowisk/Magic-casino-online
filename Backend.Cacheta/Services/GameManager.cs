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
                    p.HasFurou = false; // 👇 ZERA A PUNIÇÃO DE FURO PRA NOVA RODADA 👇

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
                        p.Status = "waiting";
                    }
                }

                resolvingState.ViraCard = string.Empty;
                resolvingState.DiscardPile.Clear();
                resolvingState.StockPileCount = 0;
                resolvingState.Phase = "waiting";
            }

            if (cashoutTasks.Any()) await Task.WhenAll(cashoutTasks);

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
            player.Status = "ready";
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
            player.Status = "ready";
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
                    p.HasFurou = false; // Zera por precaução
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

                // 👇 BLOQUEIA A COMPRA DO LIXO SE O JOGADOR DEU UMA "FURADA" 👇
                if (player.HasFurou) return false;

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

    // 👇 RETORNA UMA STRING PARA DIZER SE "FUROU" 👇
    public string DeclareWin(string tableId, string connectionId, string? cardToDiscard, out int seat, out string playerName, out List<List<string>> winningGroups, out List<string> handCards)
    {
        seat = -1;
        playerName = string.Empty;
        winningGroups = new List<List<string>>();
        handCards = new List<string>();
        var table = GetOrCreateTable(tableId);

        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);

            if (player == null || table.CurrentTurnSeat < 0 || player.Seat != table.CurrentTurnSeat || player.Status != "playing")
                return "Invalid";

            var handToValidate = new List<string>(player.Cards);
            if (!string.IsNullOrEmpty(cardToDiscard) && handToValidate.Contains(cardToDiscard))
            {
                handToValidate.Remove(cardToDiscard);
            }

            if (!ValidateCachetaHand(handToValidate, table.ViraCard, out winningGroups))
            {
                // 👇 AQUI ACONTECE A FURADA 👇
                player.HasFurou = true;

                if (!string.IsNullOrEmpty(cardToDiscard) && player.Cards.Contains(cardToDiscard))
                {
                    player.Cards.Remove(cardToDiscard);
                    table.DiscardPile.Add(cardToDiscard);
                }

                seat = player.Seat;
                playerName = player.Name;
                handCards = new List<string>(player.Cards); // Envia as cartas dele para mostrar

                player.HasDrawnThisTurn = false;
                player.LastActiveAt = DateTime.UtcNow;

                AdvanceTurn(table);
                table.TurnEndTime = DateTime.UtcNow.AddSeconds(TurnDurationSeconds);

                return "Furo";
            }

            // 👇 BATIDA VERDADEIRA 👇
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

            return "Win";
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

        var possibleGroups = GenerateAllPossibleGroups(normals, wildcards.Count);

        return FindValidCombination(possibleGroups, normals.Count + wildcards.Count, wildcards.Count, out winningGroups, wildcards);
    }

    private List<List<string>> GenerateAllPossibleGroups(List<string> normals, int availableWildcards)
    {
        var groups = new List<List<string>>();
        var distinctNormals = normals.Distinct().ToList();

        var groupedByRank = distinctNormals.GroupBy(c => GetRankValue(c.Substring(0, c.Length - 1)));
        foreach (var group in groupedByRank)
        {
            var cardsOfRank = group.ToList();
            int maxPossibleWithWildcards = cardsOfRank.Count + availableWildcards;

            if (maxPossibleWithWildcards >= 3)
            {
                for (int size = 3; size <= Math.Min(4, maxPossibleWithWildcards); size++)
                {
                    var combinations = GetCombinations(cardsOfRank, Math.Min(cardsOfRank.Count, size));
                    foreach (var combo in combinations)
                    {
                        if (combo.Count <= size && combo.Count + availableWildcards >= size)
                        {
                            groups.Add(combo);
                        }
                    }
                }
            }
        }

        var groupedBySuit = distinctNormals.GroupBy(c => c.Last());
        foreach (var group in groupedBySuit)
        {
            var cardsOfSuit = group.OrderBy(c => GetRankValue(c.Substring(0, c.Length - 1))).ToList();

            var hasAce = cardsOfSuit.Any(c => GetRankValue(c.Substring(0, c.Length - 1)) == 1);
            var extendedCards = new List<string>(cardsOfSuit);
            if (hasAce)
            {
                var aceCard = cardsOfSuit.First(c => GetRankValue(c.Substring(0, c.Length - 1)) == 1);
                extendedCards.Add(aceCard);
            }

            for (int i = 0; i < extendedCards.Count; i++)
            {
                for (int size = 3; size <= 4; size++)
                {
                    var sequenceCards = new List<string>();
                    int wildcardsNeeded = 0;
                    int currentRank = GetRankValue(extendedCards[i].Substring(0, extendedCards[i].Length - 1));

                    if (i == extendedCards.Count - 1 && GetRankValue(extendedCards[i].Substring(0, extendedCards[i].Length - 1)) == 1)
                        currentRank = 14;

                    bool validSequence = true;

                    for (int j = 0; j < size; j++)
                    {
                        int targetRank = currentRank + j;
                        string targetRankStr = targetRank == 14 ? "A" : targetRank.ToString();
                        if (targetRank == 11) targetRankStr = "J";
                        if (targetRank == 12) targetRankStr = "Q";
                        if (targetRank == 13) targetRankStr = "K";

                        var nextCard = extendedCards.FirstOrDefault(c =>
                            (GetRankValue(c.Substring(0, c.Length - 1)) == targetRank || (targetRank == 14 && GetRankValue(c.Substring(0, c.Length - 1)) == 1))
                            && c.Last() == group.Key);

                        if (nextCard != null && !sequenceCards.Contains(nextCard))
                        {
                            sequenceCards.Add(nextCard);
                        }
                        else
                        {
                            wildcardsNeeded++;
                        }
                    }

                    if (wildcardsNeeded <= availableWildcards && sequenceCards.Count > 0)
                    {
                        groups.Add(sequenceCards);
                    }
                }
            }
        }

        return groups.Distinct(new ListComparer()).ToList();
    }

    private bool FindValidCombination(List<List<string>> possibleGroups, int totalCards, int totalWildcards, out List<List<string>> winningGroups, List<string> actualWildcards)
    {
        winningGroups = new List<List<string>>();
        int targetGroupsCount = totalCards == 9 ? 3 : 3;

        var combinations = GetCombinations(possibleGroups, targetGroupsCount);

        foreach (var combo in combinations)
        {
            var usedCards = new HashSet<string>();
            int wildcardsNeeded = 0;
            bool isValid = true;

            foreach (var group in combo)
            {
                foreach (var card in group)
                {
                    if (!usedCards.Add(card))
                    {
                        isValid = false;
                        break;
                    }
                }
                if (!isValid) break;

                int expectedSize = Math.Max(3, group.Count);
                if (group.Count < 3) expectedSize = 3;

                wildcardsNeeded += (expectedSize - group.Count);
            }

            if (isValid && wildcardsNeeded == totalWildcards && usedCards.Count + wildcardsNeeded == totalCards)
            {
                winningGroups = new List<List<string>>();
                int wildcardIndex = 0;
                foreach (var group in combo)
                {
                    var finalGroup = new List<string>(group);
                    int expectedSize = Math.Max(3, group.Count);
                    while (finalGroup.Count < expectedSize && wildcardIndex < actualWildcards.Count)
                    {
                        finalGroup.Add(actualWildcards[wildcardIndex]);
                        wildcardIndex++;
                    }
                    winningGroups.Add(finalGroup);
                }
                return true;
            }
        }
        return false;
    }

    private List<List<T>> GetCombinations<T>(List<T> list, int length)
    {
        if (length == 1) return list.Select(t => new List<T> { t }).ToList();
        var result = new List<List<T>>();
        for (int i = 0; i < list.Count; i++)
        {
            var head = list[i];
            var tail = list.Skip(i + 1).ToList();
            foreach (var combination in GetCombinations(tail, length - 1))
            {
                combination.Insert(0, head);
                result.Add(combination);
            }
        }
        return result;
    }

    private class ListComparer : IEqualityComparer<List<string>>
    {
        public bool Equals(List<string>? x, List<string>? y)
        {
            if (x == null || y == null) return x == y;
            if (x.Count != y.Count) return false;
            return x.OrderBy(c => c).SequenceEqual(y.OrderBy(c => c));
        }

        public int GetHashCode(List<string> obj)
        {
            int hash = 19;
            foreach (var item in obj.OrderBy(c => c)) hash = hash * 31 + item.GetHashCode();
            return hash;
        }
    }
}