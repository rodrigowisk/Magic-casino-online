using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Backend.Game.Services;

public interface IWalletService
{
    Task<decimal> GetBalanceAsync(string userId);
    Task<(bool Success, decimal NewBalance)> DeductBuyInAsync(string userId, decimal amount, string tableId, bool isDemo);
    Task<(bool Success, decimal NewBalance)> AddCashOutAsync(string userId, decimal amount, string tableId, bool isDemo);
    Task<Dictionary<string, decimal>> GetTableWalletFlowAsync(string tableId);
}

public class WalletService : IWalletService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<WalletService> _logger;
    private const int MaxRetries = 3;

    public WalletService(HttpClient httpClient, IConfiguration configuration, ILogger<WalletService> logger)
    {
        _httpClient = httpClient;
        _apiKey = configuration.GetValue<string>("InternalApiKey") ?? "";
        _logger = logger;
    }

    public async Task<decimal> GetBalanceAsync(string userId)
    {
        for (int i = 0; i < MaxRetries; i++)
        {
            try
            {
                var response = await _httpClient.GetFromJsonAsync<WalletBalanceResponse>($"/api/wallet/{userId}/balance");
                return response?.Balance ?? 0;
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Tentativa {i + 1}/{MaxRetries} - Erro ao buscar saldo do usuário {userId}: {ex.Message}");
                if (i == MaxRetries - 1) return 0;
                await Task.Delay((i + 1) * 500);
            }
        }
        return 0;
    }

    public async Task<Dictionary<string, decimal>> GetTableWalletFlowAsync(string tableId)
    {
        try
        {
            var response = await _httpClient.GetFromJsonAsync<Dictionary<string, decimal>>($"/api/wallet/table-flow/{tableId}");
            return response ?? new Dictionary<string, decimal>();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Erro ao buscar fluxo da carteira para a mesa {tableId}: {ex.Message}");
            return new Dictionary<string, decimal>();
        }
    }

    public async Task<(bool Success, decimal NewBalance)> DeductBuyInAsync(string userId, decimal amount, string tableId, bool isDemo)
    {
        var transactionId = Guid.NewGuid();
        var request = new { TransactionId = transactionId, UserId = userId, Amount = amount, TableId = tableId, Operation = "BuyIn", IsDemo = isDemo };

        for (int i = 0; i < MaxRetries; i++)
        {
            try
            {
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/api/wallet/deduct") { Content = JsonContent.Create(request) };
                httpRequest.Headers.Add("X-Api-Key", _apiKey);

                var response = await _httpClient.SendAsync(httpRequest);

                if (!response.IsSuccessStatusCode)
                {
                    if ((int)response.StatusCode >= 400 && (int)response.StatusCode < 500)
                    {
                        return (false, 0);
                    }
                }
                else
                {
                    var result = await response.Content.ReadFromJsonAsync<WalletTransactionResult>();
                    return (true, result?.NewBalance ?? 0);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Tentativa {i + 1}/{MaxRetries} - Erro de conexão ao deduzir buy-in (User: {userId}): {ex.Message}");
            }

            if (i < MaxRetries - 1)
            {
                await Task.Delay((i + 1) * 1000);
            }
        }

        _logger.LogCritical($"[CRÍTICO] BUY-IN FALHOU APÓS {MaxRetries} TENTATIVAS! User: {userId}, Amount: {amount}, Table: {tableId}, TransactionId: {transactionId}");
        return (false, 0);
    }

    public async Task<(bool Success, decimal NewBalance)> AddCashOutAsync(string userId, decimal amount, string tableId, bool isDemo)
    {
        var transactionId = Guid.NewGuid();
        var request = new { TransactionId = transactionId, UserId = userId, Amount = amount, TableId = tableId, Operation = "CashOut", IsDemo = isDemo };

        for (int i = 0; i < MaxRetries; i++)
        {
            try
            {
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/api/wallet/add") { Content = JsonContent.Create(request) };
                httpRequest.Headers.Add("X-Api-Key", _apiKey);

                var response = await _httpClient.SendAsync(httpRequest);

                if (!response.IsSuccessStatusCode)
                {
                    if ((int)response.StatusCode >= 400 && (int)response.StatusCode < 500)
                    {
                        return (false, 0);
                    }
                }
                else
                {
                    var result = await response.Content.ReadFromJsonAsync<WalletTransactionResult>();
                    return (true, result?.NewBalance ?? 0);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Tentativa {i + 1}/{MaxRetries} - Erro de conexão ao creditar cash-out (User: {userId}): {ex.Message}");
            }

            if (i < MaxRetries - 1)
            {
                await Task.Delay((i + 1) * 1000);
            }
        }

        _logger.LogCritical($"[CRÍTICO] CASH-OUT FALHOU APÓS {MaxRetries} TENTATIVAS! DINHEIRO NÃO DEVOLVIDO. User: {userId}, Amount: {amount}, Table: {tableId}, TransactionId: {transactionId}");
        return (false, 0);
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