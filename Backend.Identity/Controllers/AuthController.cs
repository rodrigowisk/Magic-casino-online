using Backend.Identity.Data;
using Backend.Identity.DTOs;
using Backend.Identity.Models;
using Microsoft.AspNetCore.Authorization; // 👇 Importação Necessária
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Identity.Controllers;

// 👇 DTO Auxiliar para receber apenas a string do novo Avatar
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

    public AuthController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email || u.Username == request.Username))
        {
            return BadRequest(new { message = "Email ou Username já estão em uso." });
        }

        string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            Phone = request.Phone,
            PasswordHash = passwordHash,
            Avatar = "default.webp", // Define o avatar padrão ao criar a conta
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Utilizador registado com sucesso!" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Credenciais inválidas." });
        }

        if (!user.IsActive) return Forbid();

        var token = GenerateJwtToken(user);

        return Ok(new
        {
            token,
            username = user.Username,
            userId = user.Id, 
            avatar = user.Avatar
        });
    }

    // 👇 NOVO ENDPOINT: Atualiza o Avatar no Banco de Dados 👇
    [HttpPut("avatar")]
    [Authorize] // Exige que o usuário passe o JWT no Header
    public async Task<IActionResult> UpdateAvatar([FromBody] UpdateAvatarDto request)
    {
        // Pega o ID do usuário diretamente do Token JWT
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

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("username", user.Username),
            new Claim("avatar", user.Avatar)
        };

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