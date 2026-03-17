using Backend.Identity.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Adicionar suporte a Controllers e Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. Configurar o Banco de Dados PostgreSQL (Identidade)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=db;Database=magic_identity_db;Username=postgres;Password=suasenha";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 3. CONFIGURAÇÃO DE CORS (Essencial para o Login funcionar na nuvem!)
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
    });

var app = builder.Build();

// Configurações do ambiente
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// 5. APLICAR O CORS (Deve vir antes da Autenticação)
app.UseCors("AllowVueFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();