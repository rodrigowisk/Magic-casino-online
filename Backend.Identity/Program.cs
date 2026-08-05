using Backend.Identity.Data;
using Backend.Identity.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Adicionar suporte a Controllers, Swagger e SIGNALR
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR(); // Habilita o SignalR

// 2. Configurar o Banco de Dados PostgreSQL (Identidade)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=db;Database=magic_identity_db;Username=postgres;Password=suasenha";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 3. CONFIGURAÇÃO DE CORS
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
                "https://localhost",      // 👉 A MÁGICA ESTÁ AQUI (O que o seu app Android usa)
                "capacitor://localhost"   // 👉 Garantia para o iOS
            )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 4. Configurar JWT
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

        // 👇 CORREÇÃO: Adicionado o /api no caminho para o SignalR ler o Token JWT
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/api/hubs/session"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

var app = builder.Build();

// Configurações do ambiente
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection(); 

// 5. APLICAR O CORS (Antes da Autenticação)
app.UseCors("AllowVueFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// 👇 CORREÇÃO CRÍTICA AQUI: Mapeando com o /api para o front-end achar a porta correta 👇
app.MapHub<SessionHub>("/api/hubs/session");

app.Run();