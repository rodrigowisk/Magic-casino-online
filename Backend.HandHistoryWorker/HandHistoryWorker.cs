using System.Text;
using System.Text.Json;
using Backend.HandHistoryWorker.Data;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Backend.HandHistoryWorker;

// 🔥 Cópia local dos contratos de mensagem. Antes esse worker vivia dentro
// do Backend.Game e compartilhava a classe C# do RabbitMqService.cs de lá.
// Agora que é um processo/assembly separado, só compartilha o FORMATO JSON
// (a fila do RabbitMQ), não a classe em si — então precisa da própria cópia,
// com os mesmos nomes de propriedade pra desserializar certo.
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

public class HandHistoryWorker : BackgroundService
{
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private const string QueueName = "hand_history_queue";

    public HandHistoryWorker(IConfiguration configuration, IServiceScopeFactory scopeFactory)
    {
        _configuration = configuration;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = new ConnectionFactory
        {
            HostName = _configuration["RabbitMq:Host"] ?? "localhost",
            UserName = _configuration["RabbitMq:Username"] ?? "guest",
            Password = _configuration["RabbitMq:Password"] ?? "guest"
        };

        // Loop de resiliência: impede que o worker "crashe" se o RabbitMQ demorar
        // pra ligar, ou tenta reconectar se a conexão cair no meio do funcionamento.
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
                    var message = Encoding.UTF8.GetString(body);

                    try
                    {
                        var handData = JsonSerializer.Deserialize<HandCompletedMessage>(message);
                        if (handData != null)
                        {
                            await SaveHandToDatabaseAsync(handData);
                        }

                        await channel.BasicAckAsync(ea.DeliveryTag, false);
                    }
                    catch (Exception ex)
                    {
                        // 🔥 Se o banco estiver fora do ar, a mensagem volta pra fila
                        // (Nack com requeue) — nada se perde, só espera o banco voltar.
                        Console.WriteLine($"[HandHistoryWorker] Erro ao processar mão: {ex.Message}");
                        await channel.BasicNackAsync(ea.DeliveryTag, false, true);
                    }
                };

                await channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer);

                Console.WriteLine("[HandHistoryWorker] RabbitMQ conectado com sucesso! Aguardando mãos...");

                while (!stoppingToken.IsCancellationRequested && connection.IsOpen && channel.IsOpen)
                {
                    await Task.Delay(1000, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[HandHistoryWorker] RabbitMQ ainda não está pronto ou desconectou. Tentando reconectar em 5 segundos... Erro: {ex.Message}");
                await Task.Delay(5000, stoppingToken);
            }
        }
    }

    private async Task SaveHandToDatabaseAsync(HandCompletedMessage data)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var handId = Guid.NewGuid();

        var sqlHand = @"
            INSERT INTO public.game_hands (id, game_table_id, community_cards, total_pot, total_rake, started_at, ended_at)
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6})";

        await dbContext.Database.ExecuteSqlRawAsync(sqlHand,
            handId, data.GameTableId, data.CommunityCards, data.TotalPot, data.TotalRake, data.EndedAt.AddMinutes(-1), data.EndedAt);

        foreach (var player in data.Players)
        {
            var sqlPlayer = @"
                INSERT INTO public.game_hand_players (id, game_hand_id, player_id, player_name, hole_cards, bet_amount, won_amount, net_profit, is_winner)
                VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8})";

            await dbContext.Database.ExecuteSqlRawAsync(sqlPlayer,
                Guid.NewGuid(), handId, player.PlayerId, player.PlayerName ?? "Jogador", player.HoleCards, player.BetAmount, player.WonAmount, player.NetProfit, player.IsWinner);
        }
    }
}