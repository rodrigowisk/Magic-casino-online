using Microsoft.EntityFrameworkCore;

namespace Backend.HandHistoryWorker.Data;

// DbContext mínimo: esse worker só executa SQL bruto (ExecuteSqlRawAsync)
// pra gravar o histórico de mãos — não precisa mapear DbSets/entidades,
// só precisa da conexão gerenciada pelo EF Core.
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
}