using System.Collections.Generic;
using Backend.Cacheta.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Cacheta.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<GameTable> GameTables { get; set; }
}