using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Identity.Models;

[Table("agents")]
public class Agent
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("referral_code")]
    public string ReferralCode { get; set; } = string.Empty;

    [ConcurrencyCheck]
    [Column("agent_balance")]
    public decimal AgentBalance { get; set; } = 0.00m;

    [Column("commission_rate")]
    public decimal CommissionRate { get; set; } = 0.00m;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // Relacionamento com o usuário dono desta conta de agente
    [ForeignKey("UserId")]
    public User? User { get; set; }
}