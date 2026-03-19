using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Game.Models;

[Table("game_tables")]
public class GameTable
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("ante")]
    public decimal Ante { get; set; }

    [Column("max_players")]
    public int MaxPlayers { get; set; }

    [Column("current_players")]
    public int CurrentPlayers { get; set; }

    [Column("rake")]
    public decimal Rake { get; set; }

    [Column("min_buyin")]
    public decimal MinBuyIn { get; set; }

    [Column("duration_hours")]
    public int DurationHours { get; set; }

    [MaxLength(255)]
    [Column("passwordhash")]
    public string? PasswordHash { get; set; }

    [Column("createdat")]
    public DateTime CreatedAt { get; set; }

    [Column("isactive")]
    public bool IsActive { get; set; }

    [Column("game_type")]
    public string GameType { get; set; } = string.Empty;

    // 👇 NOVO: Coluna no banco para salvar a imagem
    [MaxLength(255)]
    [Column("cover_image")]
    public string CoverImage { get; set; } = "casino.webp";
}