using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Backend.Game.Services;
using Backend.Game.Models.RealTime;
using System.Threading.Tasks;
using System;
using System.Linq;

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

            await Clients.GroupExcept(tableId, Context.ConnectionId).SendAsync("PlayerJoined", player);
            
            // 🔥 AQUI É A MÁGICA: Passa pelo funil blindado que esconde as cartas antes de enviar para o cliente
            await _gameManager.BroadcastTableStateAsync(tableId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CRÍTICO] Erro no JoinTable: {ex.Message}");
        }
    }

    public async Task LeaveTable(string tableId)
    {
        try
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, tableId);
            var (removedTableId, logicalSeat) = await _gameManager.RemovePlayerByConnectionIdAsync(Context.ConnectionId);

            if (removedTableId != null)
            {
                if (logicalSeat != -1)
                {
                    await Clients.Group(removedTableId).SendAsync("PlayerStoodUp", logicalSeat);
                }

                int count = _gameManager.GetSeatedPlayerCount(removedTableId);
                await Clients.All.SendAsync("LobbyTableUpdated", removedTableId, count);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CRÍTICO] Erro no LeaveTable: {ex.Message}");
        }
    }

    public async Task JoinWaitlist(string tableId, string localUserId, string localUserName)
    {
        var userId = string.IsNullOrWhiteSpace(localUserId) ? Context.ConnectionId : localUserId;
        var userName = string.IsNullOrWhiteSpace(localUserName) ? "Jogador" : localUserName;

        if (_gameManager.JoinWaitlist(tableId, userId, userName))
        {
            await _gameManager.BroadcastTableStateAsync(tableId);
        }
    }

    public Task LeaveWaitlist(string tableId, string localUserId)
    {
        var userId = string.IsNullOrWhiteSpace(localUserId) ? Context.ConnectionId : localUserId;
        _gameManager.LeaveWaitlist(tableId, userId);
        return Task.CompletedTask;
    }

    public async Task UpdateAvatar(string tableId, string newAvatar)
    {
        if (_gameManager.UpdatePlayerAvatar(tableId, Context.ConnectionId, newAvatar))
        {
            await _gameManager.BroadcastTableStateAsync(tableId);
        }
    }

    public async Task SitDown(string tableId, int seat, decimal buyIn, string localUserId = "")
    {
        try
        {
            if (buyIn <= 0)
            {
                await Clients.Caller.SendAsync("ReceiveError", "Tentativa de fraude detectada: Valor inválido.");
                return;
            }

            bool seated = await _gameManager.SitPlayer(tableId, Context.ConnectionId, seat, buyIn, localUserId);

            if (seated)
            {
                // O GameManager já avisa o "PlayerSatDown" e já faz o "BroadcastTableStateAsync". 
                // Nossa única obrigação no Hub agora é atualizar o Lobby principal!
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
            await Clients.Caller.SendAsync("ReceiveError", $"Erro no servidor ao tentar sentar: {ex.Message}");
        }
    }

    public async Task Rebuy(string tableId, decimal amount, string localUserId = "")
    {
        try
        {
            if (amount <= 0)
            {
                await Clients.Caller.SendAsync("ReceiveError", "Tentativa de fraude detectada: Valor inválido.");
                return;
            }

            bool rebuySuccess = await _gameManager.Rebuy(tableId, Context.ConnectionId, amount, localUserId);

            if (!rebuySuccess)
            {
                await Clients.Caller.SendAsync("ReceiveError", "Falha no rebuy. Assento perdido ou saldo insuficiente.");
            }
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("ReceiveError", $"Erro no servidor ao tentar recarregar: {ex.Message}");
        }
    }

    public Task SetLeaveNextHand(string tableId, bool willLeave)
    {
        _gameManager.SetLeaveNextHand(tableId, Context.ConnectionId, willLeave);
        return Task.CompletedTask;
    }

    public async Task SkipBet(string tableId, string localUserId = "")
    {
        try
        {
            if (_gameManager.SkipTurn(tableId, Context.ConnectionId, out int seat, out bool roundEnded, localUserId))
            {
                await Clients.Group(tableId).SendAsync("PlayerSkipped", seat);
                await _gameManager.ProcessNextRoundLoop(tableId, roundEnded, 2000);
            }
            else
            {
                await Clients.Caller.SendAsync("ReceiveError", "Não foi possível pular a vez. O turno pode já ter expirado.");
            }
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("ReceiveError", $"Erro no servidor ao pular a vez: {ex.Message}");
        }
    }

    public async Task ConfirmBet(string tableId, decimal amount, string localUserId = "")
    {
        try
        {
            if (_gameManager.PlaceBet(tableId, Context.ConnectionId, amount, out int seat, out bool isWin, out bool potBroken, out bool roundEnded, out string[] playedCards, out string centerCardRevealed, localUserId))
            {
                await Clients.Group(tableId).SendAsync("PlayerBetted", seat, amount, isWin, potBroken, playedCards, centerCardRevealed);

                int delay = 10000;
                if (isWin) delay = 12000;
                if (potBroken) delay += 2500;

                await _gameManager.ProcessNextRoundLoop(tableId, roundEnded, delay);
            }
            else
            {
                await Clients.Caller.SendAsync("ReceiveError", "Aposta rejeitada. Verifique se é a sua vez e se suas cartas são válidas.");
            }
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("ReceiveError", $"Erro interno ao apostar: {ex.Message}");
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
                // Garante que o estado mais recente (mesmo que seja só sinalizando "LeaveNextHand")
                // seja refletido na mesa imediatamente.
                await _gameManager.BroadcastTableStateAsync(tableId);

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
}