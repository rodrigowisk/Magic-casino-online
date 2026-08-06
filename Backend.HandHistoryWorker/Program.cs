using Backend.HandHistoryWorker;
using Backend.HandHistoryWorker.Data;
using Microsoft.EntityFrameworkCore;

// 🔥 Mesma correção de performance aplicada no Backend.Game: evita a fila de
// espera do .NET pra criar threads novas sob pico de carga. Aqui o impacto é
// menor (esse processo só consome uma fila), mas mantém o padrão.
ThreadPool.SetMinThreads(32, 32);

var builder = Host.CreateApplicationBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=db;Database=magic_game_db;Username=postgres;Password=suasenha";

// 🔥 Fail-fast + retry: esse worker pode esperar o banco voltar sem problema
// (a mensagem fica segura no RabbitMQ), mas cada TENTATIVA individual não
// deve travar por 30s+ — falha rápido e deixa o EnableRetryOnFailure cuidar
// de tentar de novo com backoff.
var npgsqlBuilder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString)
{
    Timeout = 5,
    CommandTimeout = 8
};
connectionString = npgsqlBuilder.ConnectionString;

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorCodesToAdd: null);
    }));

builder.Services.AddHostedService<Backend.HandHistoryWorker.HandHistoryWorker>();

var host = builder.Build();
host.Run();