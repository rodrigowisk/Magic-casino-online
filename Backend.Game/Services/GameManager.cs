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
using Microsoft.Extensions.Logging;

namespace Backend.Game.Services;

public class GameManager
{
    private readonly ConcurrentDictionary<string, TableState> _tables = new();
    private readonly ConcurrentDictionary<string, List<string>> _tableDecks = new();

    private readonly ConcurrentDictionary<string, int> _tableLastActionSeat = new();

    private readonly IServiceProvider _serviceProvider;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly Timer _serverTickTimer;
    private readonly IRabbitMqService _rabbitMqService;
    private readonly IWalletService _walletService;
    private readonly ILogger<GameManager> _logger;
    private DateTime _lastCleanupTime = DateTime.UtcNow;

    public GameManager(
        IServiceProvider serviceProvider,
        IServiceScopeFactory scopeFactory,
        IRabbitMqService rabbitMqService,
        IWalletService walletService,
        ILogger<GameManager> logger)
    {
        _serviceProvider = serviceProvider;
        _scopeFactory = scopeFactory;
        _rabbitMqService = rabbitMqService;
        _walletService = walletService;
        _logger = logger;

        _serverTickTimer = new Timer(CheckTimeouts, null, 1000, 1000);
    }

    public IEnumerable<TableState> GetAllTables() => _tables.Values;

    public int GetSeatedPlayerCount(string tableId)
    {
        if (_tables.TryGetValue(tableId ?? "", out var table))
        {
            lock (table.Players)
            {
                return table.Players.Count(p => p != null && p.IsSeated);
            }
        }
        return 0;
    }

    public async Task BroadcastTableStateAsync(string tableId)
    {
        var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
        var table = GetOrCreateTable(tableId);
        
        var observerTable = CloneAndMaskTable(table, null);
        
        List<string> seatedConnections = new List<string>();
        
        lock (table.Players)
        {
            foreach (var p in table.Players.Where(x => x != null && x.IsSeated && !string.IsNullOrEmpty(x.ConnectionId)))
            {
                seatedConnections.Add(p.ConnectionId);
                var playerTable = CloneAndMaskTable(table, p.UserId);
                hubContext.Clients.Client(p.ConnectionId).SendAsync("TableStateUpdated", playerTable);
            }
        }
        
        await hubContext.Clients.GroupExcept(tableId, seatedConnections).SendAsync("TableStateUpdated", observerTable);
    }

    private TableState CloneAndMaskTable(TableState original, string? targetUserId)
    {
        var copy = new TableState
        {
            TableId = original.TableId,
            Name = original.Name,
            Phase = original.Phase,
            Pot = original.Pot,
            MinBet = original.MinBet,
            CurrentTurnSeat = original.CurrentTurnSeat,
            CenterCard = original.CenterCard,
            TurnEndTime = original.TurnEndTime,
            MaxPlayers = original.MaxPlayers,
            Rake = original.Rake,
            MinBuyIn = original.MinBuyIn,
            ExpiresAt = original.ExpiresAt,
            CoverImage = original.CoverImage,
            IsDemo = original.IsDemo,
            ReservedForUserId = original.ReservedForUserId,
            Waitlist = original.Waitlist?.ToList() ?? new List<WaitlistEntry>(),
            Players = new List<PlayerState>()
        };

        lock (original.Players)
        {
            foreach (var p in original.Players)
            {
                var pCopy = new PlayerState
                {
                    ConnectionId = p.ConnectionId,
                    UserId = p.UserId,
                    Name = p.Name,
                    Avatar = p.Avatar,
                    Seat = p.Seat,
                    Chips = p.Chips,
                    PendingRebuy = p.PendingRebuy,
                    TotalBuyIn = p.TotalBuyIn,
                    TotalCashOut = p.TotalCashOut,
                    LastChips = p.LastChips,
                    LastActiveAt = p.LastActiveAt,
                    MissedTurns = p.MissedTurns,
                    LeaveNextHand = p.LeaveNextHand,
                    IsSeated = p.IsSeated,
                    Status = p.Status,
                    Cards = new List<string>()
                };

                if (p.Cards != null && p.Cards.Any())
                {
                    if (p.UserId == targetUserId)
                    {
                        pCopy.Cards.AddRange(p.Cards);
                    }
                    else
                    {
                        pCopy.Cards.AddRange(p.Cards.Select(_ => "Hidden"));
                    }
                }

                copy.Players.Add(pCopy);
            }
        }
        return copy;
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

        _ = BroadcastTableStateAsync(tableId);

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
            if (table.Players.Count(p => p != null && p.IsSeated) >= table.MaxPlayers) return;
            if (!string.IsNullOrEmpty(table.ReservedForUserId)) return;
            if (table.Waitlist == null || !table.Waitlist.Any()) return;

            userToNotify = table.Waitlist[0].UserId;
            table.ReservedForUserId = userToNotify;
        }

