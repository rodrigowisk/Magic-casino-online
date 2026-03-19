using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Identity.Models;

[Table("agent_wallet_transactions")]
public class AgentWalletTransaction
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("agent_id")]
    public Guid AgentId { get; set; }

    [Required]
    [Column("amount")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("transaction_type")]
    public string TransactionType { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("reference_id")]
    public string? ReferenceId { get; set; }

    [MaxLength(255)]
    [Column("description")]
    public string? Description { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("AgentId")]
    public Agent? Agent { get; set; }
}