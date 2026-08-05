using Backend.Identity.Data;
using Backend.Identity.DTOs;
using Backend.Identity.Models;
using Backend.Identity.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Backend.Identity.Controllers;

public class UpdateAvatarDto
{
    public string Avatar { get; set; } = string.Empty;
}

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IHubContext<SessionHub> _hubContext;

    public AuthController(AppDbContext context, IConfiguration configuration, IHubContext<SessionHub> hubContext)
    {
        _context = context;
        _configuration = configuration;
        _hubContext = hubContext;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto request)
    {
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower() || u.Username.ToLower() == request.Username.ToLower()))
        {
            return BadRequest(new { message = "Email ou Username já estão em uso." });
        }

        // Busca o agente caso o usuário tenha informado um código no cadastro
        Agent agentToBind = null;
        if (!string.IsNullOrWhiteSpace(request.ReferralCode))
        {
            agentToBind = await _context.Agents.FirstOrDefaultAsync(a => a.ReferralCode.ToLower() == request.ReferralCode.ToLower() && a.IsActive);
        }

        var newUserId = Guid.NewGuid();

        var user = new User
        {
            Id = newUserId,
            Username = request.Username,
            Email = request.Email,
            Phone = request.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Avatar = "default.webp",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true,
            ReferredBy = null // 🔥 CORREÇÃO: Não vincula automaticamente, ele nasce jogador comum!
        };

        _context.Users.Add(user);

        // 🔥 CORREÇÃO: Se ele usou um código de afiliado, joga para a fila de aprovação!
        if (agentToBind != null)
        {
            var pendingReq = new PendingAgentRequest
            {
                UserId = newUserId,
                AgentId = agentToBind.Id,
                CreatedAt = DateTime.UtcNow
            };
            _context.PendingAgentRequests.Add(pendingReq);
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Utilizador registado com sucesso!" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());

        if (user == null)
            return BadRequest(new { message = "Credenciais inválidas." });

        if (!user.IsActive)
            return BadRequest(new { message = "JOGADOR BANIDO: O acesso desta conta foi suspenso pela administração." });

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return BadRequest(new { message = "Credenciais inválidas." });

        user.SessionId = Guid.NewGuid();
        await _context.SaveChangesAsync();

        await _hubContext.Clients.Group(user.Id.ToString()).SendAsync("DisconnectOldSession", user.SessionId.ToString());

        var userRoleIds = await _context.UserRoles.Where(ur => ur.UserId == user.Id).Select(ur => ur.RoleId).ToListAsync();
        var userRoles = await _context.Roles.Where(r => userRoleIds.Contains(r.Id)).Select(r => r.Name).ToListAsync();

        bool isAgent = await _context.Agents.AnyAsync(a => a.UserId == user.Id);
        bool hasAgent = user.ReferredBy != null;

        if (isAgent && !userRoles.Any(r => r.Equals("Agent", StringComparison.OrdinalIgnoreCase)))
        {
            userRoles.Add("Agent");
        }

        return Ok(new
        {
            token = GenerateJwtToken(user, userRoles),
            username = user.Username,
            userId = user.Id,
            avatar = user.Avatar,
            balance = user.Balance,
            roles = userRoles,
            isAgent = isAgent,
            hasAgent = hasAgent
        });
    }

    [HttpGet("validate-session")]
    [Authorize]
    public async Task<IActionResult> ValidateSession()
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        var tokenSessionId = User.FindFirst("SessionId")?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
            return Unauthorized();

        var user = await _context.Users.FindAsync(userId);

        if (user == null || !user.IsActive || user.SessionId?.ToString() != tokenSessionId)
        {
            return Unauthorized(new { message = "Sessão expirada. Acesso feito em outro dispositivo." });
        }

        var userRoleIds = await _context.UserRoles.Where(ur => ur.UserId == user.Id).Select(ur => ur.RoleId).ToListAsync();
        var userRoles = await _context.Roles.Where(r => userRoleIds.Contains(r.Id)).Select(r => r.Name).ToListAsync();

        bool isAgent = await _context.Agents.AnyAsync(a => a.UserId == user.Id);
        bool hasAgent = user.ReferredBy != null;

        if (isAgent && !userRoles.Any(r => r.Equals("Agent", StringComparison.OrdinalIgnoreCase)))
        {
            userRoles.Add("Agent");
        }

        return Ok(new
        {
            valid = true,
            username = user.Username,
            userId = user.Id,
            avatar = user.Avatar,
            balance = user.Balance,
            roles = userRoles,
            isAgent = isAgent,
            hasAgent = hasAgent
        });
    }

    [HttpPut("avatar")]
    [Authorize]
    public async Task<IActionResult> UpdateAvatar([FromBody] UpdateAvatarDto request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
            return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "Usuário não encontrado." });

        user.Avatar = request.Avatar;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, avatar = user.Avatar });
    }

    private string GenerateJwtToken(User user, List<string> roles)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("username", user.Username),
            new Claim("avatar", user.Avatar),
            new Claim("SessionId", user.SessionId?.ToString() ?? string.Empty)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}