using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Backend.Game.Data;
using Backend.Game.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace Backend.Game.Workers;

public class CrashRecoveryWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CrashRecoveryWorker> _logger;
    private readonly IConfiguration _configuration;

    public CrashRecoveryWorker(IServiceScopeFactory scopeFactory, ILogger<CrashRecoveryWorker> logger, IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🛠️ [RECOVERY] Robô de resgate iniciado. Aguardando a Carteira (Identity) ficar online...");

        var identityUrl = _configuration["IdentityApiUrl"] ?? "http://localhost:5001";
        using var httpClient = new HttpClient();
        bool identityReady = false;

        while (!identityReady && !stoppingToken.IsCancellationRequested)
        {
            try
            {
                var response = await httpClient.GetAsync($"{identityUrl}/swagger/index.html", stoppingToken);
                identityReady = true;
                _logger.LogInformation("✅ [RECOVERY] Carteira online! Iniciando auditoria das mesas...");
            }
            catch
            {
                _logger.LogWarning("⏳ [RECOVERY] Carteira ainda ligando. Tentando de novo em 3 segundos...");
                await Task.Delay(3000, stoppingToken);
            }
        }

        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();

        try
        {
            var activeTables = await dbContext.GameTables
                .Where(t => t.IsActive)
                .ToListAsync(stoppingToken);

            if (!activeTables.Any())
            {
                _logger.LogInformation("✅ [RECOVERY] Nenhuma mesa ativa encontrada. Sistema limpo.");
                return;
            }

            foreach (var table in activeTables)
            {
                _logger.LogInformation($"🔍 [RECOVERY] Auditando mesa: {table.Name} (ID: {table.Id})");

                // 1. Pede o fluxo de carteira via API para o Identity
                var walletFlow = await walletService.GetTableWalletFlowAsync(table.Id.ToString());

                // 2. Busca o lucro/prejuízo das mãos (fica no DB do Jogo)
                var gameFlow = new Dictionary<string, decimal>();
                var connection = dbContext.Database.GetDbConnection();
                await connection.OpenAsync(stoppingToken);

                using var cmd = connection.CreateCommand();
                cmd.CommandText = @"
                    SELECT ghp.player_id::text, COALESCE(SUM(ghp.net_profit), 0)
                    FROM public.game_hand_players ghp
                    JOIN public.game_hands gh ON ghp.game_hand_id = gh.id
                    WHERE gh.game_table_id = @tableIdGuid
                    GROUP BY ghp.player_id";

                var pTableGuid = cmd.CreateParameter();
                pTableGuid.ParameterName = "@tableIdGuid";
                pTableGuid.Value = table.Id;
                cmd.Parameters.Add(pTableGuid);

                using var reader = await cmd.ExecuteReaderAsync(stoppingToken);
                while (await reader.ReadAsync())
                {
                    gameFlow[reader.GetString(0)] = reader.GetDecimal(1);
                }
                await connection.CloseAsync();

                // 3. Junta as duas listas de jogadores para ter o resultado exato
                var allPlayers = walletFlow.Keys.Union(gameFlow.Keys).Distinct().ToList();

                foreach (var playerId in allPlayers)
                {
                    decimal netWallet = walletFlow.TryGetValue(playerId, out var w) ? w : 0;
                    decimal netGame = gameFlow.TryGetValue(playerId, out var g) ? g : 0;

                    decimal orphanedChips = netWallet + netGame;

                    if (orphanedChips > 0.01m)
                    {
                        _logger.LogWarning($"💰 [RECOVERY] Fichas resgatadas! Devolvendo R$ {orphanedChips} para o Jogador {playerId}");

                        // 🔥 AQUI ESTÁ A CORREÇÃO: Passando table.IsDemo para o WalletService 🔥
                        var success = await walletService.AddCashOutAsync(playerId, orphanedChips, table.Id.ToString(), table.IsDemo);

                        if (!success.Success)
                        {
                            _logger.LogError($"[ERRO GRAVE] O Identity rejeitou a devolução de {orphanedChips} para {playerId}.");
                        }
                    }
                }
            }

            _logger.LogInformation("🚀 [RECOVERY] Auditoria concluída com sucesso. Nenhum centavo foi perdido.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [RECOVERY] Erro crítico na auditoria.");
        }
    }
}