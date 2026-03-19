using Backend.Identity.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Identity.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<WalletTransaction> WalletTransactions { get; set; }

    // 👇 NOVAS TABELAS DE AFILIADOS 👇
    public DbSet<Agent> Agents { get; set; }
    public DbSet<AgentWalletTransaction> AgentWalletTransactions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Garante que o C# entenda que o banco gera o UUID automaticamente
        modelBuilder.Entity<User>()
            .Property(u => u.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // Garante que não teremos transações duplicadas processadas por engano
        modelBuilder.Entity<WalletTransaction>()
            .HasIndex(w => w.TransactionId)
            .IsUnique();

        // Garante que o código de indicação seja único
        modelBuilder.Entity<Agent>()
            .HasIndex(a => a.ReferralCode)
            .IsUnique();

        // Um usuário só pode ter uma conta de agente
        modelBuilder.Entity<Agent>()
            .HasIndex(a => a.UserId)
            .IsUnique();
    }
}