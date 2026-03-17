using Backend.Identity.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Identity.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Garante que o C# entenda que o banco gera o UUID automaticamente
        modelBuilder.Entity<User>()
            .Property(u => u.Id)
            .HasDefaultValueSql("gen_random_uuid()");
    }
}