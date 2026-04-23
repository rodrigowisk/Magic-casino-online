using Backend.Game.Data;
using Backend.Game.DTOs;
using Backend.Game.Models;
using Backend.Game.Services; // 👇 IMPORTANTE: Adicionado para usar o GameManager
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
    private readonly GameManager _gameManager; // 👇 NOVO: Injetando o GameManager

    public TableController(AppDbContext context, GameManager gameManager) // 👇 NOVO: Construtor atualizado
    {
        _context = context;
        _gameManager = gameManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetActiveTables()
    {
        var now = DateTime.UtcNow;

        // 1. Busca as mesas ativas do banco de dados primeiro
        var tablesDb = await _context.GameTables
            // 👇 MÁGICA: Agora filtra também apenas as mesas do tipo "meinho" 👇
            .Where(t => t.IsActive && t.CreatedAt.AddHours(t.DurationHours) > now && t.GameType == "meinho")
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(); // Traz para a memória do servidor

        // 2. Mapeia para o DTO pegando a contagem REAL da memória do SignalR
        var tables = tablesDb.Select(t => new TableResponseDto
        {
            Id = t.Id,
            Name = t.Name,
            Ante = t.Ante,
            MaxPlayers = t.MaxPlayers,
            // 👇 A MÁGICA ACONTECE AQUI: Consulta a memória viva (RAM) do GameManager!
            CurrentPlayers = _gameManager.GetSeatedPlayerCount(t.Id.ToString()),
            Rake = t.Rake,
            MinBuyIn = t.MinBuyIn,
            DurationHours = t.DurationHours,
            GameType = t.GameType, // 👇 Retorna o tipo de jogo para o frontend
            HasPassword = !string.IsNullOrEmpty(t.PasswordHash),
            CoverImage = t.CoverImage // 👇 NOVIDADE: Retorna a imagem da capa para o frontend mostrar no Lobby
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
            GameType = request.GameType, // 👇 NOVIDADE: Salva o tipo do jogo no banco
            CoverImage = request.CoverImage, // 👇 NOVIDADE: Salva a capa selecionada no banco de dados
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

        // 👇 CORREÇÃO CRÍTICA AQUI 👇
        // Trocamos o 'Unauthorized' (401) por 'BadRequest' (400) para não deslogar o usuário!
        if (string.IsNullOrEmpty(request.Password) || !BCrypt.Net.BCrypt.Verify(request.Password, table.PasswordHash))
        {
            return BadRequest(new { message = "Senha incorreta!" });
        }

        return Ok(new { success = true });
    }
}