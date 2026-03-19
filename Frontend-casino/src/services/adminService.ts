const API_URL = `${import.meta.env.VITE_API_BASE_URL}/admin`;

export const adminService = {
  // 1. Busca os totais do Dashboard
  async getDashboard() {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Erro ao carregar dados do admin.');
    return await response.json();
  },

  // 2. Busca a lista de membros
  async getMembers() {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/members`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Erro ao carregar lista de membros.');
    return await response.json();
  },

  // 3. Envia saldo (Mint) para qualquer usuário
  async globalTransfer(username: string, amount: number) {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${API_URL}/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, amount })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao transferir saldo.');
    }
    return await response.json();
  }
};