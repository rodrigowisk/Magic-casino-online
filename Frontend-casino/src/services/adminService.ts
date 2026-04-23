const API_URL = `${import.meta.env.VITE_API_BASE_URL}/admin`;

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

  // 👇 AGORA ENVIAMOS O WALLET TYPE ('player' ou 'agent') 👇
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

  // 👇 NOVA FUNÇÃO DE RECOLHIMENTO DIRETO NO SERVICE 👇
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
  }
};