using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace Backend.Game.Messaging;

// 1. Contratos das Mensagens
public class HandCompletedMessage
{
    public Guid GameTableId { get; set; }
    public DateTimeOffset EndedAt { get; set; } = DateTimeOffset.UtcNow;
    public List<string> CommunityCards { get; set; } = new();
    public decimal TotalPot { get; set; }
    public decimal TotalRake { get; set; }
    public List<PlayerHandResult> Players { get; set; } = new();
}

public class PlayerHandResult
{
    public Guid PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty; 
    public List<string> HoleCards { get; set; } = new();
    public decimal BetAmount { get; set; }
    public decimal WonAmount { get; set; }
    public decimal NetProfit { get; set; }
    public bool IsWinner { get; set; }
}

public class TableExpirationMessage
{
    public Guid TableId { get; set; }
}

// 2. A Interface (Agora com suporte a Expiração de Mesas)
public interface IRabbitMqService
{
    Task PublishHandAsync(HandCompletedMessage message);
    Task PublishTableExpirationAsync(Guid tableId, int durationHours);
}

// 3. O Serviço Publicador (RabbitMQ v7)
public class RabbitMqService : IRabbitMqService, IAsyncDisposable
{
    private readonly IConfiguration _configuration;
    private const string HandQueueName = "hand_history_queue";
    private const string TableWaitQueue = "table_wait_queue";
    private const string TableActionQueue = "table_action_queue";

    private IConnection? _connection;
    private IChannel? _channel;
    private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

    public RabbitMqService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private async Task EnsureConnectionAsync()
    {
        if (_channel is { IsOpen: true }) return;

        await _semaphore.WaitAsync();
        try
        {
            if (_channel is { IsOpen: true }) return;

            if (_channel != null) { try { await _channel.DisposeAsync(); } catch { } }
            if (_connection != null) { try { await _connection.DisposeAsync(); } catch { } }

            var factory = new ConnectionFactory
            {
                HostName = _configuration["RabbitMq:Host"] ?? "localhost",
                UserName = _configuration["RabbitMq:Username"] ?? "guest",
                Password = _configuration["RabbitMq:Password"] ?? "guest",
                ClientProvidedName = "MagicCasino_Publisher" 
            };

            _connection = await factory.CreateConnectionAsync();
            _channel = await _connection.CreateChannelAsync();

            // Declaração da fila do histórico de mãos
            await _channel.QueueDeclareAsync(queue: HandQueueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

            // Declaração da Fila de Ação (Para onde as mensagens mortas irão)
            await _channel.QueueDeclareAsync(queue: TableActionQueue, durable: true, exclusive: false, autoDelete: false, arguments: null);

            // Declaração da Fila de Espera (Com DLX configurado para enviar à Fila de Ação)
            var waitArguments = new Dictionary<string, object>
            {
                { "x-dead-letter-exchange", "" },
                { "x-dead-letter-routing-key", TableActionQueue }
            };
            await _channel.QueueDeclareAsync(queue: TableWaitQueue, durable: true, exclusive: false, autoDelete: false, arguments: waitArguments);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task PublishHandAsync(HandCompletedMessage message)
    {
        await EnsureConnectionAsync();
        var json = JsonSerializer.Serialize(message);
        var body = Encoding.UTF8.GetBytes(json);
        var properties = new BasicProperties { Persistent = true };

        await _channel!.BasicPublishAsync(exchange: string.Empty, routingKey: HandQueueName, mandatory: false, basicProperties: properties, body: body);
    }

    public async Task PublishTableExpirationAsync(Guid tableId, int durationHours)
    {
        await EnsureConnectionAsync();

        var message = new TableExpirationMessage { TableId = tableId };
        var json = JsonSerializer.Serialize(message);
        var body = Encoding.UTF8.GetBytes(json);

        var properties = new BasicProperties { Persistent = true };
        
        // Define exatamente em quantos milissegundos a mensagem vai expirar
        long ttlMilliseconds = (long)TimeSpan.FromHours(durationHours).TotalMilliseconds;
        properties.Expiration = ttlMilliseconds.ToString();

        // Publica na Fila de Espera. Ela ficará presa lá até o TTL acabar.
        await _channel!.BasicPublishAsync(exchange: string.Empty, routingKey: TableWaitQueue, mandatory: false, basicProperties: properties, body: body);
    }

    public async ValueTask DisposeAsync()
    {
        if (_channel != null) await _channel.DisposeAsync();
        if (_connection != null) await _connection.DisposeAsync();
        _semaphore.Dispose();
    }
}