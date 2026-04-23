using Backend.Identity.Data;
using Backend.Identity.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Identity.Controllers;

public class AdminTransferDto
{
    public string Username { get; set; } = string.Empty;
    public decimal Amount { get; set; }

    // 👇 NOVO: Recebe qual carteira deve ser operada ("player" ou "agent")
    public string WalletType { get; set; } = "player";
}

[ApiController]
[Route("api/[controller]")]
[Authorize] // Exige que esteja logado
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    // 1. ENDPOINT: Resumo Financeiro e de Membros
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalPlayerBalance = await _context.Users.SumAsync(u => u.Balance);
        var totalAgentBalance = await _context.Agents.SumAsync(a => a.AgentBalance);

        return Ok(new
        {
            TotalMembers = totalUsers,
            TotalChipsInMarket = totalPlayerBalance + totalAgentBalance,
            ClubProfit = 0 // O Rake precisará de uma query nas mesas futuramente
        });
    }

    // 2. ENDPOINT: Emitir Fichas (Caixa Central)
    [HttpPost("transfer")]
    public async Task<IActionResult> GlobalTransfer([FromBody] AdminTransferDto request)
    {
        if (request.Amount <= 0) return BadRequest(new { message = "O valor deve ser maior que zero." });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());
        if (user == null) return NotFound(new { message = "Usuário de destino não encontrado." });

        // 👇 MÁGICA: Decide qual carteira vai receber as fichas
        if (request.WalletType.ToLower() == "agent")
        {
            var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == user.Id);
            if (agent == null) return BadRequest(new { message = "Este usuário não é um Agente VIP." });

            decimal balanceBefore = agent.AgentBalance;
            agent.AgentBalance += request.Amount;

            _context.WalletTransactions.Add(new WalletTransaction
            {
                UserId = user.Id,
                Operation = "ADMIN_AGENT_DEPOSIT", // Deixa claro que foi pra carteira de Agente
                Amount = request.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = agent.AgentBalance,
                TableId = "SYSTEM_ADMIN"
            });
        }
        else
        {
            decimal balanceBefore = user.Balance;
            user.Balance += request.Amount;

            _context.WalletTransactions.Add(new WalletTransaction
            {
                UserId = user.Id,
                Operation = "ADMIN_DEPOSIT", // Carteira de Jogador comum
                Amount = request.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = user.Balance,
                TableId = "SYSTEM_ADMIN"
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"R$ {request.Amount} emitidos com sucesso!" });
    }

    // 3. ENDPOINT: Lista de Membros Recentes (Agora com DOIS saldos)
    [HttpGet("members")]
    public async Task<IActionResult> GetMembers()
    {
        var users = await _context.Users
            .OrderByDescending(u => u.CreatedAt)
            .Take(50)
            .Select(u => new {
                u.Id,
                u.Username,
                Balance = u.Balance, // Saldo de Jogador
                // 👇 NOVO: Traz também o saldo de agente se ele for um
                AgentBalance = _context.Agents.Where(a => a.UserId == u.Id).Select(a => a.AgentBalance).FirstOrDefault(),
                Avatar = u.Avatar,
                IsAgent = _context.Agents.Any(a => a.UserId == u.Id),
                u.CreatedAt
            }).ToListAsync();

        return Ok(users);
    }

    // 4. ENDPOINT: Recolher Fichas (Caixa Central)
    [HttpPost("withdraw")]
    public async Task<IActionResult> GlobalWithdraw([FromBody] AdminTransferDto request)
    {
        if (request.Amount <= 0) return BadRequest(new { message = "O valor deve ser maior que zero." });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());
        if (user == null) return NotFound(new { message = "Usuário de destino não encontrado." });

        // 👇 MÁGICA: Decide de qual carteira vai retirar
        if (request.WalletType.ToLower() == "agent")
        {
            var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == user.Id);
            if (agent == null) return BadRequest(new { message = "Este usuário não é um Agente VIP." });

            if (agent.AgentBalance < request.Amount)
                return BadRequest(new { message = "O agente não possui saldo suficiente para esta retirada." });

            decimal balanceBefore = agent.AgentBalance;
            agent.AgentBalance -= request.Amount;

            _context.WalletTransactions.Add(new WalletTransaction
            {
                UserId = user.Id,
                Operation = "ADMIN_AGENT_WITHDRAW",
                Amount = -request.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = agent.AgentBalance,
                TableId = "SYSTEM_ADMIN"
            });
        }
        else
        {
            if (user.Balance < request.Amount)
                return BadRequest(new { message = "O jogador não possui saldo suficiente para esta retirada." });

            decimal balanceBefore = user.Balance;
            user.Balance -= request.Amount;

            _context.WalletTransactions.Add(new WalletTransaction
            {
                UserId = user.Id,
                Operation = "ADMIN_WITHDRAW",
                Amount = -request.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = user.Balance,
                TableId = "SYSTEM_ADMIN"
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"R$ {request.Amount} recolhidos com sucesso!" });
    }
}