using Backend.Game.Data;
using Backend.Game.DTOs;
using Backend.Game.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Game.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TableController : ControllerBase
{
    private readonly AppDbContext _context;

    public TableController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetActiveTables()
    {
        var now = DateTime.UtcNow;

        var tables = await _context.GameTables
            // 👇 MÁGICA: Agora filtra também apenas as mesas do tipo "meinho" 👇
            .Where(t => t.IsActive && t.CreatedAt.AddHours(t.DurationHours) > now && t.GameType == "meinho")
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TableResponseDto
            {
                Id = t.Id,
                Name = t.Name,
                Ante = t.Ante,
                MaxPlayers = t.MaxPlayers,
                CurrentPlayers = t.CurrentPlayers,
                Rake = t.Rake,
                MinBuyIn = t.MinBuyIn,
                DurationHours = t.DurationHours,
                GameType = t.GameType, // 👇 Retorna o tipo de jogo para o frontend
                HasPassword = !string.IsNullOrEmpty(t.PasswordHash)
            })
            .ToListAsync();

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
            GameType = request.GameType, // 👇 NOVIDADE: Salva o tipo do jogo no banco
            CurrentPlayers = 0,
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.GameTables.Add(newTable);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Mesa criada com sucesso!", tableId = newTable.Id });
    }

    [HttpPost("{id}/validate-password")]
    public async Task<IActionResult> ValidatePassword(Guid id, [FromBody] ValidatePasswordDto request)
    {
        var table = await _context.GameTables.FindAsync(id);

        if (table == null)
            return NotFound(new { message = "Mesa não encontrada." });

        // 👇 Valida a expiração do tempo usando .AddHours() 👇
        if (!table.IsActive || table.CreatedAt.AddHours(table.DurationHours) <= DateTime.UtcNow)
            return BadRequest(new { message = "Esta mesa já foi encerrada pelo tempo." });

        if (string.IsNullOrEmpty(table.PasswordHash))
            return Ok(new { success = true });

        if (string.IsNullOrEmpty(request.Password) || !BCrypt.Net.BCrypt.Verify(request.Password, table.PasswordHash))
        {
            return Unauthorized(new { message = "Senha incorreta!" });
        }

        return Ok(new { success = true });
    }
}