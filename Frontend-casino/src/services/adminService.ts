const API_URL = `${import.meta.env.VITE_API_BASE_URL}/admin`;
const BASE_URL = import.meta.env.VITE_API_BASE_URL; // Base principal da API

export const adminService = {
  async getDashboard() {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/dashboard`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erro ao carregar dados do admin.');
    return await response.json();
  },

  async getMembers() {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/members`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erro ao carregar lista de membros.');
    return await response.json();
  },

  async globalTransfer(username: string, amount: number, walletType: 'player' | 'agent' = 'player') {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ username, amount, walletType })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao transferir saldo.');
    }
    return await response.json();
  },

  async globalWithdraw(username: string, amount: number, walletType: 'player' | 'agent' = 'player') {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ username, amount, walletType })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao retirar saldo.');
    }
    return await response.json();
  },

  async banUser(username: string) {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/users/${username}/ban`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao alterar o estado do utilizador.');
    }
    return await response.json();
  },

  // 👇 NOVA FUNÇÃO: Busca as transações com URL dinâmica para produção 👇
  async getTransactions() {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${BASE_URL}/wallet/transactions`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erro ao carregar histórico de transações.');
    return await response.json();
  }
};