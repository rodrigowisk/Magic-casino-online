using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Identity.Data;
using Backend.Identity.Models;
using Microsoft.AspNetCore.Authorization;
using Backend.Identity.Security;

namespace Backend.Identity.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WalletController : ControllerBase
{
    private readonly AppDbContext _context;

    public WalletController(AppDbContext context)
    {
        _context = context;
    }

    // ==============================================================
    // 1. SALDO REAL (Usado pelas mesas VIP e Jogadores com Agente)
    // ==============================================================
    [HttpGet("{userId}/balance")]
    public async Task<IActionResult> GetBalance(string userId)
    {
        if (!Guid.TryParse(userId, out var userGuid))
        {
            return BadRequest("ID de usuário inválido.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
        if (user == null) return NotFound("Usuário não encontrado.");

        return Ok(new { Balance = user.Balance });
    }

    // ==============================================================
    // 2. SALDO DEMO (Usado pelo Lobby de Treinamento)
    // ==============================================================
    [HttpGet("{userId}/demo-balance")]
    public async Task<IActionResult> GetDemoBalance(string userId)
    {
        if (!Guid.TryParse(userId, out var userGuid))
        {
            return BadRequest("ID de usuário inválido.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
        if (user == null) return NotFound("Usuário não encontrado.");

        // Retorna o saldo demo_balance mapeado
        return Ok(new { Balance = user.DemoBalance });
    }

    [Authorize]
    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactionsHistory()
    {
        try
        {
            var result = new List<object>();
            var conn = _context.Database.GetDbConnection();
            await conn.OpenAsync();
            using var cmd = conn.CreateCommand();

            cmd.CommandText = @"
                SELECT 'Jogador' as wallet_type, u.username, w.operation, w.amount, w.createdat as tx_date
                FROM public.wallet_transactions w
                JOIN public.users u ON w.userid = u.id
                UNION ALL
                SELECT 'Agente' as wallet_type, u.username, aw.transaction_type, aw.amount, aw.created_at as tx_date
                FROM public.agent_wallet_transactions aw
                JOIN public.agents a ON aw.agent_id = a.id
                JOIN public.users u ON a.user_id = u.id
                ORDER BY tx_date DESC 
                LIMIT 1000;";

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                result.Add(new
                {
                    WalletType = reader.GetString(0),
                    Username = reader.GetString(1),
                    Operation = reader.GetString(2),
                    Amount = reader.GetDecimal(3),
                    CreatedAt = reader.GetDateTime(4).ToString("o")
                });
            }
            await conn.CloseAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Erro ao buscar extrato do banco de dados.", details = ex.Message });
        }
    }

    [HttpGet("table-flow/{tableId}")]
    public async Task<IActionResult> GetTableFlow(string tableId)
    {
        var result = new Dictionary<string, decimal>();
        var conn = _context.Database.GetDbConnection();
        await conn.OpenAsync();
        using var cmd = conn.CreateCommand();

        cmd.CommandText = @"
            SELECT userid::text, SUM(amount) * -1
            FROM public.wallet_transactions
            WHERE tableid = @tableId
            GROUP BY userid";

        var pTable = cmd.CreateParameter();
        pTable.ParameterName = "@tableId";
        pTable.Value = tableId;
        cmd.Parameters.Add(pTable);

        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            result[reader.GetString(0)] = reader.GetDecimal(1);
        }
        await conn.CloseAsync();
        return Ok(result);
    }

    [ApiKey]
    [HttpPost("deduct")]
    public async Task<IActionResult> DeductBuyIn([FromBody] WalletTransactionRequest request)
    {
        if (request.Amount <= 0)
        {
            return BadRequest("O valor deve ser maior que zero.");
        }

        if (!Guid.TryParse(request.UserId, out var userGuid))
        {
            return BadRequest("ID de usuário inválido.");
        }

        if (request.TransactionId != Guid.Empty)
        {
            var txExists = await _context.WalletTransactions.AnyAsync(t => t.TransactionId == request.TransactionId);
            if (txExists)
            {
                var currentUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userGuid);
                return Ok(new { Success = true, NewBalance = request.IsDemo ? currentUser?.DemoBalance : currentUser?.Balance, Note = "Already processed" });
            }
        }

        int maxRetries = 3;
        for (int retry = 0; retry < maxRetries; retry++)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null) return NotFound("Usuário não encontrado.");

            decimal balanceBefore = 0;
            decimal balanceAfter = 0;

            // 🔥 LOGICA DE SEPARAÇÃO: DEMO VS REAL 🔥
            if (request.IsDemo)
            {
                if (user.DemoBalance < request.Amount) return BadRequest("Saldo de Treino insuficiente.");
                balanceBefore = user.DemoBalance;
                user.DemoBalance -= request.Amount;
                balanceAfter = user.DemoBalance;
            }
            else
            {
                if (user.Balance < request.Amount) return BadRequest("Saldo insuficiente.");
                balanceBefore = user.Balance;
                user.Balance -= request.Amount;
                balanceAfter = user.Balance;
            }

            var transaction = new WalletTransaction
            {
                TransactionId = request.TransactionId == Guid.Empty ? null : request.TransactionId,
                UserId = userGuid,
                Operation = (string.IsNullOrWhiteSpace(request.Operation) ? "BuyIn" : request.Operation) + (request.IsDemo ? "_DEMO" : ""),
                Amount = -request.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = balanceAfter,
                TableId = request.TableId,
                CreatedAt = DateTime.UtcNow
            };

            _context.WalletTransactions.Add(transaction);

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { Success = true, NewBalance = balanceAfter });
            }
            catch (DbUpdateConcurrencyException)
            {
                _context.ChangeTracker.Clear();
            }
        }

        return StatusCode(500, "Erro de concorrência ao atualizar a carteira.");
    }

    [ApiKey]
    [HttpPost("add")]
    public async Task<IActionResult> AddCashOut([FromBody] WalletTransactionRequest request)
    {
        if (request.Amount <= 0)
        {
            return BadRequest("O valor deve ser maior que zero.");
        }

        if (!Guid.TryParse(request.UserId, out var userGuid))
        {
            return BadRequest("ID de usuário inválido.");
        }

        if (request.TransactionId != Guid.Empty)
        {
            var txExists = await _context.WalletTransactions.AnyAsync(t => t.TransactionId == request.TransactionId);
            if (txExists)
            {
                var currentUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userGuid);
                return Ok(new { Success = true, NewBalance = request.IsDemo ? currentUser?.DemoBalance : currentUser?.Balance, Note = "Already processed" });
            }
        }

        int maxRetries = 3;
        for (int retry = 0; retry < maxRetries; retry++)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null) return NotFound("Usuário não encontrado.");

            decimal balanceBefore = 0;
            decimal balanceAfter = 0;

            // 🔥 LOGICA DE SEPARAÇÃO: DEMO VS REAL 🔥
            if (request.IsDemo)
            {
                balanceBefore = user.DemoBalance;
                user.DemoBalance += request.Amount;
                balanceAfter = user.DemoBalance;
            }
            else
            {
                balanceBefore = user.Balance;
                user.Balance += request.Amount;
                balanceAfter = user.Balance;
            }

            var transaction = new WalletTransaction
            {
                TransactionId = request.TransactionId == Guid.Empty ? null : request.TransactionId,
                UserId = userGuid,
                Operation = (string.IsNullOrWhiteSpace(request.Operation) ? "CashOut" : request.Operation) + (request.IsDemo ? "_DEMO" : ""),
                Amount = request.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = balanceAfter,
                TableId = request.TableId,
                CreatedAt = DateTime.UtcNow
            };

            _context.WalletTransactions.Add(transaction);

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { Success = true, NewBalance = balanceAfter });
            }
            catch (DbUpdateConcurrencyException)
            {
                _context.ChangeTracker.Clear();
            }
        }

        return StatusCode(500, "Erro de concorrência ao atualizar a carteira.");
    }

    [ApiKey]
    [HttpPost("collect-table-rake")]
    public async Task<IActionResult> CollectTableRake([FromBody] CollectTableRakeRequest request)
    {
        if (request.Amount <= 0) return Ok(new { Success = true });

        var conn = _context.Database.GetDbConnection();
        await conn.OpenAsync();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE public.agents 
            SET agent_balance = agent_balance + @amount 
            WHERE id = (SELECT id FROM public.agents ORDER BY created_at ASC LIMIT 1) 
            RETURNING id;";

        var pAmount = cmd.CreateParameter();
        pAmount.ParameterName = "@amount";
        pAmount.Value = request.Amount;
        cmd.Parameters.Add(pAmount);

        var agentIdObj = await cmd.ExecuteScalarAsync();
        await conn.CloseAsync();

        if (agentIdObj == null || agentIdObj == DBNull.Value)
        {
            return BadRequest("Caixa Central (Agente Master) não encontrado no banco de dados.");
        }

        var masterAgentId = Guid.Parse(agentIdObj.ToString()!);

        var transaction = new AgentWalletTransaction
        {
            AgentId = masterAgentId,
            Amount = request.Amount,
            TransactionType = "RakeCollection",
            ReferenceId = request.TableId,
            Description = $"Rake automático da mesa {request.TableId}",
            CreatedAt = DateTime.UtcNow
        };

        _context.Set<AgentWalletTransaction>().Add(transaction);
        await _context.SaveChangesAsync();

        return Ok(new { Success = true });
    }
}

public class WalletTransactionRequest
{
    public Guid TransactionId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string TableId { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty;

    // 👇 NOVO CAMPO: Identifica se a transação é da carteira de treino 👇
    public bool IsDemo { get; set; } = false;
}

public class CollectTableRakeRequest
{
    public string TableId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}