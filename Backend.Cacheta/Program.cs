using Backend.Cacheta.Data;
using Backend.Cacheta.Hubs;
using Backend.Cacheta.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Adicionar suporte a Controllers, Swagger e SignalR
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR(); // O MOTOR EM TEMPO REAL ESTÁ LIGADO AQUI!

// 2. Adicionar o Gerenciador de Mesas (Singleton: mantém as mesas ativas na memória do servidor)
builder.Services.AddSingleton<GameManager>();

// ---> INTEGRAÇÃO RABBITMQ (Adaptado para Cacheta) <---
builder.Services.AddSingleton<Backend.Cacheta.Messaging.IRabbitMqService, Backend.Cacheta.Messaging.RabbitMqService>();
builder.Services.AddHostedService<Backend.Cacheta.Messaging.HandHistoryWorker>();

// ---> INTEGRAÇÃO WALLET SERVICE (CARTEIRA) <---
// Registra o WalletService e configura o endereço base da API do Identity
// O Docker usará a variável de ambiente IdentityApiUrl, ou usará localhost por padrão em dev.
builder.Services.AddHttpClient<IWalletService, WalletService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["IdentityApiUrl"] ?? "http://localhost:5001");
});

// 3. Configurar o Banco de Dados PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=db;Database=magic_game_db;Username=postgres;Password=suasenha";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 4. Configurar a Política de CORS (AGORA COM O SEU DOMÍNIO LIBERADO)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVueFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "https://magic-casino.online",
                "https://www.magic-casino.online"
            )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Extremamente importante para o SignalR funcionar!
    });
});

// 5. Configurar Autenticação JWT com suporte a WebSockets (SignalR)
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

        // EVENTO ESSENCIAL PARA O SIGNALR LER O TOKEN JWT NA URL
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                // 👇 ROTA EXCLUSIVA DA CACHETA 👇
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/cacheta"))
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

app.UseHttpsRedirection();
app.UseCors("AllowVueFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
// 6. Mapear o túnel WebSocket exclusivo da Cacheta
app.MapHub<GameHub>("/hubs/cacheta");

app.Run();