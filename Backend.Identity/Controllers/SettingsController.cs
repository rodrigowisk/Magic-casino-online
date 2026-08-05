using Backend.Identity.Data;
using Backend.Identity.Models;
using Backend.Identity.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Backend.Identity.Controllers;

public class GameSettingsDto
{
    public bool Meinho { get; set; }
    public bool Cacheta { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<SessionHub> _hubContext;

    public SettingsController(AppDbContext context, IHubContext<SessionHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    // GET PÚBLICO: O Lobby e o Front chamam para saber o que está ativo
    [HttpGet("games")]
    public async Task<IActionResult> GetGameSettings()
    {
        var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "ActiveGames");
        if (setting == null)
        {
            // Se a tabela estiver vazia, o padrão é Meinho Ligado e Cacheta Desligada
            return Ok(new { meinho = true, cacheta = false });
        }

        return Content(setting.Value, "application/json");
    }

    // POST PROTEGIDO: Só o ADMIN ou OWNER consegue salvar e ligar/desligar jogos
    [HttpPost("games")]
    [Authorize(Roles = "Admin,Owner")]
    public async Task<IActionResult> UpdateGameSettings([FromBody] GameSettingsDto request)
    {
        var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "ActiveGames");
        var jsonValue = JsonSerializer.Serialize(request);

        if (setting == null)
        {
            setting = new SystemSetting { Key = "ActiveGames", Value = jsonValue };
            _context.SystemSettings.Add(setting);
        }
        else
        {
            setting.Value = jsonValue;
            setting.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // 🔥 A MAGIA DO SIGNALR: Grita para TODOS os jogadores logados atualizarem as telas!
        await _hubContext.Clients.All.SendAsync("GameSettingsUpdated", request);

        return Ok(new { message = "Configurações de jogos atualizadas com sucesso!" });
    }
}