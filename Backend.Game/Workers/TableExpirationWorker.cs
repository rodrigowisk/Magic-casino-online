using System.Text;
using System.Text.Json;
using Backend.Game.Data;
using Backend.Game.Services;
using Backend.Game.Messaging;
using Backend.Game.Models.RealTime;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Data;

namespace Backend.Game.Workers;

public class TableExpirationWorker : BackgroundService
{
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TableExpirationWorker> _logger;
    private const string QueueName = "table_action_queue";

    public TableExpirationWorker(IConfiguration configuration, IServiceScopeFactory scopeFactory, ILogger<TableExpirationWorker> logger)
    {
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = new ConnectionFactory
        {
            HostName = _configuration["RabbitMq:Host"] ?? "localhost",
            UserName = _configuration["RabbitMq:Username"] ?? "guest",
            Password = _configuration["RabbitMq:Password"] ?? "guest",
            ClientProvidedName = "MagicCasino_TableCleaner"
        };

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var connection = await factory.CreateConnectionAsync();
                var channel = await connection.CreateChannelAsync();

                await channel.QueueDeclareAsync(queue: QueueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

                var consumer = new AsyncEventingBasicConsumer(channel);

                consumer.ReceivedAsync += async (model, ea) =>
                {
                    var body = ea.Body.ToArray();
                    var messageStr = Encoding.UTF8.GetString(body);

                    try
                    {
                        var data = JsonSerializer.Deserialize<TableExpirationMessage>(messageStr);
                        if (data != null)
                        {
                            await ProcessTableExpirationAsync(data.TableId, stoppingToken);
                        }

                        await channel.BasicAckAsync(ea.DeliveryTag, false);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"[ERRO RABBITMQ] Falha ao processar expiração da mesa: {ex.Message}");
                        await channel.BasicNackAsync(ea.DeliveryTag, false, true);
                    }
                };

                await channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer);
                _logger.LogInformation("🚀 [WORKER] Robô de Expiração via RabbitMQ conectado e aguardando eventos.");

                while (!stoppingToken.IsCancellationRequested && connection.IsOpen && channel.IsOpen)
                {
                    await Task.Delay(1000, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"[RABBITMQ RECONNECT] Tentando reconectar em 5 segundos... Erro: {ex.Message}");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }

    private async Task ProcessTableExpirationAsync(Guid tableId, CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var gameManager = scope.ServiceProvider.GetRequiredService<GameManager>();

        var table = await dbContext.GameTables.FindAsync(new object[] { tableId }, stoppingToken);
        
        if (table == null || !table.IsActive)
        {
            _logger.LogInformation($"[IGNORE] Mesa {tableId} já foi encerrada ou não existe.");
            return;
        }

        _logger.LogInformation($"[ENCERRANDO MESA] A mesa '{table.Name}' ({table.Id}) atingiu o tempo limite exato via RabbitMQ.");

        // Expulsa os jogadores e força a devolução do saldo antes de matar a mesa
        var tableState = gameManager.GetOrCreateTable(table.Id.ToString());
        List<PlayerState> playersToKick = new();
        
        lock (tableState.Players)
        {
            playersToKick = tableState.Players.Where(p => p != null && (p.IsSeated || p.Chips > 0 || p.PendingRebuy > 0)).ToList();
        }

        foreach (var p in playersToKick)
        {
            _logger.LogInformation($"[CASH-OUT FORÇADO] Expulsando jogador {p.Name} da mesa {table.Name} para devolução de saldo.");
            await gameManager.StandUp(table.Id.ToString(), p.ConnectionId, p.UserId);
        }

        // Calcula o Rake e envia para a carteira
        var connection = dbContext.Database.GetDbConnection();
        bool connectionOpenedByUs = false;
        
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(stoppingToken);
            connectionOpenedByUs = true;
        }

        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT COALESCE(SUM(total_rake), 0) FROM public.game_hands WHERE game_table_id = @tableId";
            var param = command.CreateParameter();
            param.ParameterName = "@tableId";
            param.Value = table.Id;
            command.Parameters.Add(param);

            var resultObj = await command.ExecuteScalarAsync(stoppingToken);
            decimal totalRake = resultObj != DBNull.Value ? Convert.ToDecimal(resultObj) : 0m;

            if (totalRake > 0)
            {
                var identityApiUrl = _configuration["IdentityApiUrl"] ?? "http://magic_identity:8080";
                var apiKey = _configuration["InternalApiKey"] ?? "";
                
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("X-Internal-Api-Key", apiKey);

                var requestBody = new { TableId = table.Id.ToString(), Amount = totalRake };
                var response = await httpClient.PostAsJsonAsync($"{identityApiUrl}/api/wallet/collect-table-rake", requestBody, stoppingToken);

                if (response.IsSuccessStatusCode)
                    _logger.LogInformation($"[SUCESSO] R$ {totalRake} creditados no Caixa Central da mesa {table.Name}.");
            }
        }
        finally
        {
            if (connectionOpenedByUs) await connection.CloseAsync();
        }

        table.IsActive = false;
        await dbContext.SaveChangesAsync(stoppingToken);
    }
}