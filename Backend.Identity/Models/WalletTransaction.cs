using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore; // 🔥 FALTOU ESTA LINHA 🔥

namespace Backend.Identity.Models;

[Table("wallet_transactions")]
[Index(nameof(TransactionId), IsUnique = false)] // 🔥 ADICIONE ISTO AQUI
public class WalletTransaction
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    // A propriedade que estava faltando para o Docker compilar:
    [Column("transactionid")]
    public Guid? TransactionId { get; set; }

    [Required]
    [Column("userid")]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("operation")]
    public string Operation { get; set; } = string.Empty;

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("balancebefore")]
    public decimal BalanceBefore { get; set; }

    [Column("balanceafter")]
    public decimal BalanceAfter { get; set; }

    [MaxLength(255)]
    [Column("tableid")]
    public string TableId { get; set; } = string.Empty;

    [Column("createdat")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("UserId")]
    public User? User { get; set; }
}