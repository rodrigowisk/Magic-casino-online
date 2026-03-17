using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace Backend.Cacheta.Messaging;

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

// 3. O Serviço Publicador (RabbitMQ v7)
public class RabbitMqService : IRabbitMqService
{
    private readonly IConfiguration _configuration;
    private const string QueueName = "hand_history_queue";

    public RabbitMqService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task PublishHandAsync(HandCompletedMessage message)
    {
        var factory = new ConnectionFactory
        {
            HostName = _configuration["RabbitMq:Host"] ?? "localhost",
            UserName = _configuration["RabbitMq:Username"] ?? "guest",
            Password = _configuration["RabbitMq:Password"] ?? "guest"
        };

        // Na v7, tudo deve ser Async
        await using var connection = await factory.CreateConnectionAsync();
        await using var channel = await connection.CreateChannelAsync();

        await channel.QueueDeclareAsync(queue: QueueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

        var json = JsonSerializer.Serialize(message);
        var body = Encoding.UTF8.GetBytes(json);

        var properties = new BasicProperties { Persistent = true };

        await channel.BasicPublishAsync(exchange: string.Empty, routingKey: QueueName, mandatory: false, basicProperties: properties, body: body);
    }
}