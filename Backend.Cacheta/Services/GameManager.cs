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

    // 👇 MÁGICA PARA O HOT-RELOAD DO VITE NÃO TRAVAR A MESA 👇
    private void CheckAndResetAbandonedTable(TableState table)
    {
        // Se sobrou menos de 2 jogadores jogando, a mesa tem que abortar a partida e voltar a ficar "waiting"
        int activePlayers = table.Players.Count(p => p.IsSeated && p.Status == "playing");
        if (table.Phase != "waiting" && activePlayers < 2)
        {
            table.Phase = "waiting";
            table.CurrentTurnSeat = -1;
            table.TurnEndTime = null;
            table.ViraCard = string.Empty;
            table.DiscardPile.Clear();
            table.StockPileCount = 0;

            // Reseta os jogadores que sobraram (se houver 1)
            foreach (var p in table.Players.Where(p => p.IsSeated))
            {
                p.Status = "waiting";
                p.Cards.Clear();
                p.HasDrawnThisTurn = false;
                p.HasFurou = false;
            }
        }
    }
    private void CheckTimeouts(object? state)
    {
        foreach (var table in _tables.Values)
        {
            bool stateChanged = false;

            lock (table.Players)
            {
                if (table.Phase == "betting" && table.TurnEndTime.HasValue)
                {
                    double timeRemaining = (table.TurnEndTime.Value - DateTime.UtcNow).TotalSeconds;
                    var player = table.Players.FirstOrDefault(p => p.Seat == table.CurrentTurnSeat);

                    if (player != null && player.Status == "playing")
                    {
                        double autoDrawThreshold = TurnDurationSeconds * 0.25;

                        // 1. Faltando 25% do tempo ou menos: COMPRA AUTOMÁTICA
                        if (timeRemaining <= autoDrawThreshold && !player.HasDrawnThisTurn)
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

                                    player.HasDrawnThisTurn = true;
                                    stateChanged = true;
                                }
                            }
                        }

                        // 2. Faltando 0 segundos: DESCARTE AUTOMÁTICO (E passa a vez)
                        if (timeRemaining <= 0)
                        {
                            table.TurnEndTime = null;

                            if (player.Cards.Count > 0)
                            {
                                string cardToDiscard = player.Cards.Last();
                                player.Cards.Remove(cardToDiscard);
                                table.DiscardPile.Add(cardToDiscard);
                            }

                            player.HasDrawnThisTurn = false;
                            AdvanceTurn(table);
                            table.TurnEndTime = DateTime.UtcNow.AddSeconds(TurnDurationSeconds);
                            stateChanged = true;
                        }
                    }
                }

                // Limpeza de fantasmas e verificação de mesa vazia
                table.Players.RemoveAll(p => !p.IsSeated && string.IsNullOrEmpty(p.ConnectionId) && p.LastActiveAt < DateTime.UtcNow.AddHours(-6));
                CheckAndResetAbandonedTable(table);
            }

            // Se o servidor agiu por tempo (comprou ou descartou), avisa o frontend
            if (stateChanged)
            {
                using var scope = _scopeFactory.CreateScope();
                var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<GameHub>>();
                _ = hubContext.Clients.Group(table.TableId).SendAsync("TableStateUpdated", table);
            }
        }
    }

    public async Task ProcessNextRoundLoop(string tableId, bool roundEnded, int delayMs)
    {
        try
        {
            // 👇 CORREÇÃO: Cria um escopo seguro para o serviço em background 👇
            using var scope = _scopeFactory.CreateScope();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<GameHub>>();

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
                        p.HasFurou = false;

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
                                cashoutTasks.Add(Task.Run(async () =>
                                {
                                    var walletSvc = scope.ServiceProvider.GetRequiredService<IWalletService>();
                                    var result = await walletSvc.AddCashOutAsync(uId, refund, tableId);
                                    if (result.Success)
                                        await hubContext.Clients.Group($"user_{uId}").SendAsync("WalletBalanceUpdated", result.NewBalance);
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
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro no loop da rodada: {ex.Message}");
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

                    // 👇 LIMPEZA DE EMERGÊNCIA (HOT-RELOAD VITE) 👇
                    CheckAndResetAbandonedTable(table);

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

                // 👇 LIMPEZA DE EMERGÊNCIA 👇
                CheckAndResetAbandonedTable(table);
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

    public void ReorderHand(string tableId, string connectionId, List<string> newOrder)
    {
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player != null && player.Status == "playing")
            {
                var oldSorted = player.Cards.OrderBy(c => c).ToList();
                var newSorted = newOrder.OrderBy(c => c).ToList();
                if (oldSorted.SequenceEqual(newSorted))
                {
                    player.Cards = newOrder;
                }
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
                    p.HasFurou = false;
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

            // Tira da mão e joga no lixo
            player.Cards.Remove(cardToDiscard);
            table.DiscardPile.Add(cardToDiscard);

            // Reseta o status de compra do jogador para a próxima vez dele
            player.HasDrawnThisTurn = false;
            player.LastActiveAt = DateTime.UtcNow;

            // 👇 ISSO É OBRIGATÓRIO AQUI: Passa a vez para o próximo! 👇
            AdvanceTurn(table);
            table.TurnEndTime = DateTime.UtcNow.AddSeconds(TurnDurationSeconds);

            return true; // Retorna true indicando que o descarte deu certo
        }
    }

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

            if (!ValidateCachetaHandPro(handToValidate, table.ViraCard, out winningGroups))
            {
                player.HasFurou = true;
                seat = player.Seat;
                playerName = player.Name;
                handCards = new List<string>(player.Cards);
                player.LastActiveAt = DateTime.UtcNow;

                return "Furo";
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

            // 👇 CORREÇÃO: Paga o vencedor! 👇
            player.Chips += table.Pot;
            table.Pot = 0;

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

    private bool ValidateCachetaHandPro(List<string> hand, string viraCard, out List<List<string>> winningGroups)
    {
        winningGroups = new List<List<string>>();
        if (hand.Count != 9 && hand.Count != 10) return false;

        int viraRank = GetRankValue(viraCard.Substring(0, viraCard.Length - 1));
        string wildcardSuit = viraCard.Substring(viraCard.Length - 1);
        int wildcardRank = viraRank == 13 ? 1 : viraRank + 1;

        var wildcards = new List<string>();
        var normals = new List<string>();

        foreach (var c in hand)
        {
            int r = GetRankValue(c.Substring(0, c.Length - 1));
            string s = c.Substring(c.Length - 1);
            if (r == wildcardRank && s == wildcardSuit) wildcards.Add(c);
            else normals.Add(c);
        }

        return RecursiveSolve(normals, wildcards.Count, 0, new List<List<string>>(), out winningGroups, wildcards);
    }

    private bool RecursiveSolve(List<string> remainingCards, int remainingWildcards, int groupsFormed, List<List<string>> currentGroups, out List<List<string>> finalGroups, List<string> actualWildcards)
    {
        finalGroups = new List<List<string>>();

        if (groupsFormed == 3)
        {
            if (remainingCards.Count == 0)
            {
                int wildIndex = 0;
                var solved = new List<List<string>>();

                foreach (var g in currentGroups)
                {
                    var sg = new List<string>(g);
                    while (sg.Count < 3 && wildIndex < actualWildcards.Count)
                    {
                        sg.Add(actualWildcards[wildIndex]);
                        wildIndex++;
                    }
                    solved.Add(sg);
                }

                while (wildIndex < actualWildcards.Count && solved.Count > 0)
                {
                    solved[0].Add(actualWildcards[wildIndex]);
                    wildIndex++;
                }

                finalGroups = solved;
                return true;
            }
            return false;
        }

        var possibleSets = ExtractValidSets(remainingCards, remainingWildcards);

        foreach (var setDef in possibleSets)
        {
            var nextRemaining = new List<string>(remainingCards);
            foreach (var c in setDef.CardsUsed) nextRemaining.Remove(c);

            var nextGroups = new List<List<string>>(currentGroups) { setDef.CardsUsed };
            int nextWilds = remainingWildcards - setDef.WildcardsNeeded;

            if (nextWilds >= 0)
            {
                if (RecursiveSolve(nextRemaining, nextWilds, groupsFormed + 1, nextGroups, out finalGroups, actualWildcards))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private class SetDefinition
    {
        public List<string> CardsUsed { get; set; } = new();
        public int WildcardsNeeded { get; set; }
    }

    private List<SetDefinition> ExtractValidSets(List<string> cards, int maxWildcards)
    {
        var validSets = new List<SetDefinition>();
        if (cards.Count == 0) return validSets;

        var suits = new[] { "♥", "♦", "♣", "♠" };

        foreach (var suit in suits)
        {
            var suitCards = cards.Where(c => c.EndsWith(suit)).OrderBy(c => GetRankValue(c.Substring(0, c.Length - 1))).ToList();
            if (suitCards.Count == 0) continue;

            var expanded = new List<string>(suitCards);
            if (suitCards.Any(c => GetRankValue(c.Substring(0, c.Length - 1)) == 1))
            {
                expanded.Add(suitCards.First(c => GetRankValue(c.Substring(0, c.Length - 1)) == 1));
            }

            for (int i = 0; i < expanded.Count; i++)
            {
                for (int len = 3; len <= 4; len++)
                {
                    var used = new List<string>();
                    int wildsNeeded = 0;
                    int startRank = GetRankValue(expanded[i].Substring(0, expanded[i].Length - 1));
                    if (i >= suitCards.Count) startRank = 14;

                    for (int j = 0; j < len; j++)
                    {
                        int tRank = startRank + j;
                        var targetCard = expanded.FirstOrDefault(c =>
                        {
                            int r = GetRankValue(c.Substring(0, c.Length - 1));
                            if (tRank == 14 && r == 1) return true;
                            return r == tRank;
                        });

                        if (targetCard != null && !used.Contains(targetCard)) used.Add(targetCard);
                        else wildsNeeded++;
                    }

                    if (used.Count > 0 && wildsNeeded <= maxWildcards)
                    {
                        if (!validSets.Any(s => s.CardsUsed.SequenceEqual(used) && s.WildcardsNeeded == wildsNeeded))
                        {
                            validSets.Add(new SetDefinition { CardsUsed = used, WildcardsNeeded = wildsNeeded });
                        }
                    }
                }
            }
        }

        var groupedByRank = cards.GroupBy(c => GetRankValue(c.Substring(0, c.Length - 1)));
        foreach (var group in groupedByRank)
        {
            var uniqueSuitCards = group.GroupBy(c => c.Substring(c.Length - 1)).Select(g => g.First()).ToList();

            for (int len = 3; len <= 4; len++)
            {
                if (uniqueSuitCards.Count + maxWildcards >= len && uniqueSuitCards.Count > 0)
                {
                    int wNeeded = Math.Max(0, len - uniqueSuitCards.Count);
                    if (wNeeded <= maxWildcards)
                    {
                        var used = uniqueSuitCards.Take(len - wNeeded).ToList();
                        if (!validSets.Any(s => s.CardsUsed.SequenceEqual(used) && s.WildcardsNeeded == wNeeded))
                        {
                            validSets.Add(new SetDefinition { CardsUsed = used, WildcardsNeeded = wNeeded });
                        }
                    }
                }
            }
        }

        if (cards.Count > 0 && cards.Count + maxWildcards >= 3)
        {
            validSets.Add(new SetDefinition { CardsUsed = new List<string> { cards[0] }, WildcardsNeeded = 2 });
        }

        return validSets.OrderBy(s => s.WildcardsNeeded).ThenByDescending(s => s.CardsUsed.Count).ToList();
    }
}