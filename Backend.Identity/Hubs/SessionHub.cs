using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;

namespace Backend.Identity.Hubs;

[Authorize]
public class SessionHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier
                  ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            // Apenas entra no grupo silenciomante (perfeito para quando o servidor reinicia e auto-reconecta)
            var sessionGroup = $"lock_session_{userId}";
            await Groups.AddToGroupAsync(Context.ConnectionId, sessionGroup);
        }

        await base.OnConnectedAsync();
    }

    // 🔥 A NOVA MÁGICA: Esta função só é chamada quando você abre a página do zero ou faz login
    public async Task RegisterActiveSession()
    {
        var userId = Context.UserIdentifier
                  ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            var sessionGroup = $"lock_session_{userId}";
            // Manda expulsar todas as outras abas/aparelhos antigos
            await Clients.OthersInGroup(sessionGroup).SendAsync("ForceLogout");
        }
    }
}