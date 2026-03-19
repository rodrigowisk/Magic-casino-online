using System;
using System.Collections.Generic;
using System.Linq;

// 👇 NAMESPACE ALTERADO PARA CACHETA 👇
namespace Backend.Cacheta.Models.RealTime;

public class TableState
{
    public string TableId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Phase { get; set; } = "waiting";
    public decimal Pot { get; set; } = 0;
    public decimal MinBet { get; set; } = 10;
    public int CurrentTurnSeat { get; set; } = -1;

    // 👇 VARIÁVEIS EXCLUSIVAS DA CACHETA 👇

    // A carta virada na mesa que define qual é o curinga da rodada
    public string ViraCard { get; set; } = string.Empty;

    // O Lixo (Pilha de descarte). A última carta da lista é a que fica visível no topo
    public List<string> DiscardPile { get; set; } = new();

    // Mostra quantas cartas sobraram no monte fechado para os jogadores comprarem
    public int StockPileCount { get; set; } = 0;

    public DateTime? TurnEndTime { get; set; }
    public double TurnTimeLeft => TurnEndTime.HasValue ? Math.Max(0, (TurnEndTime.Value - DateTime.UtcNow).TotalSeconds) : 0;

    public int MaxPlayers { get; set; } = 6;
    public decimal Rake { get; set; } = 0;
    public decimal MinBuyIn { get; set; } = 100;
    public DateTime ExpiresAt { get; set; }

    public List<PlayerState> Players { get; set; } = new();
}

public class PlayerState
{
    public string ConnectionId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public string Avatar { get; set; } = "default.webp";

    public int Seat { get; set; } = -1;
    public decimal Chips { get; set; } = 0;

    public decimal TotalBuyIn { get; set; } = 0;
    public decimal TotalCashOut { get; set; } = 0;
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    public decimal LastChips { get; set; } = 0;

    public bool IsSeated { get; set; } = false;
    public string Status { get; set; } = "waiting";
    public bool LeaveNextHand { get; set; } = false;

    // Na Cacheta, essa lista vai guardar as 9 (ou 10) cartas da mão do jogador
    public List<string> Cards { get; set; } = new();

    // 👇 CONTROLE DE TURNO DA CACHETA 👇
    // True: Ele já puxou do lixo ou do monte (agora precisa descartar)
    // False: É o começo do turno dele (precisa escolher de onde vai comprar)
    public bool HasDrawnThisTurn { get; set; } = false;
    public bool HasFurou { get; set; } = false;
}