        if (userToNotify != null)
        {
            var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
            await BroadcastTableStateAsync(tableId);
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

                        if (table.Waitlist != null)
                        {
                            table.Waitlist.RemoveAll(w => w.UserId == userToNotify);
                        }

                        expired = true;
                    }
                }

                if (expired)
                {
                    await BroadcastTableStateAsync(tableId);
                    await hubContext.Clients.Group($"user_{userToNotify}").SendAsync("WaitlistExpired", tableId);

                    await CheckAndProcessWaitlistAsync(tableId);
                }
            });
        }
    }

    private void CheckTimeouts(object? state)
    {
        var now = DateTime.UtcNow;
        bool shouldCleanup = (now - _lastCleanupTime).TotalSeconds > 60;

        foreach (var table in _tables.Values)
        {
            bool isTimeout = false;
            int timeoutSeat = -1;
            bool roundEnded = false;

            if (table.Phase == "betting" && table.TurnEndTime.HasValue && now >= table.TurnEndTime.Value)
            {
                lock (table.Players)
                {
                    if (table.Phase == "betting" && table.TurnEndTime.HasValue && now >= table.TurnEndTime.Value)
                    {
                        isTimeout = true;
                        timeoutSeat = table.CurrentTurnSeat;
                        table.TurnEndTime = null;

                        _tableLastActionSeat[table.TableId] = timeoutSeat;

                        var player = table.Players.FirstOrDefault(p => p != null && p.Seat == timeoutSeat);
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

                                PublishHandToRabbitMq(table, timeoutSeat, 0, 0, 0, false, 0);

                                player.Status = "out";
                                player.IsSeated = false;
                                player.Seat = -1;
                                player.LeaveNextHand = false;
                                player.TotalCashOut += player.Chips;
                                player.LastChips = player.Chips;
                                player.Chips = 0;
                                player.LastActiveAt = now;
                                player.MissedTurns = 0;

                                roundEnded = AdvanceTurn(table);
                                if (roundEnded)
                                {
                                    table.Phase = "resolving";
                                    table.CenterCard = "Hidden";
                                }
                                else
                                {
                                    table.CenterCard = "Hidden";
                                }

                                if (oldSeat != -1)
                                {
                                    var hubCtx = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                                    _ = hubCtx.Clients.Group(table.TableId).SendAsync("PlayerStoodUp", oldSeat);
                                    _ = BroadcastTableStateAsync(table.TableId);
                                    _ = CheckAndProcessWaitlistAsync(table.TableId);
                                }

                                if (chipsToReturn > 0 && !string.IsNullOrEmpty(uId))
                                {
                                    _ = SafeCashOutAsync(uId, chipsToReturn, table.TableId, table.IsDemo);
                                }
                            }
                            else
                            {
                                player.Status = "out";
                                PublishHandToRabbitMq(table, timeoutSeat, 0, 0, 0, false, 0);
                                roundEnded = AdvanceTurn(table);
                                
                                if (roundEnded)
                                {
                                    table.Phase = "resolving";
                                    table.CenterCard = "Hidden";
                                }
                                else
                                {
                                    table.CenterCard = "Hidden";
                                }
                            }
                        }
                    }
                }
            }

            if (isTimeout)
            {
                _ = HandleServerTimeoutAsync(table.TableId, timeoutSeat, roundEnded);
            }

            List<int> seatsFreed = new List<int>();
            lock (table.Players)
            {
                var zeroChipPlayers = table.Players.Where(p =>
                    p != null &&
                    p.IsSeated &&
                    p.Chips <= 0 &&
                    p.PendingRebuy <= 0 &&
                    p.Status != "playing" &&
                    (now - p.LastActiveAt).TotalSeconds >= 30
                ).ToList();

                foreach (var p in zeroChipPlayers)
                {
                    p.IsSeated = false;
                    int oldSeat = p.Seat;
                    p.Seat = -1;
                    p.Status = "waiting";
                    p.LeaveNextHand = false;

                    if (p.Cards != null) p.Cards.Clear();

                    p.LastActiveAt = now;
                    p.MissedTurns = 0;

                    seatsFreed.Add(oldSeat);
                }
            }

            if (seatsFreed.Any())
            {
                var hubCtx = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                foreach (var s in seatsFreed)
                {
                    _ = hubCtx.Clients.Group(table.TableId).SendAsync("PlayerStoodUp", s);
                }
                _ = BroadcastTableStateAsync(table.TableId);
                _ = CheckAndProcessWaitlistAsync(table.TableId);
            }

            if (shouldCleanup)
            {
                lock (table.Players)
                {
                    table.Players.RemoveAll(p => p != null && !p.IsSeated && string.IsNullOrEmpty(p.ConnectionId) && p.LastActiveAt < now.AddHours(-6));
                }
            }
        }

        if (shouldCleanup)
        {
            _lastCleanupTime = now;
        }
    }

    private async Task HandleServerTimeoutAsync(string tableId, int seat, bool roundEnded)
    {
        var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
        await hubContext.Clients.Group(tableId).SendAsync("PlayerSkipped", seat);

        if (roundEnded)
        {
            await ProcessNextRoundLoop(tableId, true, 7000);
        }
        else
        {
            var table = GetOrCreateTable(tableId);
            lock (table.Players)
            {
                table.TurnEndTime = DateTime.UtcNow.AddSeconds(20);
            }
            await BroadcastTableStateAsync(tableId);
        }
    }

    public async Task ProcessNextRoundLoop(string tableId, bool roundEnded, int delayMs)
    {
        var resolvingState = GetOrCreateTable(tableId);
        int nextTurn = -1;

        lock (resolvingState.Players)
        {
            if (roundEnded)
            {
                resolvingState.Phase = "resolving";
            }
            else
            {
                nextTurn = resolvingState.CurrentTurnSeat;
                resolvingState.CurrentTurnSeat = -1; 
            }
            resolvingState.TurnEndTime = DateTime.UtcNow.AddMilliseconds(delayMs);
        }
        
        await BroadcastTableStateAsync(tableId);

        await Task.Delay(delayMs);

        if (roundEnded)
        {
            List<Task> cashoutTasks = new List<Task>();
            bool seatFreed = false;

            lock (resolvingState.Players)
            {
                foreach (var p in resolvingState.Players.Where(x => x != null))
                {
                    p.Status = "waiting";
                    if (p.Cards != null) p.Cards.Clear();

                    if (p.PendingRebuy > 0)
                    {
                        p.Chips += p.PendingRebuy;
                        p.PendingRebuy = 0;
                    }

                    if (p.Chips <= 0 && p.IsSeated)
                    {
                        p.LastActiveAt = DateTime.UtcNow;
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
                            var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                            _ = hubContext.Clients.Group(tableId).SendAsync("PlayerStoodUp", oldSeat);
                            seatFreed = true;
                        }

                        if (refund > 0 && !string.IsNullOrEmpty(uId))
                        {
                            cashoutTasks.Add(SafeCashOutAsync(uId, refund, tableId, resolvingState.IsDemo));
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

            CheckAndStartGame(tableId);
            await BroadcastTableStateAsync(tableId);
        }
        else
        {
            lock (resolvingState.Players)
            {
                resolvingState.CurrentTurnSeat = nextTurn;
                resolvingState.Phase = "betting";
                resolvingState.CenterCard = "Hidden";
                resolvingState.TurnEndTime = DateTime.UtcNow.AddSeconds(20);
            }
            await BroadcastTableStateAsync(tableId);
        }
    }

    public TableState GetOrCreateTable(string tableId)
    {
        string safeTableId = tableId ?? string.Empty;
        if (!_tables.ContainsKey(safeTableId))
        {
            int maxPlayers = 6;
            decimal rake = 0;
            decimal minBuyIn = 100;
            decimal ante = 10;
            string tableName = string.Empty;
            DateTime expiresAt = DateTime.UtcNow.AddHours(12);
            bool isDemo = false;

            try
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var dbTable = dbContext.GameTables.FirstOrDefault(t => t.Id.ToString() == safeTableId);
                    if (dbTable != null)
                    {
                        maxPlayers = dbTable.MaxPlayers;
                        rake = dbTable.Rake;
                        minBuyIn = dbTable.MinBuyIn;
                        ante = dbTable.Ante;
                        tableName = dbTable.Name;
                        expiresAt = dbTable.CreatedAt.AddHours(dbTable.DurationHours);
                        isDemo = dbTable.IsDemo;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao buscar a mesa {safeTableId} no banco. Usando valores padrões.");
            }

            _tables.TryAdd(safeTableId, new TableState
            {
                TableId = safeTableId,
                Name = tableName,
                MaxPlayers = maxPlayers,
                Rake = rake,
                MinBuyIn = minBuyIn,
                MinBet = ante,
                ExpiresAt = expiresAt,
                Players = new List<PlayerState>(),
                Waitlist = new List<WaitlistEntry>(),
                IsDemo = isDemo
            });
        }
        return _tables[safeTableId];
    }

    public void AddPlayerToTable(string tableId, PlayerState player)
    {
        if (player == null) return;
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            var existingPlayer = table.Players.FirstOrDefault(p => p != null && p.UserId == player.UserId);

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
            var player = table.Players.FirstOrDefault(p => p != null && p.ConnectionId == connectionId);
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
        bool freedReservation = false;
        bool wasInWaitlist = false;

        TableState targetTable = null;

        foreach (var table in _tables.Values)
        {
            lock (table.Players)
            {
                var player = table.Players.FirstOrDefault(p => p != null && p.ConnectionId == connectionId);
                if (player != null)
                {
                    tableId = table.TableId;
                    targetTable = table;

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
            await BroadcastTableStateAsync(targetTable.TableId);

            if (freedReservation || wasInWaitlist)
            {
                _ = CheckAndProcessWaitlistAsync(targetTable.TableId);
            }
        }

        return (tableId, logicalSeat);
    }

    public async Task<bool> SitPlayer(string tableId, string connectionId, int seat, decimal buyIn, string localUserId = "")
    {
        try
        {
            var table = GetOrCreateTable(tableId);
            PlayerState? player = null;

            lock (table.Players)
            {
                if (seat >= table.MaxPlayers) return false;
                if (table.Players.Count(p => p != null && p.IsSeated) >= table.MaxPlayers) return false;
                if (table.Players.Any(p => p != null && p.Seat == seat && p.IsSeated)) return false;

                player = table.Players.FirstOrDefault(p => p != null && p.ConnectionId == connectionId);

                if (player == null && !string.IsNullOrEmpty(localUserId))
                {
                    player = table.Players.FirstOrDefault(p => p != null && p.UserId == localUserId);
                    if (player != null) player.ConnectionId = connectionId ?? "";
                }

                if (player == null || player.IsSeated) return false;
                if (player.Status == "sitting") return false;

                if (!string.IsNullOrEmpty(table.ReservedForUserId) && table.ReservedForUserId != player.UserId)
                    return false;

                player.Status = "sitting";
            }

            var result = await _walletService.DeductBuyInAsync(player.UserId, buyIn, tableId, table.IsDemo);

            if (!result.Success)
            {
                lock (table.Players) { player.Status = "waiting"; }
                return false;
            }

            var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
            await hubContext.Clients.Group($"user_{player.UserId}").SendAsync("WalletBalanceUpdated", result.NewBalance);

            lock (table.Players)
            {
                if (table.Players.Any(p => p != null && p.Seat == seat && p.IsSeated))
                {
                    player.Status = "waiting";
                    _ = SafeCashOutAsync(player.UserId, buyIn, tableId, table.IsDemo);
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
                    table.ReservedForUserId = null;

                if (table.Waitlist != null)
                    table.Waitlist.RemoveAll(w => w.UserId == player.UserId);
            }

            _ = hubContext.Clients.Group(tableId).SendAsync("PlayerSatDown", seat);

            CheckAndStartGame(tableId);
            await BroadcastTableStateAsync(tableId);

            _ = CheckAndProcessWaitlistAsync(tableId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[CRÍTICO] Erro ao sentar jogador na mesa {tableId}");
            return false;
        }
    }

    public async Task<bool> Rebuy(string tableId, string connectionId, decimal amount, string localUserId = "")
    {
        try
        {
            var table = GetOrCreateTable(tableId);
            PlayerState? player = null;

            lock (table.Players)
            {
                player = table.Players.FirstOrDefault(p => p != null && p.ConnectionId == connectionId);
                if (player == null && !string.IsNullOrEmpty(localUserId))
                {
                    player = table.Players.FirstOrDefault(p => p != null && p.UserId == localUserId);
                    if (player != null) player.ConnectionId = connectionId ?? "";
                }

                if (player == null || !player.IsSeated) return false;
            }

            var result = await _walletService.DeductBuyInAsync(player.UserId, amount, tableId, table.IsDemo);
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
            await BroadcastTableStateAsync(tableId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[CRÍTICO] Erro no Rebuy na mesa {tableId}");
            return false;
        }
    }

    public async Task<bool> StandUp(string tableId, string connectionId, string localUserId = "")
    {
        var table = GetOrCreateTable(tableId);
        decimal chipsToReturn = 0;
        string actualUserId = string.Empty;
        bool wasSeated = false;
        bool cashoutNow = false;
        int oldSeat = -1;

        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p != null && p.ConnectionId == connectionId);
            if (player == null && !string.IsNullOrEmpty(localUserId))
            {
                player = table.Players.FirstOrDefault(p => p != null && p.UserId == localUserId);
                if (player != null) player.ConnectionId = connectionId ?? "";
            }

            if (player != null && player.IsSeated)
            {
                wasSeated = true;
                actualUserId = player.UserId;
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
                    if (player.Cards != null) player.Cards.Clear();
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
                        PublishHandToRabbitMq(table, player.Seat, 0, 0, 0, false, 0);
                        bool roundEnded = AdvanceTurn(table);
                        
                        if (roundEnded)
                        {
                            table.TurnEndTime = null;
                            table.Phase = "resolving";
                        }
                        else
                        {
                            // 🔥 CORREÇÃO: Esconde o Vira e recomeça o relógio para o próximo!
                            table.CenterCard = "Hidden";
                            table.TurnEndTime = DateTime.UtcNow.AddSeconds(20);
                        }
                        
                        var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                        _ = hubContext.Clients.Group(tableId).SendAsync("PlayerSkipped", player.Seat);

                        _ = ProcessNextRoundLoop(table.TableId, roundEnded, 7000); 
                    }
                }
            }
        }

        if (cashoutNow && oldSeat != -1)
        {
            var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
            _ = hubContext.Clients.Group(tableId).SendAsync("PlayerStoodUp", oldSeat);
            _ = BroadcastTableStateAsync(tableId);

            _ = CheckAndProcessWaitlistAsync(tableId);
        }

        if (cashoutNow && chipsToReturn > 0 && !string.IsNullOrEmpty(actualUserId))
        {
            var result = await _walletService.AddCashOutAsync(actualUserId, chipsToReturn, tableId, table.IsDemo);
            if (result.Success)
            {
                var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                await hubContext.Clients.Group($"user_{actualUserId}").SendAsync("WalletBalanceUpdated", result.NewBalance);
                return true;
            }
            return false;
        }

        return wasSeated;
    }

    public void SetLeaveNextHand(string tableId, string connectionId, bool willLeave, string localUserId = "")
    {
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p != null && p.ConnectionId == connectionId);
            if (player == null && !string.IsNullOrEmpty(localUserId))
            {
                player = table.Players.FirstOrDefault(p => p != null && p.UserId == localUserId);
            }

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
                p != null && p.IsSeated && p.Chips > 0 && (!chargeAnte || p.Chips >= table.MinBet)
            ).OrderBy(p => p.Seat).ToList();

            if (eligiblePlayers.Count >= 2 && table.Phase == "waiting")
            {
                table.Phase = "dealing";
                table.TurnEndTime = DateTime.UtcNow.AddSeconds(3);

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

                table.CenterCard = "Hidden";
                _tableDecks[tableId] = deck;

                int lastActionSeat = _tableLastActionSeat.GetOrAdd(tableId, -1);

                var nextStarter = eligiblePlayers.FirstOrDefault(p => p.Seat > lastActionSeat);
                if (nextStarter == null)
                {
                    nextStarter = eligiblePlayers[0];
                }

                table.CurrentTurnSeat = nextStarter.Seat;

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
            await BroadcastTableStateAsync(tableId);
        }
    }

    public bool SkipTurn(string tableId, string connectionId, out int seat, out bool roundEnded, string localUserId = "")
    {
        seat = -1;
        roundEnded = false;
        var table = GetOrCreateTable(tableId);
        lock (table.Players)
        {
            var player = table.Players.FirstOrDefault(p => p != null && p.ConnectionId == connectionId);
            if (player == null && !string.IsNullOrEmpty(localUserId))
            {
                player = table.Players.FirstOrDefault(p => p != null && p.UserId == localUserId);
                if (player != null) player.ConnectionId = connectionId ?? "";
            }

            if (player == null || table.CurrentTurnSeat < 0 || player.Seat != table.CurrentTurnSeat || player.Status != "playing")
                return false;

            seat = player.Seat;

            _tableLastActionSeat[tableId] = seat;

            player.Status = "out";
            table.TurnEndTime = null;
            player.LastActiveAt = DateTime.UtcNow;
            player.MissedTurns = 0;

            PublishHandToRabbitMq(table, seat, 0, 0, 0, false, 0);

            roundEnded = AdvanceTurn(table);
            
            if (roundEnded)
            {
                table.Phase = "resolving";
            }
            else
            {
                // 🔥 CORREÇÃO: Esconde o Vira e recomeça o relógio para o próximo!
                table.CenterCard = "Hidden";
                table.TurnEndTime = DateTime.UtcNow.AddSeconds(20);
            }

            var hubContext = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
            _ = hubContext.Clients.Group(tableId).SendAsync("PlayerSkipped", seat);

            return true;
        }
    }

    public bool PlaceBet(string tableId, string connectionId, decimal amount, out int seat, out bool isWin, out bool potBroken, out bool roundEnded, out string[] playedCards, out string centerCardRevealed, string localUserId = "")
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
            var player = table.Players.FirstOrDefault(p => p != null && p.ConnectionId == connectionId);
            if (player == null && !string.IsNullOrEmpty(localUserId))
            {
                player = table.Players.FirstOrDefault(p => p != null && p.UserId == localUserId);
                if (player != null) player.ConnectionId = connectionId ?? "";
            }

            if (player == null || table.CurrentTurnSeat < 0 || player.Seat != table.CurrentTurnSeat || player.Status != "playing")
                return false;

            playedCards = player.Cards?.ToArray() ?? Array.Empty<string>();

            if (playedCards.Length < 2)
                return false;

            seat = player.Seat;

            _tableLastActionSeat[tableId] = seat;

            table.TurnEndTime = null;
            player.LastActiveAt = DateTime.UtcNow;
            player.MissedTurns = 0;

            if (table.CenterCard == "Hidden")
            {
                if (_tableDecks.TryGetValue(tableId, out var deck) && deck != null && deck.Count > 0)
                {
                    table.CenterCard = deck[0];
                    deck.RemoveAt(0);
                }
                else
                {
                    table.CenterCard = "A♠";
                }
            }

            centerCardRevealed = table.CenterCard ?? "A♠";

            if (amount > player.Chips) amount = player.Chips;
            if (amount > table.Pot) amount = table.Pot;

            player.Chips -= amount;
            table.Pot += amount;

            int val1 = GetCardValue(playedCards.ElementAtOrDefault(0));
            int val2 = GetCardValue(playedCards.ElementAtOrDefault(1));
            int centerVal = GetCardValue(centerCardRevealed);

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

            if (table.Pot <= 0)
            {
                table.Pot = 0;
                potBroken = true;
                foreach (var p in table.Players.Where(x => x != null && x.IsSeated).ToList())
                {
                    if (p.Chips > 0)
                    {
                        decimal deduction = Math.Min(p.Chips, table.MinBet);
                        p.Chips -= deduction;
                        table.Pot += deduction;
                    }
                }
            }

            player.Status = "done";
            roundEnded = AdvanceTurn(table);
            
            if (roundEnded)
            {
                table.Phase = "resolving";
            }
            else
            {
                // 🔥 CORREÇÃO: Esconde o Vira e recomeça o relógio para o próximo!
                table.CenterCard = "Hidden";
                table.TurnEndTime = DateTime.UtcNow.AddSeconds(20);
            }
            
            return true;
        }
    }

    private void PublishHandToRabbitMq(TableState table, int activeSeat, decimal betAmount, decimal wonAmount, decimal netProfit, bool isWinner, decimal totalRake)
    {
        var activePlayer = table.Players.FirstOrDefault(p => p != null && p.Seat == activeSeat);
        if (activePlayer == null) return;

        var holeCardsSafe = activePlayer.Cards?.ToList() ?? new List<string>();
        var centerCardSafe = table.CenterCard ?? "Unknown";

        var handMessage = new HandCompletedMessage
        {
            GameTableId = Guid.TryParse(table.TableId, out var tid) ? tid : Guid.Empty,
            CommunityCards = new List<string> { centerCardSafe },
            TotalPot = table.Pot,
            TotalRake = totalRake,
            Players = new List<PlayerHandResult>
            {
                new PlayerHandResult
                {
                    PlayerId = Guid.TryParse(activePlayer.UserId, out var uid) ? uid : Guid.Empty,
                    PlayerName = activePlayer.Name ?? "Livre",
                    HoleCards = holeCardsSafe,
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
            var playerInSeat = table.Players.FirstOrDefault(p => p != null && p.Seat == nextSeat && p.IsSeated);

            if (playerInSeat != null && playerInSeat.Status == "playing")
            {
                table.CurrentTurnSeat = nextSeat;
                return false;
            }
        }

        table.CurrentTurnSeat = -1;
        return true;
    }

    private int GetCardValue(string? card)
    {
        if (string.IsNullOrEmpty(card) || card.Length < 2) return 0;
        var ranks = new List<string> { "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K" };
        string rank = card.Substring(0, card.Length - 1);
        return Math.Max(0, ranks.IndexOf(rank));
    }

    public List<string> GetDevTableDeck(string tableId)
    {
        if (_tableDecks.TryGetValue(tableId ?? "", out var deck) && deck != null)
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
            if (!_tableDecks.TryGetValue(tableId ?? "", out var deck) || deck == null)
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

    private async Task SafeCashOutAsync(string userId, decimal amount, string tableId, bool isDemo)
    {
        try
        {
            var result = await _walletService.AddCashOutAsync(userId, amount, tableId, isDemo);
            if (result.Success)
            {
                var hubCtx = _serviceProvider.GetRequiredService<IHubContext<GameHub>>();
                await hubCtx.Clients.Group($"user_{userId}").SendAsync("WalletBalanceUpdated", result.NewBalance);
            }
            else
            {
                _logger.LogCritical($"FALHA CRÍTICA AO DEVOLVER FICHAS! User: {userId}, Amount: {amount}, Table: {tableId}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, $"FALHA CRÍTICA DE CONEXÃO AO DEVOLVER FICHAS! User: {userId}, Amount: {amount}, Table: {tableId}");
        }
    }
}