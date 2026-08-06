using System.Text;
using Backend.Game.Data;
using Backend.Game.Hubs;
using Backend.Game.Services;
using Backend.Game.Workers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// 🔥 CORREÇÃO DE PERFORMANCE (ANTI-LAG) 🔥
// Força o servidor a manter 100 threads acordadas no mínimo. 
// Isso impede que o SignalR congele quando o banco de dados da DigitalOcean fica lento.
ThreadPool.SetMinThreads(100, 100);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR(); 
builder.Services.AddHostedService<BotManagerService>();

builder.Services.AddSingleton<GameManager>();
builder.Services.AddSingleton<Backend.Game.Messaging.IRabbitMqService, Backend.Game.Messaging.RabbitMqService>();

builder.Services.AddHostedService<Backend.Game.Workers.TableExpirationWorker>();
builder.Services.AddHostedService<Backend.Game.Workers.CrashRecoveryWorker>();

builder.Services.AddHttpClient<IWalletService, WalletService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["IdentityApiUrl"] ?? "http://localhost:5001");
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=db;Database=magic_game_db;Username=postgres;Password=suasenha";

// 🔥 O SEGREDO DA ESTABILIDADE COM A DIGITALOCEAN 🔥
// Retiramos o timeout mortal de 5 segundos. Ajustamos o Pool para aguentar o tráfego 
// do SignalR e não desconectar jogadores à toa.
var npgsqlBuilder = new Npgsql.NpgsqlConnectionStringBuilder(connectionString)
{
    Timeout = 30,           
    CommandTimeout = 30,    
    MaxPoolSize = 200,      
    MinPoolSize = 5,        
    ConnectionIdleLifetime = 300
};
connectionString = npgsqlBuilder.ConnectionString;

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptionsAction: npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5, 
            maxRetryDelay: TimeSpan.FromSeconds(5), 
            errorCodesToAdd: null);
    }));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVueFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "https://magic-casino.online",
                "https://www.magic-casino.online",
                "http://localhost",       
                "https://localhost",      
                "capacitor://localhost"   
            )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); 
    });
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? "UmaChaveSuperSecretaMuitoLongaParaOJWT123!";
var keyBytes = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ValidateIssuer = false,
            ValidateAudience = false
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/game"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowVueFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<GameHub>("/hubs/game");

app.Run();