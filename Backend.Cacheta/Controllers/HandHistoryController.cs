using Backend.Cacheta.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Backend.Cacheta.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HandHistoryController : ControllerBase
{
    private readonly AppDbContext _context;

    public HandHistoryController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{tableId}")]
    public async Task<IActionResult> GetTableHistory(Guid tableId)
    {
        var result = new List<object>();

        var connection = _context.Database.GetDbConnection();
        await connection.OpenAsync(); // CORRIGIDO PARA OpenAsync

        using var command = connection.CreateCommand();
        // SQL BLINDADO: Usa array_to_string para o Postgres fazer o trabalho pesado
        // e entregar uma string limpa pro C#, evitando qualquer erro de conversão de tipo do Npgsql.
        command.CommandText = @"
            SELECT 
                gh.id::text as hand_id, 
                gh.ended_at, 
                array_to_string(gh.community_cards, ',') as center_card,
                ghp.player_id::text, 
                array_to_string(ghp.hole_cards, ',') as hole_cards, 
                ghp.bet_amount
            FROM public.game_hands gh
            INNER JOIN public.game_hand_players ghp ON gh.id = ghp.game_hand_id
            WHERE gh.game_table_id = @tableId
            ORDER BY gh.ended_at DESC
            LIMIT 100;";

        var param = command.CreateParameter();
        param.ParameterName = "@tableId";
        param.Value = tableId;
        command.Parameters.Add(param);

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            string centerCardsStr = reader.IsDBNull(2) ? "" : reader.GetString(2);
            string holeCardsStr = reader.IsDBNull(4) ? "" : reader.GetString(4);

            result.Add(new
            {
                id = reader.GetString(0),
                playedAt = reader.GetDateTime(1).ToString("o"),
                communityCard = string.IsNullOrEmpty(centerCardsStr) ? "" : centerCardsStr.Split(',')[0],
                playerId = reader.GetString(3),
                holeCards = string.IsNullOrEmpty(holeCardsStr) ? Array.Empty<string>() : holeCardsStr.Split(','),
                betAmount = reader.GetDecimal(5)
            });
        }

        await connection.CloseAsync(); // CORRIGIDO PARA CloseAsync

        return Ok(result);
    }
}