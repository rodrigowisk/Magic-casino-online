using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Identity.Data;
using Backend.Identity.Models;
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

    [ApiKey]
    [HttpPost("deduct")]
    public async Task<IActionResult> DeductBuyIn([FromBody] WalletTransactionRequest request)
    {
        // 👇 A TRAVA DE SEGURANÇA FINAL
        if (request.Amount <= 0)
        {
            return BadRequest("Tentativa de manipulação: O valor da transação deve ser estritamente maior que zero.");
        }

        if (!Guid.TryParse(request.UserId, out var userGuid))
        {
            return BadRequest("ID de usuário inválido.");
        }

        // VERIFICAÇÃO DE IDEMPOTÊNCIA (Evita cobrança dupla)
        if (request.TransactionId != Guid.Empty)
        {
            var txExists = await _context.WalletTransactions.AnyAsync(t => t.TransactionId == request.TransactionId);
            if (txExists)
            {
                var currentUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userGuid);
                return Ok(new { Success = true, NewBalance = currentUser?.Balance ?? 0, Note = "Already processed" });
            }
        }

        int maxRetries = 3;
        for (int retry = 0; retry < maxRetries; retry++)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null) return NotFound("Usuário não encontrado.");

            if (user.Balance < request.Amount)
                return BadRequest("Saldo insuficiente.");

            decimal balanceBefore = user.Balance;
            user.Balance -= request.Amount;
            decimal balanceAfter = user.Balance;

            var transaction = new WalletTransaction
            {
                TransactionId = request.TransactionId == Guid.Empty ? null : request.TransactionId,
                UserId = userGuid,
                Operation = string.IsNullOrWhiteSpace(request.Operation) ? "BuyIn" : request.Operation,
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
                return Ok(new { Success = true, NewBalance = user.Balance });
            }
            catch (DbUpdateConcurrencyException)
            {
                _context.ChangeTracker.Clear();
            }
        }

        return StatusCode(500, "Erro de concorrência ao atualizar a carteira. Tente novamente.");
    }

    [ApiKey]
    [HttpPost("add")]
    public async Task<IActionResult> AddCashOut([FromBody] WalletTransactionRequest request)
    {
        // 👇 A TRAVA DE SEGURANÇA FINAL
        if (request.Amount <= 0)
        {
            return BadRequest("Tentativa de manipulação: O valor da transação deve ser estritamente maior que zero.");
        }

        if (!Guid.TryParse(request.UserId, out var userGuid))
        {
            return BadRequest("ID de usuário inválido.");
        }

        // VERIFICAÇÃO DE IDEMPOTÊNCIA (Evita crédito duplo)
        if (request.TransactionId != Guid.Empty)
        {
            var txExists = await _context.WalletTransactions.AnyAsync(t => t.TransactionId == request.TransactionId);
            if (txExists)
            {
                var currentUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userGuid);
                return Ok(new { Success = true, NewBalance = currentUser?.Balance ?? 0, Note = "Already processed" });
            }
        }

        int maxRetries = 3;
        for (int retry = 0; retry < maxRetries; retry++)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
            if (user == null) return NotFound("Usuário não encontrado.");

            decimal balanceBefore = user.Balance;
            user.Balance += request.Amount;
            decimal balanceAfter = user.Balance;

            var transaction = new WalletTransaction
            {
                TransactionId = request.TransactionId == Guid.Empty ? null : request.TransactionId,
                UserId = userGuid,
                Operation = string.IsNullOrWhiteSpace(request.Operation) ? "CashOut" : request.Operation,
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
                return Ok(new { Success = true, NewBalance = user.Balance });
            }
            catch (DbUpdateConcurrencyException)
            {
                _context.ChangeTracker.Clear();
            }
        }

        return StatusCode(500, "Erro de concorrência ao atualizar a carteira. Tente novamente.");
    }
}

public class WalletTransactionRequest
{
    public Guid TransactionId { get; set; } // O Game agora envia este ID
    public string UserId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string TableId { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty;
}