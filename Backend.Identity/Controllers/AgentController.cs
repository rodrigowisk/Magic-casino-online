using Backend.Identity.Data;
using Backend.Identity.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Identity.Controllers;

public class BecomeAgentDto
{
    public string ReferralCode { get; set; } = string.Empty;
}

public class SellCreditDto
{
    public string UsernameToCredit { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

[ApiController]
[Route("api/[controller]")]
[Authorize] // Todos os métodos exigem estar logado
public class AgentController : ControllerBase
{
    private readonly AppDbContext _context;

    public AgentController(AppDbContext context)
    {
        _context = context;
    }

    // 1. Endpoint para o jogador se tornar um Agente
    [HttpPost("become")]
    public async Task<IActionResult> BecomeAgent([FromBody] BecomeAgentDto request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        // Verifica se o código de afiliado já existe
        if (await _context.Agents.AnyAsync(a => a.ReferralCode.ToLower() == request.ReferralCode.ToLower()))
        {
            return BadRequest(new { message = "Este código de indicação já está em uso. Escolha outro." });
        }

        // Verifica se ele já é agente
        if (await _context.Agents.AnyAsync(a => a.UserId == userId))
        {
            return BadRequest(new { message = "Você já possui uma conta de Agente." });
        }

        var agent = new Agent
        {
            UserId = userId,
            ReferralCode = request.ReferralCode.ToUpper(),
            AgentBalance = 0,
            CommissionRate = 10.00m // Exemplo: 10% padrão
        };

        _context.Agents.Add(agent);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Conta de Agente criada com sucesso!", code = agent.ReferralCode });
    }

    // 2. Endpoint para ver o painel do Agente
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == userId);
        if (agent == null) return NotFound(new { message = "Conta de agente não encontrada." });

        // 🔥 MÁGICA AQUI: Já buscamos os jogadores indicados diretamente nesta chamada!
        var playersList = await _context.Users
            .Where(u => u.ReferredBy == agent.UserId)
            .Select(u => new
            {
                username = u.Username,
                balance = u.Balance,
                commission = 0m // Lógica futura de comissões
            })
            .ToListAsync();

        // 🔥 NOVO: Busca o histórico real de transações do Agente 🔥
        var historyList = await _context.AgentWalletTransactions
            .Where(t => t.AgentId == agent.Id)
            .OrderByDescending(t => t.CreatedAt) // Mais recentes primeiro
            .Select(t => new
            {
                id = t.Id,
                date = t.CreatedAt,
                type = t.TransactionType,
                amount = t.Amount,
                description = t.Description
            })
            .ToListAsync();

        return Ok(new
        {
            ReferralCode = agent.ReferralCode,
            AgentBalance = agent.AgentBalance,
            CommissionRate = agent.CommissionRate,
            TotalReferrals = playersList.Count,
            Players = playersList,
            History = historyList // Empacotamos e enviamos tudo para o Vue!
        });
    }

    // 4. Endpoint para RETIRAR CRÉDITO de um afiliado
    [HttpPost("withdraw-credit")]
    public async Task<IActionResult> WithdrawCredit([FromBody] SellCreditDto request)
    {
        if (request.Amount <= 0) return BadRequest(new { message = "O valor deve ser maior que zero." });

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        // Encontra o Agente
        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == userId);
        if (agent == null) return NotFound(new { message = "Você não é um agente." });

        // Encontra o Jogador que vai ter o saldo retirado
        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.UsernameToCredit);
        if (targetUser == null) return NotFound(new { message = "Usuário de destino não encontrado." });

        // Verifica se o jogador tem saldo suficiente para a retirada
        if (targetUser.Balance < request.Amount)
        {
            return BadRequest(new { message = "O jogador não possui saldo suficiente para esta retirada." });
        }

        // 👇 INICIA A TRANSAÇÃO (Rollback de segurança)
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // 1. Tira da carteira do Jogador
            decimal balanceBefore = targetUser.Balance;
            targetUser.Balance -= request.Amount;

            // 2. Registra no extrato do Jogador (Negativo)
            _context.WalletTransactions.Add(new WalletTransaction
            {
                UserId = targetUser.Id,
                Operation = "AGENT_WITHDRAW",
                Amount = -request.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = targetUser.Balance,
                TableId = "CASH_WITHDRAW"
            });

            // 3. Adiciona de volta na carteira do Agente
            agent.AgentBalance += request.Amount;

            // 4. Registra o histórico do Agente (Positivo)
            _context.AgentWalletTransactions.Add(new AgentWalletTransaction
            {
                AgentId = agent.Id,
                Amount = request.Amount,
                TransactionType = "CREDIT_WITHDRAW",
                Description = $"{targetUser.Username}" // 🔥 Salvando só o NOME do jogador
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Créditos retirados com sucesso!", newAgentBalance = agent.AgentBalance });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Erro ao processar retirada.", error = ex.Message });
        }
    }


    // 3. Endpoint para VENDER CRÉDITO para um afiliado (Transferência segura)
    [HttpPost("sell-credit")]
    public async Task<IActionResult> SellCredit([FromBody] SellCreditDto request)
    {
        if (request.Amount <= 0) return BadRequest(new { message = "O valor deve ser maior que zero." });

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        // Encontra o Agente
        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == userId);
        if (agent == null) return NotFound(new { message = "Você não é um agente." });

        // Encontra o Jogador que vai receber
        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.UsernameToCredit);
        if (targetUser == null) return NotFound(new { message = "Usuário de destino não encontrado." });

        if (agent.AgentBalance < request.Amount)
        {
            return BadRequest(new { message = "Saldo de agente insuficiente para esta venda." });
        }

        // 👇 INICIA A TRANSAÇÃO: Se algo falhar no meio, ele cancela tudo (Rollback)
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // 1. Tira da carteira do Agente
            agent.AgentBalance -= request.Amount;

            // 2. Registra o histórico do Agente (Negativo)
            _context.AgentWalletTransactions.Add(new AgentWalletTransaction
            {
                AgentId = agent.Id,
                Amount = -request.Amount,
                TransactionType = "CREDIT_SALE",
                Description = $"{targetUser.Username}" // 🔥 Salvando só o NOME do jogador
            });

            // 3. Adiciona na carteira do Jogador
            decimal balanceBefore = targetUser.Balance;
            targetUser.Balance += request.Amount;

            // 4. Registra no extrato do Jogador (Positivo)
            _context.WalletTransactions.Add(new WalletTransaction
            {
                UserId = targetUser.Id,
                Operation = "AGENT_DEPOSIT",
                Amount = request.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = targetUser.Balance,
                TableId = "CASH_DEPOSIT"
            });

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Créditos transferidos com sucesso!", newAgentBalance = agent.AgentBalance });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Erro ao processar venda.", error = ex.Message });
        }
    }
}