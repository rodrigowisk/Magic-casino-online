using System;
using System.ComponentModel.DataAnnotations;

// 👇 A correção está aqui: Voltamos para o namespace do Meinho (Game)
namespace Backend.Game.DTOs;

public class CreateTableDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Range(1, 100000)]
    public decimal Ante { get; set; }

    [Required]
    [Range(2, 6)]
    public int MaxPlayers { get; set; }

    [Required]
    [Range(0, 100)]
    public decimal Rake { get; set; }

    [Required]
    public decimal MinBuyIn { get; set; }

    // Duração da Mesa em Horas
    [Required]
    [Range(1, 48)]
    public int DurationHours { get; set; }

    // Recebe o tipo do jogo do frontend
    [Required]
    public string GameType { get; set; } = string.Empty;

    public string? Password { get; set; }
}

public class TableResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Ante { get; set; }
    public int MaxPlayers { get; set; }
    public int CurrentPlayers { get; set; }
    public decimal Rake { get; set; }
    public decimal MinBuyIn { get; set; }

    // Duração em Horas
    public int DurationHours { get; set; }

    // Devolve o tipo do jogo para o frontend
    public string GameType { get; set; } = string.Empty;

    public bool HasPassword { get; set; }
}

public class ValidatePasswordDto
{
    [Required]
    public string Password { get; set; } = string.Empty;
}