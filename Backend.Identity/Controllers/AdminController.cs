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
}

[ApiController]
[Route("api/[controller]")]
[Authorize] // Exige que esteja logado (mais para frente podemos travar só para a Role "Admin")
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
        // Conta todos os usuários
        var totalUsers = await _context.Users.CountAsync();

        // Soma o saldo de todas as carteiras de jogadores
        var totalPlayerBalance = await _context.Users.SumAsync(u => u.Balance);

        // Soma o saldo de todas as carteiras de agentes
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

        // Encontra o usuário recebedor
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());
        if (user == null) return NotFound(new { message = "Usuário de destino não encontrado." });

        decimal balanceBefore = user.Balance;
        user.Balance += request.Amount;

        // Registra no extrato do jogador que foi um depósito do Admin
        _context.WalletTransactions.Add(new WalletTransaction
        {
            UserId = user.Id,
            Operation = "ADMIN_DEPOSIT",
            Amount = request.Amount,
            BalanceBefore = balanceBefore,
            BalanceAfter = user.Balance,
            TableId = "SYSTEM_ADMIN"
        });

        await _context.SaveChangesAsync();

        return Ok(new { message = $"R$ {request.Amount} depositados com sucesso na conta de {user.Username}!" });
    }

    // 3. ENDPOINT: Lista de Membros Recentes
    [HttpGet("members")]
    public async Task<IActionResult> GetMembers()
    {
        // Traz os 50 usuários mais recentes para popular a tabela
        var users = await _context.Users
            .OrderByDescending(u => u.CreatedAt)
            .Take(50)
            .Select(u => new {
                u.Id,
                u.Username,
                u.Balance,
                IsAgent = _context.Agents.Any(a => a.UserId == u.Id),
                u.CreatedAt
            }).ToListAsync();

        return Ok(users);
    }
}