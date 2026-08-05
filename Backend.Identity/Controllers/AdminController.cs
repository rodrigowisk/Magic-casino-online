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

    // Recebe qual carteira deve ser operada ("player" ou "agent")
    public string WalletType { get; set; } = "player";
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var totalUsers = await _context.Users.IgnoreQueryFilters().CountAsync();
        var totalPlayerBalance = await _context.Users.IgnoreQueryFilters().SumAsync(u => u.Balance);
        var totalAgentBalance = await _context.Agents.SumAsync(a => a.AgentBalance);

        return Ok(new
        {
            TotalMembers = totalUsers,
            TotalChipsInMarket = totalPlayerBalance + totalAgentBalance,
            ClubProfit = 0
        });
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> GlobalTransfer([FromBody] AdminTransferDto request)
    {
        if (request.Amount <= 0) return BadRequest(new { message = "O valor deve ser maior que zero." });

        var user = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());
        if (user == null) return NotFound(new { message = "Usuário de destino não encontrado." });

        if (request.WalletType.ToLower() == "agent")
        {
            var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == user.Id);
            if (agent == null) return BadRequest(new { message = "Este usuário não é um Agente VIP." });

            decimal balanceBefore = agent.AgentBalance;
            agent.AgentBalance += request.Amount;

            _context.WalletTransactions.Add(new WalletTransaction
            {
                UserId = user.Id,
                Operation = "ADMIN_AGENT_DEPOSIT",
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
                Operation = "ADMIN_DEPOSIT",
                Amount = request.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = user.Balance,
                TableId = "SYSTEM_ADMIN"
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"{request.Amount} fichas emitidas com sucesso!" });
    }

    [HttpGet("members")]
    public async Task<IActionResult> GetMembers()
    {
        // Ignora os filtros para o Postgres não esconder contas e ordena alfabeticamente
        var users = await _context.Users
            .IgnoreQueryFilters()
            .OrderBy(u => u.Username)
            .Select(u => new {
                u.Id,
                u.Username,
                Balance = u.Balance,
                AgentBalance = _context.Agents.Where(a => a.UserId == u.Id).Select(a => a.AgentBalance).FirstOrDefault(),
                Avatar = u.Avatar,
                IsAgent = _context.Agents.Any(a => a.UserId == u.Id && a.IsActive),
                IsActive = u.IsActive,
                u.CreatedAt
            }).ToListAsync();

        return Ok(users);
    }

    [HttpPost("withdraw")]
    public async Task<IActionResult> GlobalWithdraw([FromBody] AdminTransferDto request)
    {
        if (request.Amount <= 0) return BadRequest(new { message = "O valor deve ser maior que zero." });

        var user = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());
        if (user == null) return NotFound(new { message = "Usuário de destino não encontrado." });

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
        return Ok(new { message = $"{request.Amount} fichas recolhidas com sucesso!" });
    }

    [HttpPost("users/{username}/ban")]
    public async Task<IActionResult> ToggleBanUser(string username)
    {
        var user = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Username == username);
        if (user == null) return NotFound(new { message = "Utilizador não encontrado." });

        user.IsActive = !user.IsActive;
        await _context.SaveChangesAsync();

        string status = user.IsActive ? "desbanido e reativado" : "banido";
        return Ok(new { message = $"O utilizador {username} foi {status} com sucesso!" });
    }

    [HttpGet("pending-affiliates")]
    public async Task<IActionResult> GetGlobalPendingAffiliates()
    {
        var pendingList = await _context.PendingAgentRequests
            .Join(_context.Users, p => p.UserId, u => u.Id, (p, u) => new { p, u })
            .Join(_context.Agents, pu => pu.p.AgentId, a => a.Id, (pu, a) => new { pu.p, pu.u, a })
            .Join(_context.Users, pua => pua.a.UserId, agentUser => agentUser.Id, (pua, agentUser) => new
            {
                userId = pua.u.Id,
                username = pua.u.Username,
                agentName = agentUser.Username
            })
            .ToListAsync();

        return Ok(pendingList);
    }

    [HttpPost("accept-player/{playerId}")]
    public async Task<IActionResult> GlobalAcceptPlayer(Guid playerId)
    {
        var pendingReq = await _context.PendingAgentRequests.FirstOrDefaultAsync(p => p.UserId == playerId);
        if (pendingReq == null) return NotFound(new { message = "Solicitação não encontrada no sistema." });

        var player = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == playerId);
        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.Id == pendingReq.AgentId);

        if (player != null && agent != null)
        {
            player.ReferredBy = agent.UserId;
        }

        _context.PendingAgentRequests.Remove(pendingReq);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Jogador aprovado pelo Diretor com sucesso!" });
    }

    [HttpPost("reject-player/{playerId}")]
    public async Task<IActionResult> GlobalRejectPlayer(Guid playerId)
    {
        var pendingReq = await _context.PendingAgentRequests.FirstOrDefaultAsync(p => p.UserId == playerId);

        if (pendingReq != null)
        {
            _context.PendingAgentRequests.Remove(pendingReq);
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Solicitação rejeitada pelo Diretor." });
    }

    [HttpPost("users/{username}/toggle-agent")]
    public async Task<IActionResult> ToggleAgentStatus(string username)
    {
        var user = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
        if (user == null) return NotFound(new { message = "Utilizador não encontrado." });

        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == user.Id);

        var isCurrentlyActiveAgent = agent != null && agent.IsActive;

        if (isCurrentlyActiveAgent)
        {
            agent!.IsActive = false;
            agent.UpdatedAt = DateTime.UtcNow;

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Agent");
            if (role != null)
            {
                var userRole = await _context.UserRoles.FirstOrDefaultAsync(ur => ur.UserId == user.Id && ur.RoleId == role.Id);
                if (userRole != null) _context.UserRoles.Remove(userRole);
            }

            var pendencies = await _context.PendingAgentRequests.Where(p => p.AgentId == agent.Id).ToListAsync();
            _context.PendingAgentRequests.RemoveRange(pendencies);

            var vinculados = await _context.Users.IgnoreQueryFilters().Where(u => u.ReferredBy == user.Id).ToListAsync();
            foreach (var v in vinculados) { v.ReferredBy = null; }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"O utilizador {username} foi rebaixado para Jogador Comum." });
        }
        else
        {
            if (agent == null)
            {
                var newReferralCode = user.Username.ToUpper() + new Random().Next(10, 99).ToString();

                var newAgent = new Agent
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    AgentBalance = 0,
                    CommissionRate = 10,
                    ReferralCode = newReferralCode,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Agents.Add(newAgent);
            }
            else
            {
                agent.IsActive = true;
                agent.UpdatedAt = DateTime.UtcNow;
            }

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Agent");
            if (role != null)
            {
                var exists = await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && ur.RoleId == role.Id);
                if (!exists) _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"O utilizador {username} foi promovido a Agente VIP com sucesso!" });
        }
    }
}