using Backend.Game.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Collections.Generic;
using System;
using System.Threading.Tasks;

namespace Backend.Game.Controllers;

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
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        
        // 👇 CORREÇÃO: Buscando 'ghp.player_name' diretamente do banco de dados
        command.CommandText = @"
            SELECT 
                gh.id::text as hand_id, 
                gh.ended_at, 
                array_to_string(gh.community_cards, ',') as center_card,
                ghp.player_id::text, 
                ghp.player_name, 
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

        var botNames = new Dictionary<string, string>
        {
            { "c06a602e-42e5-4ee7-9910-6ae45ba54357", "RUBENS" },
            { "b73dc8cb-a735-4eee-937a-732ea0197e23", "HELIO" },
            { "a350d702-a004-4dc1-85bb-2f9163ca30f7", "JUCA" },
            { "cf62683d-dab0-4c1f-979d-280468c60559", "JOSE321" }
        };

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            string centerCardsStr = reader.IsDBNull(2) ? "" : reader.GetString(2);
            string playerIdStr = reader.GetString(3);
            
            // Lendo o nome salvo no banco (Índice 4)
            string playerNameDb = reader.IsDBNull(4) ? "Jogador" : reader.GetString(4);
            string holeCardsStr = reader.IsDBNull(5) ? "" : reader.GetString(5);

            string finalName = string.IsNullOrWhiteSpace(playerNameDb) ? "Jogador" : playerNameDb;

            // Se for bot, sobrescrevemos por segurança
            if (botNames.TryGetValue(playerIdStr, out var botName))
            {
                finalName = botName; 
            }

            result.Add(new
            {
                id = reader.GetString(0),
                playedAt = reader.GetDateTime(1).ToString("o"),
                communityCard = string.IsNullOrEmpty(centerCardsStr) ? "" : centerCardsStr.Split(',')[0],
                playerId = playerIdStr,
                playerName = finalName,
                holeCards = string.IsNullOrEmpty(holeCardsStr) ? Array.Empty<string>() : holeCardsStr.Split(','),
                betAmount = reader.GetDecimal(6) // Índice corrigido para 6
            });
        }
        
        await connection.CloseAsync();
        return Ok(result);
    }
}