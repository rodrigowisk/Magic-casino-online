using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Identity.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Identity.Data;

// 👇 MODELOS DE ROLES (Você pode mover para arquivos separados na pasta Models depois se preferir)
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
// 👆 FIM DOS MODELOS DE ROLES

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<WalletTransaction> WalletTransactions { get; set; }
    public DbSet<Agent> Agents { get; set; }
    public DbSet<AgentWalletTransaction> AgentWalletTransactions { get; set; }

    // 👇 ADICIONADO PARA O SISTEMA DE ADMIN 👇
    public DbSet<Role> Roles { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .Property(u => u.Id)
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

        // Configura a chave composta da tabela associativa UserRoles
        modelBuilder.Entity<UserRole>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });
    }
}