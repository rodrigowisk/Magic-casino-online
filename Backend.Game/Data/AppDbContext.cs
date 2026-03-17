using System.Collections.Generic;
using Backend.Game.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Game.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<GameTable> GameTables { get; set; }
}