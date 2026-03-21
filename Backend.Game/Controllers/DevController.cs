using Microsoft.AspNetCore.Mvc;
using Backend.Game.Services;
using System.Linq;
using System.Collections.Generic;

namespace Backend.Game.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DevController : ControllerBase
{
    private readonly GameManager _gameManager;

    public DevController(GameManager gameManager)
    {
        _gameManager = gameManager;
    }

    [HttpGet("table/{tableId}")]
    public IActionResult GetDevTableState(string tableId)
    {
        var table = _gameManager.GetOrCreateTable(tableId);
        var deck = _gameManager.GetDevTableDeck(tableId); // 👇 Esse método precisa existir no GameManager

        var devState = new
        {
            RemainingDeck = deck,
            Players = table.Players.Select(p => new
            {
                Seat = p.Seat,
                Cards = p.Cards
            })
        };

        return Ok(devState);
    }

    [HttpPost("table/{tableId}/set-vira")]
    public IActionResult SetVira(string tableId, [FromBody] SetViraRequest request)
    {
        var table = _gameManager.GetOrCreateTable(tableId);
        if (table == null) return NotFound("Mesa não encontrada.");

        // Impede que o frontend envie uma carta vazia e quebre o jogo
        if (string.IsNullOrEmpty(request.NewCenterCard))
            return BadRequest("Nova carta não pode ser nula.");

        bool sucesso = _gameManager.SwapViraDevMode(tableId, request.NewCenterCard, request.OldCenterCard, request.DeckIndex);

        if (!sucesso)
            return BadRequest("Não foi possível trocar a vira.");

        return Ok(new { success = true });
    }
}

// Classe DTO Corrigida
public class SetViraRequest
{
    // Fix: Inicializado como string vazia para evitar CS8618 e garantir que sempre venha preenchido
    public string NewCenterCard { get; set; } = string.Empty;

    // Fix: Aceita nulo caso não houvesse vira anterior
    public string? OldCenterCard { get; set; }

    public int DeckIndex { get; set; }
}