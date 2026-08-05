using Backend.Identity.Data;
using Backend.Identity.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System;
using System.Linq;
using System.Threading.Tasks;

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

public class BindAgentDto
{
    public string ReferralCode { get; set; } = string.Empty;
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

        // 🔥 MÁGICA AQUI: Buscamos os jogadores indicados (Agora com ID)
        var playersList = await _context.Users
            .Where(u => u.ReferredBy == agent.UserId)
            .Select(u => new
            {
                id = u.Id, // <- Necessário para o Vue exibir embaixo do nome
                username = u.Username,
                balance = u.Balance,
                commission = 0m // Lógica futura de comissões
            })
            .ToListAsync();

        // 🔥 NOVO: Busca os jogadores pendentes de aprovação
        var pendingList = await _context.PendingAgentRequests
            .Where(p => p.AgentId == agent.Id)
            .Join(_context.Users, p => p.UserId, u => u.Id, (p, u) => new
            {
                userId = u.Id,
                username = u.Username
            })
            .ToListAsync();

        // Busca o histórico real de transações do Agente
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
            PendingPlayers = pendingList, // <- Empacotamos os pendentes para o Vue
            History = historyList
        });
    }

    // =========================================================================================
    // 👇 NOVO: Endpoint para o jogador SOLICITAR VÍNCULO a um Agente
    // =========================================================================================
    [HttpPost("~/api/user/bind-agent")]
    public async Task<IActionResult> BindAgent([FromBody] BindAgentDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ReferralCode))
            return BadRequest(new { message = "O código de convite não pode estar vazio." });

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        // Busca o agente pelo código informado
        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.ReferralCode.ToLower() == request.ReferralCode.ToLower());

        if (agent == null)
            return NotFound(new { message = "Código de convite não encontrado. Verifique com seu Afiliado." });

        // Proteção 1: O jogador não pode usar o próprio código
        if (agent.UserId == userId)
            return BadRequest(new { message = "Você não pode vincular sua própria conta ao seu código." });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound(new { message = "Sua conta de jogador não foi encontrada." });

        // Proteção 2: O jogador já tem um agente vinculado?
        if (user.ReferredBy != null)
            return BadRequest(new { message = "Sua conta já está vinculada a um Clube VIP." });

        // Proteção 3: Já existe um pedido pendente?
        var existingRequest = await _context.PendingAgentRequests
            .FirstOrDefaultAsync(p => p.UserId == userId && p.AgentId == agent.Id);

        if (existingRequest != null)
            return BadRequest(new { message = "Você já enviou uma solicitação para este Agente. Aguarde a aprovação." });

        // Sucesso: Cria a solicitação pendente
        var pendingReq = new PendingAgentRequest
        {
            UserId = userId,
            AgentId = agent.Id
        };

        _context.PendingAgentRequests.Add(pendingReq);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Solicitação enviada! Aguarde o Agente aceitar seu convite." });
    }

    // =========================================================================================
    // 👇 NOVO: Endpoints para Aceitar ou Rejeitar a solicitação
    // =========================================================================================
    [HttpPost("accept-player/{playerId}")]
    public async Task<IActionResult> AcceptPlayer(Guid playerId)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid agentUserId)) return Unauthorized();

        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == agentUserId);
        if (agent == null) return Unauthorized();

        var pendingReq = await _context.PendingAgentRequests
            .FirstOrDefaultAsync(p => p.UserId == playerId && p.AgentId == agent.Id);

        if (pendingReq == null) return NotFound(new { message = "Solicitação não encontrada." });

        var player = await _context.Users.FirstOrDefaultAsync(u => u.Id == playerId);
        if (player != null)
        {
            player.ReferredBy = agent.UserId; // Aprova o vínculo
        }

        _context.PendingAgentRequests.Remove(pendingReq); // Remove da fila de pendentes
        await _context.SaveChangesAsync();

        return Ok(new { message = "Jogador aceito com sucesso!" });
    }

    [HttpPost("reject-player/{playerId}")]
    public async Task<IActionResult> RejectPlayer(Guid playerId)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid agentUserId)) return Unauthorized();

        var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == agentUserId);
        if (agent == null) return Unauthorized();

        var pendingReq = await _context.PendingAgentRequests
            .FirstOrDefaultAsync(p => p.UserId == playerId && p.AgentId == agent.Id);

        if (pendingReq != null)
        {
            _context.PendingAgentRequests.Remove(pendingReq); // Apenas remove da fila
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Solicitação rejeitada." });
    }

    // 4. Endpoint para RETIRAR CRÉDITO de um afiliado
    [HttpPost("withdraw-credit")]
    public async Task<IActionResult> WithdrawCredit([FromBody] SellCreditDto request)
    {
        if (request.Amount <= 0) return BadRequest(new { message = "O valor deve ser maior que zero." });

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        int maxRetries = 3;
        for (int retry = 0; retry < maxRetries; retry++)
        {
            var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == userId);
            if (agent == null) return NotFound(new { message = "Você não é um agente." });

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.UsernameToCredit);
            if (targetUser == null) return NotFound(new { message = "Usuário de destino não encontrado." });

            if (targetUser.Balance < request.Amount)
            {
                return BadRequest(new { message = "O jogador não possui saldo suficiente para esta retirada." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                decimal balanceBefore = targetUser.Balance;
                targetUser.Balance -= request.Amount;

                var playerTx = new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    UserId = targetUser.Id,
                    Operation = "AGENT_WITHDRAW",
                    Amount = -request.Amount,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = targetUser.Balance,
                    TableId = "CASH_WITHDRAW"
                };
                _context.WalletTransactions.Add(playerTx);

                agent.AgentBalance += request.Amount;

                _context.AgentWalletTransactions.Add(new AgentWalletTransaction
                {
                    AgentId = agent.Id,
                    Amount = request.Amount,
                    TransactionType = "CREDIT_WITHDRAW",
                    Description = $"{targetUser.Username}",
                    ReferenceId = playerTx.Id.ToString()
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Créditos retirados com sucesso!", newAgentBalance = agent.AgentBalance });
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                _context.ChangeTracker.Clear();

                if (retry == maxRetries - 1)
                {
                    return StatusCode(500, new { message = "Servidor muito ocupado. Transação não concluída, tente novamente." });
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Erro ao processar retirada.", error = ex.Message });
            }
        }

        return StatusCode(500, new { message = "Falha ao processar a transação após várias tentativas." });
    }

    // 3. Endpoint para VENDER CRÉDITO para um afiliado
    [HttpPost("sell-credit")]
    public async Task<IActionResult> SellCredit([FromBody] SellCreditDto request)
    {
        if (request.Amount <= 0) return BadRequest(new { message = "O valor deve ser maior que zero." });

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out Guid userId)) return Unauthorized();

        int maxRetries = 3;
        for (int retry = 0; retry < maxRetries; retry++)
        {
            var agent = await _context.Agents.FirstOrDefaultAsync(a => a.UserId == userId);
            if (agent == null) return NotFound(new { message = "Você não é um agente." });

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.UsernameToCredit);
            if (targetUser == null) return NotFound(new { message = "Usuário de destino não encontrado." });

            if (agent.AgentBalance < request.Amount)
            {
                return BadRequest(new { message = "Saldo de agente insuficiente para esta venda." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                agent.AgentBalance -= request.Amount;

                decimal balanceBefore = targetUser.Balance;
                targetUser.Balance += request.Amount;

                var playerTx = new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    UserId = targetUser.Id,
                    Operation = "AGENT_DEPOSIT",
                    Amount = request.Amount,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = targetUser.Balance,
                    TableId = "CASH_DEPOSIT"
                };
                _context.WalletTransactions.Add(playerTx);

                _context.AgentWalletTransactions.Add(new AgentWalletTransaction
                {
                    AgentId = agent.Id,
                    Amount = -request.Amount,
                    TransactionType = "CREDIT_SALE",
                    Description = $"{targetUser.Username}",
                    ReferenceId = playerTx.Id.ToString()
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Créditos transferidos com sucesso!", newAgentBalance = agent.AgentBalance });
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                _context.ChangeTracker.Clear();

                if (retry == maxRetries - 1)
                {
                    return StatusCode(500, new { message = "Servidor muito ocupado. Transação não concluída, tente novamente." });
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Erro ao processar venda.", error = ex.Message });
            }
        }

        return StatusCode(500, new { message = "Falha ao processar a transação após várias tentativas." });
    }
}