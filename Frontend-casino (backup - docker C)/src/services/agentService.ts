const API_URL = `${import.meta.env.VITE_API_BASE_URL}/agent`;

export const agentService = {
  // 1. O jogador escolhe o código e vira agente
  async becomeAgent(referralCode: string) {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/become`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ referralCode })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao criar conta de agente.');
    }
    return await response.json();
  },

  // 2. Busca os dados do painel (saldo, total de indicados, etc)
  async getDashboard() {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Retorna nulo se ele ainda não for agente
      }
      throw new Error('Erro ao carregar o painel.');
    }
    return await response.json();
  },

  
  // 3. Vende créditos para a carteira de um jogador
  async sellCredit(usernameToCredit: string, amount: number) {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/sell-credit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ usernameToCredit, amount })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao transferir créditos.');
    }
    return await response.json();
  },

  async withdrawCredit(usernameToCredit: string, amount: number) {
    const token = localStorage.getItem('magic_token');
    const IDENTITY_API_URL = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';

    const response = await fetch(`${IDENTITY_API_URL}/api/agent/withdraw-credit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ usernameToCredit, amount })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao realizar a retirada.');
    }

    return await response.json();
  }

};