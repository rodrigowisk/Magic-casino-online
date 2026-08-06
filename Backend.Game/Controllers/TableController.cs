using Backend.Game.Data;
using Backend.Game.DTOs;
using Backend.Game.Models;
using Backend.Game.Services;
using Backend.Game.Messaging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Backend.Game.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TableController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly GameManager _gameManager;
    private readonly IRabbitMqService _rabbitMqService;

    public TableController(AppDbContext context, GameManager gameManager, IRabbitMqService rabbitMqService)
    {
        _context = context;
        _gameManager = gameManager;
        _rabbitMqService = rabbitMqService;
    }

[HttpGet]
public async Task<IActionResult> GetActiveTables()
{
    var now = DateTime.UtcNow;

    // 1. Busca APENAS as mesas ativas e do tipo meinho (O banco usa índices aqui, é instantâneo)
    var activeTablesDb = await _context.GameTables
        .Where(t => t.IsActive && t.GameType == "meinho")
        .OrderByDescending(t => t.CreatedAt)
        .ToListAsync();

    // 2. Filtra o tempo de expiração na memória (C#), aliviando o banco
    var tablesDb = activeTablesDb
        .Where(t => t.CreatedAt.AddHours(t.DurationHours) > now)
        .ToList();

    var tables = tablesDb.Select(t => new TableResponseDto
    {
        Id = t.Id,
        Name = t.Name,
        Ante = t.Ante,
        MaxPlayers = t.MaxPlayers,
        CurrentPlayers = _gameManager.GetSeatedPlayerCount(t.Id.ToString()),
        Rake = t.Rake,
        MinBuyIn = t.MinBuyIn,
        DurationHours = t.DurationHours,
        GameType = t.GameType,
        HasPassword = !string.IsNullOrEmpty(t.PasswordHash),
        CoverImage = t.CoverImage,
        IsDemo = t.IsDemo
    }).ToList();

    return Ok(tables);
}

    [HttpPost]
    public async Task<IActionResult> CreateTable([FromBody] CreateTableDto request)
    {
        string? passwordHash = null;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        var newTable = new GameTable
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Ante = request.Ante,
            MaxPlayers = request.MaxPlayers,
            Rake = request.Rake,
            MinBuyIn = request.MinBuyIn,
            DurationHours = request.DurationHours,
            GameType = request.GameType,
            CoverImage = request.CoverImage,
            CurrentPlayers = 0,
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            IsDemo = false
        };

        _context.GameTables.Add(newTable);
        await _context.SaveChangesAsync();

        // Agenda o encerramento da mesa no RabbitMQ
        await _rabbitMqService.PublishTableExpirationAsync(newTable.Id, newTable.DurationHours);

        return Ok(new { message = "Mesa criada com sucesso!", tableId = newTable.Id });
    }

    [HttpPost("{id}/validate-password")]
    public async Task<IActionResult> ValidatePassword(Guid id, [FromBody] ValidatePasswordDto request)
    {
        var table = await _context.GameTables.FindAsync(id);

        if (table == null)
            return NotFound(new { message = "Mesa não encontrada." });

        if (!table.IsActive || table.CreatedAt.AddHours(table.DurationHours) <= DateTime.UtcNow)
            return BadRequest(new { message = "Esta mesa já foi encerrada pelo tempo." });

        if (string.IsNullOrEmpty(table.PasswordHash))
            return Ok(new { success = true });

        if (string.IsNullOrEmpty(request.Password) || !BCrypt.Net.BCrypt.Verify(request.Password, table.PasswordHash))
        {
            return BadRequest(new { message = "Senha incorreta!" });
        }

        return Ok(new { success = true });
    }

    [HttpGet("report/dashboard")]
    public async Task<IActionResult> GetDashboardSummary()
    {
        try
        {
            var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            command.CommandText = @"
                SELECT COALESCE(SUM(h.total_rake), 0) 
                FROM public.game_hands h
                INNER JOIN public.game_tables t ON h.game_table_id = t.id
                WHERE t.is_demo = false OR t.is_demo IS NULL;";

            var totalRake = (decimal)(await command.ExecuteScalarAsync() ?? 0m);
            await connection.CloseAsync();

            return Ok(new { ClubProfit = totalRake });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERRO REPORT DASHBOARD] {ex.Message}");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("report/tables")]
    public async Task<IActionResult> GetTablesReport()
    {
        try
        {
            var result = new List<object>();
            var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            command.CommandText = @"
                SELECT 
                    t.id::text, 
                    t.name, 
                    t.createdat, 
                    t.isactive,
                    t.game_type,
                    COALESCE(SUM(h.total_rake), 0) as rake_gerado
                FROM public.game_tables t
                LEFT JOIN public.game_hands h ON t.id = h.game_table_id
                WHERE t.is_demo = false OR t.is_demo IS NULL
                GROUP BY t.id, t.name, t.createdat, t.isactive, t.game_type
                ORDER BY t.createdat DESC;";

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.Add(new
                {
                    TableId = reader.GetString(0),
                    Name = reader.GetString(1),
                    CreatedAt = reader.GetDateTime(2).ToString("o"),
                    IsActive = reader.GetBoolean(3),
                    GameType = reader.GetString(4),
                    RakeGerado = reader.GetDecimal(5)
                });
            }
            await connection.CloseAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERRO REPORT TABLES] {ex.Message}");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("report/tables/{tableId}/players")]
    public async Task<IActionResult> GetTablePlayerRake(Guid tableId)
    {
        try
        {
            var result = new List<object>();
            var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            command.CommandText = @"
                SELECT 
                    p.player_id::text, 
                    COALESCE(SUM(h.total_rake), 0) as rake_pago
                FROM public.game_hands h
                INNER JOIN public.game_hand_players p ON h.id = p.game_hand_id
                WHERE h.game_table_id = @tableId AND p.is_winner = true
                GROUP BY p.player_id
                ORDER BY rake_pago DESC;";

            var param = command.CreateParameter();
            param.ParameterName = "@tableId";
            param.Value = tableId;
            command.Parameters.Add(param);

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.Add(new
                {
                    PlayerId = reader.GetString(0),
                    RakePago = reader.GetDecimal(1)
                });
            }
            await connection.CloseAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERRO REPORT PLAYERS] {ex.Message}");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("report/all-players-rake")]
    public async Task<IActionResult> GetAllPlayersRake()
    {
        try
        {
            var result = new List<object>();
            var connection = _context.Database.GetDbConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            command.CommandText = @"
                SELECT 
                    p.player_id::text, 
                    COALESCE(SUM(h.total_rake), 0) as rake_pago
                FROM public.game_hands h
                INNER JOIN public.game_hand_players p ON h.id = p.game_hand_id
                INNER JOIN public.game_tables t ON h.game_table_id = t.id
                WHERE p.is_winner = true AND (t.is_demo = false OR t.is_demo IS NULL)
                GROUP BY p.player_id;";

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.Add(new
                {
                    PlayerId = reader.GetString(0),
                    RakePago = reader.GetDecimal(1)
                });
            }
            await connection.CloseAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERRO REPORT ALL PLAYERS] {ex.Message}");
            return BadRequest(new { error = ex.Message });
        }
    }
}