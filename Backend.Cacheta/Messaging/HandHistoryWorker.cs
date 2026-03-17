using System.Text;
using System.Text.Json;
using Backend.Cacheta.Data;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Backend.Cacheta.Messaging;

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

        // Loop de resiliência: impede que a API "crashe" se o RabbitMQ demorar para ligar
        // ou tenta reconectar se a conexão cair no meio do funcionamento
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
                        Console.WriteLine($"Erro ao processar mão: {ex.Message}");
                        await channel.BasicNackAsync(ea.DeliveryTag, false, true);
                    }
                };

                await channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer);

                Console.WriteLine("RabbitMQ conectado com sucesso! Aguardando mãos...");

                // Se conectou com sucesso, mantém a thread rodando aguardando as mensagens
                // IMPORTANTE: Agora ele verifica se a conexão continua aberta. Se cair, ele sai do loop e tenta reconectar
                while (!stoppingToken.IsCancellationRequested && connection.IsOpen && channel.IsOpen)
                {
                    await Task.Delay(1000, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                // Se der erro ao conectar ou a conexão cair, espera 5 segundos e tenta de novo em vez de desligar a API
                Console.WriteLine($"RabbitMQ ainda não está pronto ou desconectou. Tentando reconectar em 5 segundos... Erro: {ex.Message}");
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
            VALUES ({0}, {1}, ARRAY[{2}]::varchar[], {3}, {4}, {5}, {6})";

        await dbContext.Database.ExecuteSqlRawAsync(sqlHand,
            handId, data.GameTableId, string.Join(",", data.CommunityCards), data.TotalPot, data.TotalRake, data.EndedAt.AddMinutes(-1), data.EndedAt);

        foreach (var player in data.Players)
        {
            var sqlPlayer = @"
                INSERT INTO public.game_hand_players (id, game_hand_id, player_id, hole_cards, bet_amount, won_amount, net_profit, is_winner)
                VALUES ({0}, {1}, {2}, ARRAY[{3}]::varchar[], {4}, {5}, {6}, {7})";

            await dbContext.Database.ExecuteSqlRawAsync(sqlPlayer,
                Guid.NewGuid(), handId, player.PlayerId, string.Join(",", player.HoleCards), player.BetAmount, player.WonAmount, player.NetProfit, player.IsWinner);
        }
    }
}