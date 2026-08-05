using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Backend.Game.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Backend.Game.Workers;

public class TableCleanupWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TableCleanupWorker> _logger;
    private readonly string _identityApiUrl;
    private readonly string _apiKey;

    public TableCleanupWorker(IServiceScopeFactory scopeFactory, ILogger<TableCleanupWorker> logger, IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _identityApiUrl = configuration["IdentityApiUrl"] ?? "http://magic_identity:8080";
        _apiKey = configuration["InternalApiKey"] ?? "";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🚀 [WORKER] Robô de Limpeza de Mesas iniciado. Verificando vencimentos a cada 1 minuto...");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupExpiredTablesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ERRO CRÍTICO] Falha na rotina de fechamento de mesas.");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task CleanupExpiredTablesAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;

        // Busca as mesas ativas cujo tempo de duração já expirou
        var expiredTables = await dbContext.GameTables
            .Where(t => t.IsActive && t.CreatedAt.AddHours(t.DurationHours) <= now)
            .ToListAsync(stoppingToken);

        if (!expiredTables.Any())
            return;

        using var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Add("X-Internal-Api-Key", _apiKey);

        foreach (var table in expiredTables)
        {
            _logger.LogInformation($"[ENCERRANDO MESA] A mesa '{table.Name}' ({table.Id}) atingiu o tempo limite.");

            // 1. Calcula o Rake Total da mesa via SQL puro (Máxima Performance)
            var connection = dbContext.Database.GetDbConnection();
            await connection.OpenAsync(stoppingToken);

            using var command = connection.CreateCommand();
            command.CommandText = "SELECT COALESCE(SUM(total_rake), 0) FROM public.game_hands WHERE game_table_id = @tableId";

            var param = command.CreateParameter();
            param.ParameterName = "@tableId";
            param.Value = table.Id;
            command.Parameters.Add(param);

            var resultObj = await command.ExecuteScalarAsync(stoppingToken);
            decimal totalRake = resultObj != DBNull.Value ? Convert.ToDecimal(resultObj) : 0m;

            await connection.CloseAsync();

            // 2. Se a mesa gerou lucro, envia direto para a carteira de Agente do Dono
            if (totalRake > 0)
            {
                _logger.LogInformation($"[RAKE] Mesa '{table.Name}' gerou R$ {totalRake} de lucro. Enviando ao Caixa Central...");

                var requestBody = new CollectTableRakeRequest
                {
                    TableId = table.Id.ToString(),
                    Amount = totalRake
                };

                var response = await httpClient.PostAsJsonAsync($"{_identityApiUrl}/api/wallet/collect-table-rake", requestBody, stoppingToken);

                if (!response.IsSuccessStatusCode)
                {
                    var err = await response.Content.ReadAsStringAsync(stoppingToken);
                    _logger.LogError($"[ERRO IDENTITY] Falha ao enviar R$ {totalRake} da mesa '{table.Name}'. Erro: {err}");
                }
                else
                {
                    _logger.LogInformation($"[SUCESSO] R$ {totalRake} creditados no Caixa Central.");
                }
            }

            // 3. O Pulo do Gato: Desativa a mesa de verdade no Banco de Dados
            table.IsActive = false;
        }

        // Salva todas as alterações no banco de uma vez só
        await dbContext.SaveChangesAsync(stoppingToken);
    }
}

public class CollectTableRakeRequest
{
    public string TableId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}