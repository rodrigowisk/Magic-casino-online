using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Backend.Cacheta.Services;
using Backend.Cacheta.Models.RealTime;
using System.Security.Claims;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Backend.Cacheta.Hubs;

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
        if (!string.IsNullOrEmpty(userId)) await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
    }

    public async Task JoinTable(string tableId, string localUserId, string localUserName, string avatar = "default.webp")
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

        bool seated = await _gameManager.SitPlayer(tableId, Context.ConnectionId, seat, buyIn);

        if (seated)
        {
            await Clients.Group(tableId).SendAsync("TableStateUpdated", _gameManager.GetOrCreateTable(tableId));
            await CheckAndBroadcastGameStart(tableId);
        }
        else await Clients.Caller.SendAsync("ReceiveError", "Falha ao sentar. Verifique o seu saldo.");
    }

    public async Task Rebuy(string tableId, decimal amount)
    {
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
        else await Clients.Caller.SendAsync("ReceiveError", "Falha no rebuy. Verifique o seu saldo.");
    }

    public async Task ReadyForNextRound(string tableId)
    {
        if (_gameManager.SetPlayerReady(tableId, Context.ConnectionId))
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);
            await CheckAndBroadcastGameStart(tableId);
        }
    }

    public async Task StandUp(string tableId)
    {
        bool stoodUp = await _gameManager.StandUp(tableId, Context.ConnectionId);
        if (stoodUp)
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);
        }
    }

    public Task SetLeaveNextHand(string tableId, bool willLeave)
    {
        _gameManager.SetLeaveNextHand(tableId, Context.ConnectionId, willLeave);
        return Task.CompletedTask;
    }

    // 👇 CHAMA A FUNÇÃO DE REORGANIZAR A MÃO NO BACKEND 👇
    public Task ReorderHand(string tableId, List<string> newOrder)
    {
        _gameManager.ReorderHand(tableId, Context.ConnectionId, newOrder);
        return Task.CompletedTask;
    }

    public async Task DrawCard(string tableId, bool fromDiscard)
    {
        if (_gameManager.DrawCard(tableId, Context.ConnectionId, fromDiscard, out int seat))
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);
        }
        else await Clients.Caller.SendAsync("ReceiveError", "Não é o seu turno, movimento inválido ou você furou na rodada e não pode comprar do lixo.");
    }

    public async Task DiscardCard(string tableId, string cardString)
    {
        if (_gameManager.DiscardCard(tableId, Context.ConnectionId, cardString, out int seat, out bool roundEnded))
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);

            if (roundEnded) await _gameManager.ProcessNextRoundLoop(tableId, roundEnded, 5000);
        }
        else await Clients.Caller.SendAsync("ReceiveError", "Movimento inválido. Você deve comprar antes de descartar.");
    }

    public async Task DeclareWin(string tableId, string cardToDiscard)
    {
        string result = _gameManager.DeclareWin(tableId, Context.ConnectionId, cardToDiscard, out int seat, out string playerName, out List<List<string>> winningGroups, out List<string> handCards);

        if (result == "Win")
        {
            var table = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", table);
            await Clients.Group(tableId).SendAsync("PlayerWon", new { Seat = seat, Name = playerName, Groups = winningGroups });
            _ = Task.Run(() => _gameManager.ProcessNextRoundLoop(tableId, true, 8000));
        }
        else if (result == "Furo")
        {
            var table = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", table);
            await Clients.Group(tableId).SendAsync("PlayerFurou", new { Seat = seat, Name = playerName, Cards = handCards });
        }
        else
        {
            await Clients.Caller.SendAsync("ReceiveError", "Movimento inválido.");
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string? tableId = await _gameManager.RemovePlayerByConnectionIdAsync(Context.ConnectionId);

        if (tableId != null)
        {
            var tableState = _gameManager.GetOrCreateTable(tableId);
            await Clients.Group(tableId).SendAsync("TableStateUpdated", tableState);
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
                dealingState.TurnEndTime = DateTime.UtcNow.AddSeconds(60);
            }
            await Clients.Group(tableId).SendAsync("TableStateUpdated", dealingState);
        }
    }
}