using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Backend.Identity.Security;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class ApiKeyAttribute : Attribute, IAsyncActionFilter
{
    private const string APIKEYNAME = "X-Api-Key";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // Verifica se a chave veio no cabeçalho
        if (!context.HttpContext.Request.Headers.TryGetValue(APIKEYNAME, out var extractedApiKey))
        {
            context.Result = new UnauthorizedObjectResult("API Key não fornecida.");
            return;
        }

        // Pega a chave verdadeira do appsettings.json
        var configuration = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var apiKey = configuration.GetValue<string>("InternalApiKey");

        // Compara as duas
        if (string.IsNullOrEmpty(apiKey) || !apiKey.Equals(extractedApiKey))
        {
            context.Result = new UnauthorizedObjectResult("API Key inválida.");
            return;
        }

        await next();
    }
}