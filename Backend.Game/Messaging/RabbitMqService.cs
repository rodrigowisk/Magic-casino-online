using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace Backend.Game.Messaging;

// 1. O Contrato da Mensagem
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
    // 🔥 PROPRIEDADE ADICIONADA PARA RESOLVER O ERRO DE COMPILAÇÃO 🔥
    public string PlayerName { get; set; } = string.Empty; 
    public List<string> HoleCards { get; set; } = new();
    public decimal BetAmount { get; set; }
    public decimal WonAmount { get; set; }
    public decimal NetProfit { get; set; }
    public bool IsWinner { get; set; }
}

// 2. A Interface (Agora Assíncrona)
public interface IRabbitMqService
{
    Task PublishHandAsync(HandCompletedMessage message);
}

// 3. O Serviço Publicador (RabbitMQ v7) - 🔥 AGORA SINGLETON RESILIENTE 🔥
public class RabbitMqService : IRabbitMqService, IAsyncDisposable
{
    private readonly IConfiguration _configuration;
    private const string QueueName = "hand_history_queue";

    // Variáveis que manterão a conexão viva na memória
    private IConnection? _connection;
    private IChannel? _channel;

    // Trava de segurança para não abrir duas conexões se duas mesas terminarem no mesmo milissegundo
    private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

    public RabbitMqService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private async Task EnsureConnectionAsync()
    {
        // Se a conexão já existe e está aberta, passa direto (Super rápido!)
        if (_channel is { IsOpen: true }) return;

        await _semaphore.WaitAsync();
        try
        {
            // Verificação dupla caso outra thread já tenha aberto a conexão enquanto esta esperava
            if (_channel is { IsOpen: true }) return;

            var factory = new ConnectionFactory
            {
                HostName = _configuration["RabbitMq:Host"] ?? "localhost",
                UserName = _configuration["RabbitMq:Username"] ?? "guest",
                Password = _configuration["RabbitMq:Password"] ?? "guest",
                ClientProvidedName = "MagicCasino_Publisher" // Ajuda a rastrear no painel do RabbitMQ
            };

            _connection = await factory.CreateConnectionAsync();
            _channel = await _connection.CreateChannelAsync();

            await _channel.QueueDeclareAsync(queue: QueueName, durable: true, exclusive: false, autoDelete: false, arguments: null);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task PublishHandAsync(HandCompletedMessage message)
    {
        // Garante que a conexão está viva antes de publicar
        await EnsureConnectionAsync();

        var json = JsonSerializer.Serialize(message);
        var body = Encoding.UTF8.GetBytes(json);

        var properties = new BasicProperties { Persistent = true };

        // Publica usando o canal permanente
        await _channel!.BasicPublishAsync(exchange: string.Empty, routingKey: QueueName, mandatory: false, basicProperties: properties, body: body);
    }

    // Limpa a memória e fecha a conexão com segurança se a API for desligada
    public async ValueTask DisposeAsync()
    {
        if (_channel != null) await _channel.DisposeAsync();
        if (_connection != null) await _connection.DisposeAsync();

        _semaphore.Dispose();
    }
}