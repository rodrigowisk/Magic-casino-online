using System.ComponentModel.DataAnnotations;

namespace Backend.Cacheta.DTOs;

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

    // 👇 ALTERADO PARA HORAS (Ex: 1 a 48) 👇
    [Required]
    [Range(1, 48)]
    public int DurationHours { get; set; }

    // 👇 NOVIDADE: Recebe o tipo do jogo do frontend 👇
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

    // 👇 ALTERADO PARA HORAS 👇
    public int DurationHours { get; set; }

    // 👇 NOVIDADE: Devolve o tipo do jogo para o frontend 👇
    public string GameType { get; set; } = string.Empty;

    public bool HasPassword { get; set; }
}

public class ValidatePasswordDto
{
    [Required]
    public string Password { get; set; } = string.Empty;
}