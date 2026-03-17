using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Identity.Models;

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("username")]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    [Column("phone")]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("passwordhash")]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("avatar")]
    public string Avatar { get; set; } = "default.webp";

    [ConcurrencyCheck]
    [Column("Balance")]
    public decimal Balance { get; set; } = 0.00m;

    [MaxLength(50)]
    [Column("apelido")]
    public string? Apelido { get; set; }

    [Column("createdat")]
    public DateTime CreatedAt { get; set; }

    [Column("updatedat")]
    public DateTime UpdatedAt { get; set; }

    [Column("isactive")]
    public bool IsActive { get; set; }
}