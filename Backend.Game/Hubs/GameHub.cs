using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Backend.Game.Services;
using Backend.Game.Models.RealTime;
using System.Security.Claims;
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

    // NOVO MÉTODO: O Frontend do Lobby deve chamar isso ao conectar no Hub
    public async Task RegisterUser(string userId)
    {
        if (!string.IsNullOrEmpty(userId))
        {
            // Cria um grupo exclusivo para este usuário (para atualizar todas as abas dele)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
    }

    // Avatar adicionado como parâmetro opcional
    public async Task JoinTable(string tableId, string localUserId, string localUserName, string avatar = "default.webp")
    {
        var userId = string.IsNullOrWhiteSpace(localUserId) ? Context.ConnectionId : localUserId;
        var userName = string.IsNullOrWhiteSpace(localUserName) ? "Jogador" : localUserName;

        // Garante que o usuário está no seu grupo pessoal
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        await Groups.AddToGroupAsync(Context.ConnectionId, tableId);

        var player = new PlayerState
        {
            ConnectionId = Context.ConnectionId,
            UserId = userId,
            Name = userName,
            Avatar = avatar // Registra o avatar recebido do Vue
        };

        _gameManager.AddPlayerToTable(tableId, player);
        var tableState = _gameManager.GetOrCreateTable(tableId);

        await Clients.GroupExcept(tableId, Context.ConnectionId).SendAsync("PlayerJoined", player);
        await Clients.Caller.SendAsync("ReceiveTableState", tableState);
    }

    // Permite ao Vue trocar o avatar do jogador em tempo real
    public async Task UpdateAvatar(string tableId, string newAvatar)
    {
        if (_gameManager.UpdatePlayerAvatar(tableId, Context.ConnectionId, newAvatar))
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);
        }
    }

    public async Task SitDown(string tableId, int seat, decimal buyIn, string localUserId)
    {
        // 👇 A TRAVA ANTI-HACKER AQUI
        if (buyIn <= 0)
        {
            await Clients.Caller.SendAsync("ReceiveError", "Tentativa de fraude detectada: Valor inválido.");
            return;
        }

        var tableState = _gameManager.GetOrCreateTable(tableId);
        int seatedCount = tableState.Players.Count(p => p.IsSeated);

        if (seatedCount >= tableState.MaxPlayers || seat >= tableState.MaxPlayers)
        {
            await Clients.Caller.SendAsync("ReceiveError", "Mesa cheia ou assento inválido.");
            return;
        }

        // AGORA É ASYNC: Aguarda o GameManager verificar o saldo na carteira (Identity)
        bool seated = await _gameManager.SitPlayer(tableId, Context.ConnectionId, seat, buyIn);

        if (seated)
        {
            await Clients.Group(tableId).SendAsync("TableStateUpdated", _gameManager.GetOrCreateTable(tableId));
            await CheckAndBroadcastGameStart(tableId);
        }
        else
        {
            await Clients.Caller.SendAsync("ReceiveError", "Falha ao sentar. Verifique o seu saldo.");
        }
    }

    public async Task Rebuy(string tableId, decimal amount)
    {
        // 👇 A TRAVA ANTI-HACKER AQUI
        if (amount <= 0)
        {
            await Clients.Caller.SendAsync("ReceiveError", "Tentativa de fraude detectada: Valor inválido.");
            return;
        }

        // AGORA É ASYNC: Aguarda o GameManager debitar o rebuy da carteira (Identity)
        bool rebuySuccess = await _gameManager.Rebuy(tableId, Context.ConnectionId, amount);

        if (rebuySuccess)
        {
            await Clients.Group(tableId).SendAsync("TableStateUpdated", _gameManager.GetOrCreateTable(tableId));
            await CheckAndBroadcastGameStart(tableId);
        }
        else
        {
            await Clients.Caller.SendAsync("ReceiveError", "Falha no rebuy. Verifique o seu saldo.");
        }
    }

    public async Task StandUp(string tableId)
    {
        // AGORA É ASYNC: Aguarda o GameManager creditar as fichas na carteira real (Identity)
        bool stoodUp = await _gameManager.StandUp(tableId, Context.ConnectionId);

        if (stoodUp)
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);
        }
    }

    public async Task SetLeaveNextHand(string tableId, bool willLeave)
    {
        _gameManager.SetLeaveNextHand(tableId, Context.ConnectionId, willLeave);
    }

    public async Task SkipBet(string tableId, string localUserId)
    {
        if (_gameManager.SkipTurn(tableId, Context.ConnectionId, out int seat, out bool roundEnded))
        {
            await Clients.Group(tableId).SendAsync("PlayerSkipped", seat);
            await _gameManager.ProcessNextRoundLoop(tableId, roundEnded, 2000);
        }
    }

    public async Task ConfirmBet(string tableId, decimal amount, string localUserId)
    {
        if (_gameManager.PlaceBet(tableId, Context.ConnectionId, amount, out int seat, out bool isWin, out bool potBroken, out bool roundEnded, out string[] playedCards, out string centerCardRevealed))
        {
            await Clients.Group(tableId).SendAsync("PlayerBetted", seat, amount, isWin, potBroken, playedCards, centerCardRevealed);

            int delay = 8000;
            if (isWin) delay = 8500;
            if (potBroken) delay += 2500;

            await _gameManager.ProcessNextRoundLoop(tableId, roundEnded, delay);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // AGORA É ASYNC: Devolve as fichas para o jogador caso ele feche a aba/desconecte do nada
        string? tableId = await _gameManager.RemovePlayerByConnectionIdAsync(Context.ConnectionId);

        if (tableId != null)
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);
        }

        await base.OnDisconnectedAsync(exception);
    }

    // MÉTODO AUXILIAR PARA EVITAR CÓDIGO REPETIDO
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