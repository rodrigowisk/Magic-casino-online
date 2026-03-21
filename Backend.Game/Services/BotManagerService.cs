using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Backend.Game.Hubs;
using Backend.Game.Models.RealTime;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Backend.Game.Services;

public class BotSession
{
    public string UserId { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public string TableId { get; set; } = string.Empty;
    public DateTime LeaveAt { get; set; }
    public bool IsPlayingTurn { get; set; } = false;
}

public class BotManagerService : BackgroundService
{
    // 👇 CHAVE GERAL PARA LIGAR/DESLIGAR OS BOTS 👇
    // true = ligado | false = desligado
    private readonly bool _botsEnabled = true;

    private readonly IServiceProvider _serviceProvider;
    private readonly ConcurrentDictionary<string, BotSession> _activeBots = new();
    private readonly Random _rnd = new();

    private readonly Dictionary<string, string> _botRealAccounts = new Dictionary<string, string>
    {
        { "c06a602e-42e5-4ee7-9910-6ae45ba54357", "RUBENS" },
        { "b73dc8cb-a735-4eee-937a-732ea0197e23", "HELIO" },
        { "a350d702-a004-4dc1-85bb-2f9163ca30f7", "JUCA" },
        { "cf62683d-dab0-4c1f-979d-280468c60559", "JOSE321" }
    };

    public BotManagerService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Se os bots estiverem desligados, o loop apenas pausa e não faz nada
            if (!_botsEnabled)
            {
                await Task.Delay(2000, stoppingToken);
                continue;
            }

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var gameManager = scope.ServiceProvider.GetRequiredService<GameManager>();
                var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<GameHub>>();

                ManageBotSeating(gameManager, hubContext);
                await ManageBotTurns(gameManager, hubContext);

                // O Bot agora verifica se precisa de Rebuy a cada ciclo
                await ManageBotRebuys(gameManager, hubContext);

                CheckBotTimeouts(gameManager);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro no BotManager: {ex.Message}");
            }

