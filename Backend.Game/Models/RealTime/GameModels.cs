using System;
using System.Collections.Generic;

namespace Backend.Game.Models.RealTime;

public class TableState
{
    public string TableId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Phase { get; set; } = "waiting";
    public decimal Pot { get; set; } = 0;
    public decimal MinBet { get; set; } = 10;
    public int CurrentTurnSeat { get; set; } = -1;
    public string CenterCard { get; set; } = string.Empty;

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

    // 👇 NOVA: Guarda as fichas do jogador no momento que ele levantou
    public decimal LastChips { get; set; } = 0;

    public bool IsSeated { get; set; } = false;
    public string Status { get; set; } = "waiting";
    public bool LeaveNextHand { get; set; } = false;
    public List<string> Cards { get; set; } = new();
}