using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Identity.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Identity.Data;

[Table("roles")]
public class Role
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;
}

[Table("userroles")]
public class UserRole
{
    [Column("userid")]
    public Guid UserId { get; set; }

    [Column("roleid")]
    public int RoleId { get; set; }
}

// 👇 NOVO: Entidade para a tabela de solicitações pendentes
[Table("pending_agent_requests")]
public class PendingAgentRequest
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("userid")]
    public Guid UserId { get; set; }

    [Column("agentid")]
    public Guid AgentId { get; set; }

    [Column("createdat")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<WalletTransaction> WalletTransactions { get; set; }
    public DbSet<Agent> Agents { get; set; }
    public DbSet<AgentWalletTransaction> AgentWalletTransactions { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }

    public DbSet<SystemSetting> SystemSettings { get; set; }

    public DbSet<PendingAgentRequest> PendingAgentRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .Property(u => u.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<PendingAgentRequest>()
            .Property(p => p.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        modelBuilder.Entity<WalletTransaction>()
            .HasIndex(w => w.TransactionId)
            .IsUnique();

        modelBuilder.Entity<Agent>()
            .HasIndex(a => a.ReferralCode)
            .IsUnique();

        modelBuilder.Entity<Agent>()
            .HasIndex(a => a.UserId)
            .IsUnique();

        modelBuilder.Entity<UserRole>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });
    }
}