using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Backend.Game.Services;
using Backend.Game.Models.RealTime;
using System.Threading.Tasks;
using System;
using System.Linq;
using System.Text.Json; // 👇 Adicionado para o C# conseguir ler o formato do Javascript

namespace Backend.Game.Hubs;

[Authorize]
public class GameHub : Hub
{
    private readonly GameManager _gameManager;

    public GameHub(GameManager gameManager)
    {
        _gameManager = gameManager;
    }

    public async Task RegisterUser(string userId)
    {
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
    }

    public async Task JoinTable(string tableId, string localUserId, string localUserName, string avatar = "default.webp")
    {
        try
        {
            var userId = string.IsNullOrWhiteSpace(localUserId) ? Context.ConnectionId : localUserId;
            var userName = string.IsNullOrWhiteSpace(localUserName) ? "Jogador" : localUserName;

            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
            await Groups.AddToGroupAsync(Context.ConnectionId, tableId);

            var player = new PlayerState
            {
                ConnectionId = Context.ConnectionId,
                UserId = userId,
                Name = userName,
                Avatar = avatar
            };

            _gameManager.AddPlayerToTable(tableId, player);
            var tableState = _gameManager.GetOrCreateTable(tableId);

            await Clients.GroupExcept(tableId, Context.ConnectionId).SendAsync("PlayerJoined", player);
            await Clients.Caller.SendAsync("ReceiveTableState", tableState);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CRÍTICO] Erro no JoinTable: {ex.Message}");
        }
    }

    // 👇 CORREÇÃO AQUI: Adicionado a recepção do nome (localUserName) para o GameManager
    public async Task JoinWaitlist(string tableId, string localUserId, string localUserName)
    {
        var userId = string.IsNullOrWhiteSpace(localUserId) ? Context.ConnectionId : localUserId;
        var userName = string.IsNullOrWhiteSpace(localUserName) ? "Jogador" : localUserName;

        if (_gameManager.JoinWaitlist(tableId, userId, userName))
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);
        }
    }

    public async Task LeaveWaitlist(string tableId, string localUserId)
    {
        var userId = string.IsNullOrWhiteSpace(localUserId) ? Context.ConnectionId : localUserId;
        if (_gameManager.LeaveWaitlist(tableId, userId))
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);
        }
    }


    public async Task UpdateAvatar(string tableId, string newAvatar)
    {
        if (_gameManager.UpdatePlayerAvatar(tableId, Context.ConnectionId, newAvatar))
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);
        }
    }

    public async Task SitDown(string tableId, int seat, object buyInRaw, string localUserId)
    {
        Console.WriteLine($"\n[DEBUG] === TENTATIVA DE SENTAR INICIADA ===");

        try
        {
            // 👇 CORREÇÃO: Lendo o número corretamente do formato JsonElement do SignalR
            decimal buyIn = 0;
            if (buyInRaw is JsonElement jsonElement)
            {
                buyIn = jsonElement.GetDecimal();
            }
            else
            {
                buyIn = Convert.ToDecimal(buyInRaw);
            }

            if (buyIn <= 0)
            {
                await Clients.Caller.SendAsync("ReceiveError", "Tentativa de fraude detectada: Valor inválido.");
                return;
            }

            bool seated = await _gameManager.SitPlayer(tableId, Context.ConnectionId, seat, buyIn);

            if (seated)
            {
                await Clients.Group(tableId).SendAsync("PlayerSatDown", seat);
                await Clients.Group(tableId).SendAsync("TableStateUpdated", _gameManager.GetOrCreateTable(tableId));
                await CheckAndBroadcastGameStart(tableId);

                int count = _gameManager.GetSeatedPlayerCount(tableId);
                await Clients.All.SendAsync("LobbyTableUpdated", tableId, count);
            }
            else
            {
                await Clients.Caller.SendAsync("ReceiveError", "Assento ocupado, reservado para a fila ou saldo insuficiente na carteira para esse Buy-in.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DEBUG] CRÍTICO! Exception estourou no SitDown: {ex.Message}");
            await Clients.Caller.SendAsync("ReceiveError", $"Erro no servidor ao tentar sentar: {ex.Message}");
        }
    }

    public async Task Rebuy(string tableId, object amountRaw)
    {
        Console.WriteLine($"\n[DEBUG] === TENTATIVA DE RECARGA INICIADA ===");
        try
        {
            // 👇 CORREÇÃO: Lendo o número corretamente
            decimal amount = 0;
            if (amountRaw is JsonElement jsonElement)
            {
                amount = jsonElement.GetDecimal();
            }
            else
            {
                amount = Convert.ToDecimal(amountRaw);
            }

            if (amount <= 0)
            {
                await Clients.Caller.SendAsync("ReceiveError", "Tentativa de fraude detectada: Valor inválido.");
                return;
            }

            bool rebuySuccess = await _gameManager.Rebuy(tableId, Context.ConnectionId, amount);

            if (rebuySuccess)
            {
                await Clients.Group(tableId).SendAsync("TableStateUpdated", _gameManager.GetOrCreateTable(tableId));
                await CheckAndBroadcastGameStart(tableId);
            }
            else
            {
                await Clients.Caller.SendAsync("ReceiveError", "Falha no rebuy. Assento perdido ou saldo insuficiente.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DEBUG] CRÍTICO no Rebuy: {ex.Message}");
            await Clients.Caller.SendAsync("ReceiveError", $"Erro no servidor ao tentar recarregar: {ex.Message}");
        }
    }

    public Task SetLeaveNextHand(string tableId, bool willLeave)
    {
        _gameManager.SetLeaveNextHand(tableId, Context.ConnectionId, willLeave);
        return Task.CompletedTask;
    }

    public async Task SkipBet(string tableId, string localUserId)
    {
        try
        {
            if (_gameManager.SkipTurn(tableId, Context.ConnectionId, out int seat, out bool roundEnded))
            {
                await Clients.Group(tableId).SendAsync("PlayerSkipped", seat);
                await _gameManager.ProcessNextRoundLoop(tableId, roundEnded, 2000);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro no SkipBet: {ex.Message}");
        }
    }

    public async Task ConfirmBet(string tableId, object amountRaw, string localUserId)
    {
        try
        {
            // 👇 CORREÇÃO: Lendo o número corretamente
            decimal amount = 0;
            if (amountRaw is JsonElement jsonElement)
            {
                amount = jsonElement.GetDecimal();
            }
            else
            {
                amount = Convert.ToDecimal(amountRaw);
            }

            if (_gameManager.PlaceBet(tableId, Context.ConnectionId, amount, out int seat, out bool isWin, out bool potBroken, out bool roundEnded, out string[] playedCards, out string centerCardRevealed))
            {
                await Clients.Group(tableId).SendAsync("PlayerBetted", seat, amount, isWin, potBroken, playedCards, centerCardRevealed);

                int delay = 8000;
                if (isWin) delay = 8500;
                if (potBroken) delay += 2500;

                await _gameManager.ProcessNextRoundLoop(tableId, roundEnded, delay);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro no ConfirmBet: {ex.Message}");
        }
    }

    public async Task StandUp(string tableId)
    {
        try
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            var player = tableState.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId && p.IsSeated);
            int logicalSeat = player?.Seat ?? -1;

            bool stoodUp = await _gameManager.StandUp(tableId, Context.ConnectionId);

            if (stoodUp)
            {
                if (logicalSeat != -1)
                {
                    await Clients.Group(tableId).SendAsync("PlayerStoodUp", logicalSeat);
                }

                var newState = _gameManager.GetOrCreateTable(tableId);
                await Clients.Group(tableId).SendAsync("TableStateUpdated", newState);

                int count = _gameManager.GetSeatedPlayerCount(tableId);
                await Clients.All.SendAsync("LobbyTableUpdated", tableId, count);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro no StandUp: {ex.Message}");
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try
        {
            var (tableId, logicalSeat) = await _gameManager.RemovePlayerByConnectionIdAsync(Context.ConnectionId);

            if (tableId != null)
            {
                if (logicalSeat != -1)
                {
                    await Clients.Group(tableId).SendAsync("PlayerStoodUp", logicalSeat);
                }

                var tableState = _gameManager.GetOrCreateTable(tableId);
                await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);

                int count = _gameManager.GetSeatedPlayerCount(tableId);
                await Clients.All.SendAsync("LobbyTableUpdated", tableId, count);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro na Desconexão: {ex.Message}");
        }

        await base.OnDisconnectedAsync(exception);
    }

    private async Task CheckAndBroadcastGameStart(string tableId)
    {
        if (_gameManager.CheckAndStartGame(tableId))
        {
            var dealingState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", dealingState);

            await Task.Delay(3000);

            lock (dealingState.Players)
            {
                dealingState.Phase = "betting";
                dealingState.TurnEndTime = DateTime.UtcNow.AddSeconds(20);
            }
            await Clients.Group(tableId).SendAsync("TableStateUpdated", dealingState);
        }
    }
}