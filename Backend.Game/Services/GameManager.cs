using System.Collections.Concurrent;
using Backend.Game.Models.RealTime;
using Microsoft.AspNetCore.SignalR;
using Backend.Game.Hubs;
using Microsoft.Extensions.DependencyInjection;
using Backend.Game.Data;
using Backend.Game.Messaging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Backend.Game.Services;

public class GameManager
{
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

    public IEnumerable<TableState> GetAllTables() => _tables.Values;

    public int GetSeatedPlayerCount(string tableId)
    {
        if (_tables.TryGetValue(tableId, out var table))
        {
            lock (table.Players)
            {
                return table.Players.Count(p => p.IsSeated);
            }
        }
        return 0;
    }

    public bool JoinWaitlist(string tableId, string userId, string userName)
    {
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            if (table.Waitlist == null) table.Waitlist = new List<WaitlistEntry>();
            if (!table.Waitlist.Any(w => w.UserId == userId))
            {
                table.Waitlist.Add(new WaitlistEntry { UserId = userId, Name = userName });
                return true;
            }
        }
        return false;
    }

    public bool LeaveWaitlist(string tableId, string userId)
    {
        var table = GetOrCreateTable(tableId);
        bool callNext = false;

        lock (table.Players)
        {
            if (table.Waitlist != null)
            {
                table.Waitlist.RemoveAll(w => w.UserId == userId);
            }

            if (table.ReservedForUserId == userId)
            {
                table.ReservedForUserId = null;
                callNext = true;
            }
        }

        // 👇 CORREÇÃO: Avisa a todos que a fila andou, independentemente de chamar o próximo ou não
        var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
        _ = hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", table);

        if (callNext)
        {
            _ = CheckAndProcessWaitlistAsync(tableId);
        }

        return true;
    }

    public async Task CheckAndProcessWaitlistAsync(string tableId)
    {
        var table = GetOrCreateTable(tableId);
        string? userToNotify = null;

        lock (table.Players)
        {
            if (table.Players.Count(p => p.IsSeated) >= table.MaxPlayers) return;
            if (!string.IsNullOrEmpty(table.ReservedForUserId)) return;
            if (table.Waitlist == null || !table.Waitlist.Any()) return;

            // 👇 CORREÇÃO CRÍTICA: Pegamos o nome, mas NÃO REMOVEMOS ELE DA FILA AINDA!
            // Ele fica visível como 1º da fila para todo mundo ver até que ele sente.
            userToNotify = table.Waitlist[0].UserId;
            table.ReservedForUserId = userToNotify;
        }

        if (userToNotify != null)
        {
            var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
            await hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", table);
            await hubContext.Clients.Group($"user_{userToNotify}").SendAsync("WaitlistYourTurn", tableId);

            _ = Task.Run(async () =>
            {
                await Task.Delay(15000);
                bool expired = false;
                lock (table.Players)
                {
                    if (table.ReservedForUserId == userToNotify)
                    {
                        table.ReservedForUserId = null;

                        // 👇 Se o tempo de 15s dele esgotou e ele não clicou em nada, AÍ SIM ele sai da fila.
                        if (table.Waitlist != null)
                        {
                            table.Waitlist.RemoveAll(w => w.UserId == userToNotify);
                        }

                        expired = true;
                    }
                }

                if (expired)
                {
                    await hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", table);
                    await hubContext.Clients.Group($"user_{userToNotify}").SendAsync("WaitlistExpired", tableId);

                    // Como a vaga dele expirou, chama o nº 2 da fila.
                    await CheckAndProcessWaitlistAsync(tableId);
                }
            });
        }
    }

    private void CheckTimeouts(object? state)
    {
        foreach (var table in _tables.Values)
        {
            bool isTimeout = false;
            int timeoutSeat = -1;
            bool roundEnded = false;

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
                        player.MissedTurns++;

                        if (player.MissedTurns >= 3)
                        {
                            player.Chips += player.PendingRebuy;
                            player.PendingRebuy = 0;

                            decimal chipsToReturn = player.Chips;
                            string uId = player.UserId;
                            int oldSeat = player.Seat;

                            player.Status = "out";
                            player.IsSeated = false;
                            player.Seat = -1;
                            player.LeaveNextHand = false;
                            player.TotalCashOut += player.Chips;
                            player.LastChips = player.Chips;
                            player.Chips = 0;
                            player.LastActiveAt = DateTime.UtcNow;
                            player.MissedTurns = 0;

                            table.Phase = "resolving";
                            PublishHandToRabbitMq(table, timeoutSeat, 0, 0, 0, false, 0);
                            roundEnded = AdvanceTurn(table);

                            if (oldSeat != -1)
                            {
                                var hubCtx = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                                _ = hubCtx.Clients.Group(table.TableId).SendAsync("PlayerStoodUp", oldSeat);
                                _ = hubCtx.Clients.Group(table.TableId).SendAsync("TableStateUpdated", table);
                                _ = CheckAndProcessWaitlistAsync(table.TableId);
                            }

                            if (chipsToReturn > 0 && !string.IsNullOrEmpty(uId))
                            {
                                string tId = table.TableId;
                                _ = Task.Run(async () =>
                                {
                                    var result = await _walletService.AddCashOutAsync(uId, chipsToReturn, tId);
                                    if (result.Success)
                                    {
                                        var hubCtx = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                                        await hubCtx.Clients.Group($"user_{uId}").SendAsync("WalletBalanceUpdated", result.NewBalance);
                                    }
                                });
                            }
                        }
                        else
                        {
                            player.Status = "out";
                            table.Phase = "resolving";

                            PublishHandToRabbitMq(table, timeoutSeat, 0, 0, 0, false, 0);
                            roundEnded = AdvanceTurn(table);
                        }
                    }
                }

                table.Players.RemoveAll(p => !p.IsSeated && string.IsNullOrEmpty(p.ConnectionId) && p.LastActiveAt < DateTime.UtcNow.AddHours(-6));
            }

            if (isTimeout)
            {
                _ = HandleServerTimeoutAsync(table.TableId, timeoutSeat, roundEnded);
            }
        }
    }

    private async Task HandleServerTimeoutAsync(string tableId, int seat, bool roundEnded)
    {
        var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
        await hubContext.Clients.Group(tableId).SendAsync("PlayerSkipped", seat);

        await ProcessNextRoundLoop(tableId, roundEnded, 2000);
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
            bool seatFreed = false;

            lock (resolvingState.Players)
            {
                foreach (var p in resolvingState.Players)
                {
                    p.Status = "waiting";
                    p.Cards.Clear();

                    if (p.PendingRebuy > 0)
                    {
                        p.Chips += p.PendingRebuy;
                        p.PendingRebuy = 0;
                    }

                    if (p.LeaveNextHand)
                    {
                        decimal refund = p.Chips;
                        string uId = p.UserId;
                        int oldSeat = p.Seat;

                        p.IsSeated = false;
                        p.Seat = -1;
                        p.LeaveNextHand = false;
                        p.TotalCashOut += p.Chips;
                        p.LastChips = p.Chips;
                        p.Chips = 0;
                        p.LastActiveAt = DateTime.UtcNow;
                        p.MissedTurns = 0;

                        if (oldSeat != -1)
                        {
                            _ = hubContext.Clients.Group(tableId).SendAsync("PlayerStoodUp", oldSeat);
                            seatFreed = true;
                        }

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
                }
                resolvingState.CenterCard = string.Empty;
                resolvingState.Phase = "waiting";
            }

            if (cashoutTasks.Any())
            {
                await Task.WhenAll(cashoutTasks);
            }

            if (seatFreed) _ = CheckAndProcessWaitlistAsync(tableId);

            if (CheckAndStartGame(tableId))
            {
                var dealingState = GetOrCreateTable(tableId);
                await hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", dealingState);
            }
            else
            {
                var finalWaitingState = GetOrCreateTable(tableId);
                await hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", finalWaitingState);
            }
        }
        else
        {
            var nextTurnState = GetOrCreateTable(tableId);
            lock (nextTurnState.Players)
            {
                nextTurnState.Phase = "betting";
                nextTurnState.TurnEndTime = DateTime.UtcNow.AddSeconds(20);
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
                Players = new List<PlayerState>(),
                Waitlist = new List<WaitlistEntry>()
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

    public async Task<(string? tableId, int seat)> RemovePlayerByConnectionIdAsync(string connectionId)
    {
        string? tableId = null;
        int logicalSeat = -1;
        decimal chipsToReturn = 0;
        string userId = string.Empty;
        bool cashoutNow = false;
        bool freedReservation = false;
        bool wasInWaitlist = false;

        TableState targetTable = null;

        foreach (var table in _tables.Values)
        {
            lock (table.Players)
            {
                var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
                if (player != null)
                {
                    tableId = table.TableId;
                    logicalSeat = player.Seat;
                    userId = player.UserId;
                    targetTable = table;

                    if (player.IsSeated)
                    {
                        bool safeToLeaveInstantly = (table.Phase == "waiting" || player.Status == "done" || player.Status == "out");

                        if (safeToLeaveInstantly)
                        {
                            player.Chips += player.PendingRebuy;
                            player.PendingRebuy = 0;

                            chipsToReturn = player.Chips;
                            cashoutNow = true;

                            player.TotalCashOut += player.Chips;
                            player.LastChips = player.Chips;
                            player.Chips = 0;
                            player.IsSeated = false;
                            player.Seat = -1;
                            player.Status = "waiting";
                            player.MissedTurns = 0;
                        }
                        else
                        {
                            player.LeaveNextHand = true;

                            if (player.Status == "playing")
                            {
                                player.Status = "out";

                                if (table.Phase == "betting" && table.CurrentTurnSeat == player.Seat)
                                {
                                    table.TurnEndTime = null;
                                    table.Phase = "resolving";

                                    PublishHandToRabbitMq(table, player.Seat, 0, 0, 0, false, 0);
                                    bool roundEnded = AdvanceTurn(table);
                                    _ = ProcessNextRoundLoop(table.TableId, roundEnded, 2000);
                                }
                            }
                        }
                    }

                    if (table.Waitlist != null && table.Waitlist.Any(w => w.UserId == player.UserId))
                    {
                        table.Waitlist.RemoveAll(w => w.UserId == player.UserId);
                        wasInWaitlist = true;
                    }

                    if (table.ReservedForUserId == player.UserId)
                    {
                        table.ReservedForUserId = null;
                        freedReservation = true;
                    }

                    player.ConnectionId = string.Empty;
                    player.LastActiveAt = DateTime.UtcNow;
                    break;
                }
            }
        }

        if (targetTable != null)
        {
            var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();

            if (cashoutNow && logicalSeat != -1)
            {
                _ = hubContext.Clients.Group(targetTable.TableId).SendAsync("PlayerStoodUp", logicalSeat);
                _ = hubContext.Clients.Group(targetTable.TableId).SendAsync("TableStateUpdated", targetTable);
                _ = CheckAndProcessWaitlistAsync(targetTable.TableId);
            }
            else if (freedReservation || wasInWaitlist)
            {
                _ = hubContext.Clients.Group(targetTable.TableId).SendAsync("TableStateUpdated", targetTable);
                if (freedReservation) _ = CheckAndProcessWaitlistAsync(targetTable.TableId);
            }
        }

        if (cashoutNow && chipsToReturn > 0 && !string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(tableId))
        {
            var result = await _walletService.AddCashOutAsync(userId, chipsToReturn, tableId);
            if (result.Success)
            {
                var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                await hubContext.Clients.Group($"user_{userId}").SendAsync("WalletBalanceUpdated", result.NewBalance);
            }
        }

        return (tableId, logicalSeat);
    }

    public async Task<bool> SitPlayer(string tableId, string connectionId, int seat, decimal buyIn)
    {
        try
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

                if (!string.IsNullOrEmpty(table.ReservedForUserId) && table.ReservedForUserId != player.UserId)
                {
                    return false;
                }
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
                        {
                            await hubContext.Clients.Group($"user_{player.UserId}").SendAsync("WalletBalanceUpdated", refundResult.NewBalance);
                        }
                    });
                    return false;
                }

                player.Seat = seat;
                player.Chips = buyIn;

                decimal returningAmount = Math.Min(buyIn, player.LastChips);
                decimal freshMoney = buyIn - returningAmount;

                player.TotalCashOut -= returningAmount;
                player.TotalBuyIn += freshMoney;

                player.LastChips = 0;
                player.IsSeated = true;
                player.Status = (table.Phase == "waiting") ? "waiting" : "out";
                player.LeaveNextHand = false;
                player.LastActiveAt = DateTime.UtcNow;
                player.MissedTurns = 0;

                if (table.ReservedForUserId == player.UserId)
                {
                    table.ReservedForUserId = null;
                }

                // 👇 AQUI o jogador é definitivamente removido da fila, pois sentou com sucesso!
                if (table.Waitlist != null)
                {
                    table.Waitlist.RemoveAll(w => w.UserId == player.UserId);
                }
            }

            _ = hubContext.Clients.Group(tableId).SendAsync("PlayerSatDown", seat);

            CheckAndStartGame(tableId);
            var state = GetOrCreateTable(tableId);
            await hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", state);

            _ = CheckAndProcessWaitlistAsync(tableId);

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CRÍTICO] Erro ao sentar jogador: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> Rebuy(string tableId, string connectionId, decimal amount)
    {
        try
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
                if (table.Phase == "waiting")
                {
                    player.Chips += amount;
                }
                else
                {
                    player.PendingRebuy += amount;
                }

                player.TotalBuyIn += amount;
                player.LastActiveAt = DateTime.UtcNow;
                if (table.Phase == "waiting") player.Status = "waiting";
            }

            CheckAndStartGame(tableId);
            var state = GetOrCreateTable(tableId);
            await hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", state);

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CRÍTICO] Erro no Rebuy: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> StandUp(string tableId, string connectionId)
    {
        var table = GetOrCreateTable(tableId);
        decimal chipsToReturn = 0;
        string userId = string.Empty;
        bool wasSeated = false;
        bool cashoutNow = false;
        int oldSeat = -1;

        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
            if (player != null && player.IsSeated)
            {
                wasSeated = true;
                userId = player.UserId;
                oldSeat = player.Seat;

                bool safeToLeaveInstantly = (table.Phase == "waiting" || player.Status == "done" || player.Status == "out");

                if (safeToLeaveInstantly)
                {
                    player.Chips += player.PendingRebuy;
                    player.PendingRebuy = 0;

                    chipsToReturn = player.Chips;
                    cashoutNow = true;

                    player.IsSeated = false;
                    player.Seat = -1;
                    player.Status = "waiting";
                    player.Cards.Clear();
                    player.LeaveNextHand = false;

                    player.TotalCashOut += player.Chips;
                    player.LastChips = player.Chips;
                    player.Chips = 0;
                    player.LastActiveAt = DateTime.UtcNow;
                    player.MissedTurns = 0;
                }
                else
                {
                    player.LeaveNextHand = true;

                    if (player.Status == "playing" && table.Phase == "betting" && table.CurrentTurnSeat == player.Seat)
                    {
                        player.Status = "out";
                        table.TurnEndTime = null;
                        table.Phase = "resolving";
                        PublishHandToRabbitMq(table, player.Seat, 0, 0, 0, false, 0);
                        bool roundEnded = AdvanceTurn(table);
                        _ = ProcessNextRoundLoop(table.TableId, roundEnded, 2000);
                    }
                }
            }
        }

        if (cashoutNow && oldSeat != -1)
        {
            var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
            _ = hubContext.Clients.Group(tableId).SendAsync("PlayerStoodUp", oldSeat);
            _ = hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", table);

            _ = CheckAndProcessWaitlistAsync(tableId);
        }

        if (cashoutNow && chipsToReturn > 0 && !string.IsNullOrEmpty(userId))
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
                p.IsSeated && p.Chips > 0 && (!chargeAnte || p.Chips >= table.MinBet)
            ).OrderBy(p => p.Seat).ToList();

            if (eligiblePlayers.Count >= 2 && table.Phase == "waiting")
            {
                table.Phase = "dealing";

                var ranks = new[] { "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K" };
                var suits = new[] { "♥", "♦", "♣", "♠" };
                var deck = new List<string>();
                foreach (var r in ranks) foreach (var s in suits) deck.Add(r + s);

                var rnd = new Random();
                deck = deck.OrderBy(x => rnd.Next()).ToList();

                foreach (var p in eligiblePlayers)
                {
                    if (chargeAnte)
                    {
                        p.Chips -= table.MinBet;
                        table.Pot += table.MinBet;
                    }

                    p.Cards = new List<string> { deck[0], deck[1] };
                    deck.RemoveRange(0, 2);
                    p.Status = "playing";
                    p.LastActiveAt = DateTime.UtcNow;
                }

                table.CenterCard = deck[0];
                _tableDecks[tableId] = deck;

                table.CurrentTurnSeat = eligiblePlayers[0].Seat;

                _ = TransitionToBettingAsync(tableId);

                return true;
            }
        }
        return false;
    }

    private async Task TransitionToBettingAsync(string tableId)
    {
        await Task.Delay(3000);
        var table = GetOrCreateTable(tableId);
        bool shouldBroadcast = false;

        lock (table.Players)
        {
            if (table.Phase == "dealing")
            {
                table.Phase = "betting";
                table.TurnEndTime = DateTime.UtcNow.AddSeconds(20);
                shouldBroadcast = true;
            }
        }

        if (shouldBroadcast)
        {
            var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
            await hubContext.Clients.Group(tableId).SendAsync("TableStateUpdated", table);
        }
    }

    public bool SkipTurn(string tableId, string connectionId, out int seat, out bool roundEnded)
    {
        seat = -1;
        roundEnded = false;
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);

            if (player == null || table.CurrentTurnSeat < 0 || player.Seat != table.CurrentTurnSeat || player.Status != "playing")
                return false;

            seat = player.Seat;
            player.Status = "out";
            table.TurnEndTime = null;
            table.Phase = "resolving";
            player.LastActiveAt = DateTime.UtcNow;

            player.MissedTurns = 0;

            PublishHandToRabbitMq(table, seat, 0, 0, 0, false, 0);

            roundEnded = AdvanceTurn(table);
            return true;
        }
    }

    public bool PlaceBet(string tableId, string connectionId, decimal amount, out int seat, out bool isWin, out bool potBroken, out bool roundEnded, out string[] playedCards, out string centerCardRevealed)
    {
        seat = -1;
        isWin = false;
        potBroken = false;
        roundEnded = false;
        playedCards = Array.Empty<string>();
        centerCardRevealed = string.Empty;

        var table = GetOrCreateTable(tableId);

        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p.ConnectionId == connectionId);

            if (player == null || table.CurrentTurnSeat < 0 || player.Seat != table.CurrentTurnSeat || player.Status != "playing")
                return false;

            if (player.Cards == null || player.Cards.Count < 2 || string.IsNullOrEmpty(table.CenterCard))
                return false;

            seat = player.Seat;
            table.TurnEndTime = null;
            table.Phase = "resolving";
            player.LastActiveAt = DateTime.UtcNow;

            player.MissedTurns = 0;

            playedCards = player.Cards.ToArray();
            centerCardRevealed = table.CenterCard;

            if (amount > player.Chips) amount = player.Chips;
            if (amount > table.Pot) amount = table.Pot;

            player.Chips -= amount;
            table.Pot += amount;

            int val1 = GetCardValue(player.Cards[0]);
            int val2 = GetCardValue(player.Cards[1]);
            int centerVal = GetCardValue(table.CenterCard);

            int minVal = Math.Min(val1, val2);
            int maxVal = Math.Max(val1, val2);

            if (centerVal > minVal && centerVal < maxVal)
            {
                isWin = true;
                decimal totalPull = amount * 2;
                decimal rakeCut = totalPull * (table.Rake / 100m);
                decimal netWin = totalPull - rakeCut;

                player.Chips += netWin;
                table.Pot -= totalPull;
            }

            decimal rabbitRake = 0;
            decimal rabbitWon = 0;
            decimal rabbitNet = -amount;

            if (isWin)
            {
                decimal totalPull = amount * 2;
                rabbitRake = totalPull * (table.Rake / 100m);
                rabbitWon = totalPull - rabbitRake;
                rabbitNet = rabbitWon - amount;
            }

            PublishHandToRabbitMq(table, seat, amount, rabbitWon, rabbitNet, isWin, rabbitRake);

            if (_tableDecks.TryGetValue(tableId, out var deck))
            {
                if (deck.Count > 0) deck.RemoveAt(0);
                if (deck.Count > 0) table.CenterCard = deck[0];
            }

            if (table.Pot <= 0)
            {
                table.Pot = 0;
                potBroken = true;
                foreach (var p in table.Players.Where(x => x.IsSeated))
                {
                    if (p.Chips >= table.MinBet)
                    {
                        p.Chips -= table.MinBet;
                        table.Pot += table.MinBet;
                    }
                }
            }

            player.Status = "done";
            roundEnded = AdvanceTurn(table);
            return true;
        }
    }

    private void PublishHandToRabbitMq(TableState table, int activeSeat, decimal betAmount, decimal wonAmount, decimal netProfit, bool isWinner, decimal totalRake)
    {
        var activePlayer = table.Players.FirstOrDefault(p => p.Seat == activeSeat);
        if (activePlayer == null) return;

        var handMessage = new HandCompletedMessage
        {
            GameTableId = Guid.Parse(table.TableId),
            CommunityCards = new List<string> { table.CenterCard },
            TotalPot = table.Pot,
            TotalRake = totalRake,
            Players = new List<PlayerHandResult>
            {
                new PlayerHandResult
                {
                    PlayerId = Guid.TryParse(activePlayer.UserId, out var uid) ? uid : Guid.Empty,
                    HoleCards = activePlayer.Cards.ToList(),
                    BetAmount = betAmount,
                    WonAmount = wonAmount,
                    NetProfit = netProfit,
                    IsWinner = isWinner
                }
            }
        };

        _ = _rabbitMqService.PublishHandAsync(handMessage);
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

    private int GetCardValue(string card)
    {
        if (string.IsNullOrEmpty(card)) return 0;
        var ranks = new List<string> { "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K" };
        string rank = card.Substring(0, card.Length - 1);
        return ranks.IndexOf(rank);
    }

    public List<string> GetDevTableDeck(string tableId)
    {
        if (_tableDecks.TryGetValue(tableId, out var deck))
        {
            return deck;
        }
        return new List<string>();
    }

    public bool SwapViraDevMode(string tableId, string newCenterCard, string? oldCenterCard, int deckIndex)
    {
        var table = GetOrCreateTable(tableId);

        lock (table.Players)
        {
            if (!_tableDecks.TryGetValue(tableId, out var deck))
                return false;

            table.CenterCard = newCenterCard;

            if (deckIndex >= 0 && deckIndex < deck.Count && deck[deckIndex] == newCenterCard)
            {
                deck.RemoveAt(deckIndex);
            }
            else
            {
                deck.Remove(newCenterCard);
            }

            if (!string.IsNullOrEmpty(oldCenterCard) && oldCenterCard != "Nenhuma")
            {
                deck.Add(oldCenterCard);
            }

            return true;
        }
    }
}