            await Task.Delay(2000, stoppingToken);
        }
    }

    // INTELIGÊNCIA DE REBUY
    private async Task ManageBotRebuys(GameManager gameManager, IHubContext<GameHub> hubContext)
    {
        var allTables = gameManager.GetAllTables();

        foreach (var table in allTables)
        {
            foreach (var botSession in _activeBots.Values.ToList())
            {
                if (botSession.TableId != table.TableId) continue;

                var botPlayer = table.Players.FirstOrDefault(p => p.ConnectionId == botSession.ConnectionId && p.IsSeated);

                // Se o bot estiver sentado e com fichas abaixo da aposta mínima (Ante), ele tenta o Rebuy
                if (botPlayer != null && botPlayer.Chips < table.MinBet)
                {
                    // Evita tentar rebuy infinitamente se ele já pediu pra sair
                    if (botPlayer.LeaveNextHand) continue;

                    // O bot decide comprar de 1 a 3 vezes o MinBuyIn
                    decimal rebuyAmount = table.MinBuyIn * _rnd.Next(1, 4);

                    bool rebuySuccess = await gameManager.Rebuy(table.TableId, botPlayer.ConnectionId, rebuyAmount);

                    if (rebuySuccess)
                    {
                        // Rebuy funcionou! Atualiza a mesa para todos verem as fichas novas
                        await hubContext.Clients.Group(table.TableId).SendAsync("TableStateUpdated", gameManager.GetOrCreateTable(table.TableId));
                    }
                    else
                    {
                        // Se falhou (o bot real não tem saldo no banco de dados), ele desiste e levanta
                        gameManager.SetLeaveNextHand(table.TableId, botPlayer.ConnectionId, true);
                    }
                }
            }
        }
    }

    private void ManageBotSeating(GameManager gameManager, IHubContext<GameHub> hubContext)
    {
        var allTables = gameManager.GetAllTables();

        foreach (var table in allTables)
        {
            bool hasHuman = table.Players.Any(p => p.IsSeated && !_botRealAccounts.ContainsKey(p.UserId));
            int seatedCount = table.Players.Count(p => p.IsSeated);

            if (hasHuman && seatedCount < table.MaxPlayers)
            {
                if (_rnd.Next(100) < 30)
                {
                    InjectBot(table, gameManager, hubContext);
                }
            }
        }
    }

    private void InjectBot(TableState table, GameManager gameManager, IHubContext<GameHub> hubContext)
    {
        var occupiedSeats = table.Players.Where(p => p.IsSeated).Select(p => p.Seat).ToList();
        int freeSeat = Enumerable.Range(0, table.MaxPlayers).FirstOrDefault(s => !occupiedSeats.Contains(s), -1);

        if (freeSeat == -1) return;

        var busyBotIds = _activeBots.Values.Select(b => b.UserId).ToList();
        var availableBotIds = _botRealAccounts.Keys.Where(id => !busyBotIds.Contains(id)).ToList();

        if (!availableBotIds.Any()) return;

        string selectedBotUserId = availableBotIds[_rnd.Next(availableBotIds.Count)];
        string selectedBotName = _botRealAccounts[selectedBotUserId];
        string botConnId = $"conn_bot_{Guid.NewGuid().ToString("N").Substring(0, 8)}";

        int multiplier = _rnd.Next(1, 6);
        decimal buyInAmount = table.MinBuyIn * multiplier;

        var botPlayer = new PlayerState
        {
            ConnectionId = botConnId,
            UserId = selectedBotUserId,
            Name = selectedBotName,
            Avatar = "default.webp"
        };

        gameManager.AddPlayerToTable(table.TableId, botPlayer);

        _ = Task.Run(async () =>
        {
            bool seated = await gameManager.SitPlayer(table.TableId, botConnId, freeSeat, buyInAmount);
            if (seated)
            {
                _activeBots.TryAdd(botConnId, new BotSession
                {
                    UserId = selectedBotUserId,
                    ConnectionId = botConnId,
                    TableId = table.TableId,
                    LeaveAt = DateTime.UtcNow.AddMinutes(_rnd.Next(60, 121))
                });

                var newState = gameManager.GetOrCreateTable(table.TableId);
                await hubContext.Clients.Group(table.TableId).SendAsync("TableStateUpdated", newState);
            }
        });
    }

    private async Task ManageBotTurns(GameManager gameManager, IHubContext<GameHub> hubContext)
    {
        var allTables = gameManager.GetAllTables();

        foreach (var table in allTables)
        {
            if (table.Phase == "betting" && table.CurrentTurnSeat != -1)
            {
                var activePlayer = table.Players.FirstOrDefault(p => p.Seat == table.CurrentTurnSeat && p.IsSeated);

                if (activePlayer != null && _botRealAccounts.ContainsKey(activePlayer.UserId))
                {
                    if (_activeBots.TryGetValue(activePlayer.ConnectionId, out var botSession) && !botSession.IsPlayingTurn)
                    {
                        botSession.IsPlayingTurn = true;

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                await Task.Delay(_rnd.Next(1500, 3500));
                                await ExecuteBotPlayAsync(table, activePlayer, gameManager, hubContext);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Erro na jogada do bot: {ex.Message}");
                            }
                            finally
                            {
                                botSession.IsPlayingTurn = false;
                            }
                        });
                    }
                }
            }
        }
    }

    private async Task ExecuteBotPlayAsync(TableState table, PlayerState botPlayer, GameManager gameManager, IHubContext<GameHub> hubContext)
    {
        if (table.Phase != "betting" || table.CurrentTurnSeat != botPlayer.Seat) return;

        async Task ForceSkipAndExit()
        {
            if (gameManager.SkipTurn(table.TableId, botPlayer.ConnectionId, out int skipSeat, out bool skipRoundEnded))
            {
                await hubContext.Clients.Group(table.TableId).SendAsync("TableStateUpdated", gameManager.GetOrCreateTable(table.TableId));
                await hubContext.Clients.Group(table.TableId).SendAsync("PlayerSkipped", skipSeat);
                _ = gameManager.ProcessNextRoundLoop(table.TableId, skipRoundEnded, 2000);
            }
        }

        if (botPlayer.Cards.Count < 2)
        {
            await ForceSkipAndExit();
            return;
        }

        if (botPlayer.Chips <= 0)
        {
            await ForceSkipAndExit();
            // REMOVI O "LeaveNextHand" DAQUI! Agora ele só pula a vez e o "ManageBotRebuys" decide se ele levanta ou faz rebuy.
            return;
        }

        int val1 = GetCardValue(botPlayer.Cards[0]);
        int val2 = GetCardValue(botPlayer.Cards[1]);
        int spread = Math.Max(val1, val2) - Math.Min(val1, val2) - 1;

        if (spread <= 0)
        {
            await ForceSkipAndExit();
            return;
        }

        double prob = spread / 13.0;
        decimal betAmount;

        if (prob < 0.40) betAmount = Math.Max(table.MinBet, table.Pot / 3);
        else if (prob <= 0.60) betAmount = Math.Max(table.MinBet, table.Pot / 2);
        else betAmount = table.Pot;

        betAmount = Math.Floor(betAmount);

        if (betAmount > botPlayer.Chips) betAmount = botPlayer.Chips;
        if (betAmount > table.Pot) betAmount = table.Pot;
        if (betAmount < table.MinBet && botPlayer.Chips >= table.MinBet) betAmount = table.MinBet;

        if (betAmount <= 0)
        {
            await ForceSkipAndExit();
            return;
        }

        if (gameManager.PlaceBet(table.TableId, botPlayer.ConnectionId, betAmount, out int betSeat, out bool isWin, out bool potBroken, out bool roundEnded, out string[] playedCards, out string centerCardRevealed))
        {
            await hubContext.Clients.Group(table.TableId).SendAsync("TableStateUpdated", gameManager.GetOrCreateTable(table.TableId));
            await hubContext.Clients.Group(table.TableId).SendAsync("PlayerBetted", betSeat, betAmount, isWin, potBroken, playedCards, centerCardRevealed);

            int delay = 8000;
            if (isWin) delay = 8500;
            if (potBroken) delay += 2500;

            _ = gameManager.ProcessNextRoundLoop(table.TableId, roundEnded, delay);
        }
        else
        {
            await ForceSkipAndExit();
        }
    }

    private void CheckBotTimeouts(GameManager gameManager)
    {
        var now = DateTime.UtcNow;
        foreach (var bot in _activeBots.Values.ToList())
        {
            if (now > bot.LeaveAt)
            {
                gameManager.SetLeaveNextHand(bot.TableId, bot.ConnectionId, true);
                _activeBots.TryRemove(bot.ConnectionId, out _);
            }
        }
    }

    private int GetCardValue(string card)
    {
        if (string.IsNullOrEmpty(card)) return 0;
        var ranks = new[] { "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K" };
        string rank = card.Substring(0, card.Length - 1);
        return Array.IndexOf(ranks, rank);
    }
}