using System;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace Backend.Cacheta.Services;

public interface IWalletService
{
    Task<decimal> GetBalanceAsync(string userId);
    Task<(bool Success, decimal NewBalance)> DeductBuyInAsync(string userId, decimal amount, string tableId);
    Task<(bool Success, decimal NewBalance)> AddCashOutAsync(string userId, decimal amount, string tableId);
}

public class WalletService : IWalletService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public WalletService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration.GetValue<string>("InternalApiKey") ?? "";
    }

    public async Task<decimal> GetBalanceAsync(string userId)
    {
        try
        {
            var response = await _httpClient.GetFromJsonAsync<WalletBalanceResponse>($"/api/wallet/{userId}/balance");
            return response?.Balance ?? 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro ao buscar saldo do usuário {userId}: {ex.Message}");
            return 0;
        }
    }

    public async Task<(bool Success, decimal NewBalance)> DeductBuyInAsync(string userId, decimal amount, string tableId)
    {
        try
        {
            // Gera um ID único para esta tentativa de sentar na mesa
            var request = new
            {
                TransactionId = Guid.NewGuid(),
                UserId = userId,
                Amount = amount,
                TableId = tableId,
                Operation = "BuyIn"
            };

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/api/wallet/deduct")
            {
                Content = JsonContent.Create(request)
            };
            httpRequest.Headers.Add("X-Api-Key", _apiKey);

            var response = await _httpClient.SendAsync(httpRequest);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Falha ao debitar buy-in: {error}");
                return (false, 0);
            }

            var result = await response.Content.ReadFromJsonAsync<WalletTransactionResult>();
            return (true, result?.NewBalance ?? 0);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro de conexão ao debitar buy-in: {ex.Message}");
            return (false, 0);
        }
    }

    public async Task<(bool Success, decimal NewBalance)> AddCashOutAsync(string userId, decimal amount, string tableId)
    {
        try
        {
            // Gera um ID único para esta tentativa de levantar da mesa
            var request = new
            {
                TransactionId = Guid.NewGuid(),
                UserId = userId,
                Amount = amount,
                TableId = tableId,
                Operation = "CashOut"
            };

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/api/wallet/add")
            {
                Content = JsonContent.Create(request)
            };
            httpRequest.Headers.Add("X-Api-Key", _apiKey);

            var response = await _httpClient.SendAsync(httpRequest);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Falha ao creditar cash-out: {error}");
                return (false, 0);
            }

            var result = await response.Content.ReadFromJsonAsync<WalletTransactionResult>();
            return (true, result?.NewBalance ?? 0);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erro de conexão ao creditar cash-out: {ex.Message}");
            return (false, 0);
        }
    }
}

public class WalletBalanceResponse
{
    public decimal Balance { get; set; }
}

public class WalletTransactionResult
{
    public bool Success { get; set; }
    public decimal NewBalance { get; set; }
}