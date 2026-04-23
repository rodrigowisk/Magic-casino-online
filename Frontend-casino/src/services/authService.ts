// Puxa a URL dinâmica do arquivo .env usando o padrão do Vite
const API_URL = `${import.meta.env.VITE_API_BASE_URL}/auth`;

export const authService = {
  // 👇 NOVO: Adicionado o referralCode opcional na assinatura e no body
  async register(username: string, email: string, password: string, phone: string, referralCode?: string) {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password, phone, referralCode })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao registrar usuário.');
    }

    return await response.json();
  },

  async login(username: string, password: string) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao fazer login. Verifique suas credenciais.');
    }

    const data = await response.json();
    
    // Salva o Token, Username E o USERID no localStorage
    localStorage.setItem('magic_token', data.token);
    localStorage.setItem('magic_username', data.username);
    
    // Salva o avatar que veio do banco
    if (data.avatar) {
      localStorage.setItem('magic_avatar', data.avatar);
    }
    
    // Tenta pegar como userId ou id (depende de como seu C# envia o AuthResponse)
    const returnedId = data.userId || data.id; 
    if (returnedId) {
       localStorage.setItem('magic_userid', returnedId);
    }

    // 👇 NOVO: Salva as Roles (Permissões) centralizadas aqui no Service
    if (data.roles) {
      localStorage.setItem('magic_roles', JSON.stringify(data.roles));
    } else {
      localStorage.setItem('magic_roles', JSON.stringify([]));
    }
    
    return data;
  },

  logout() {
    localStorage.removeItem('magic_token');
    localStorage.removeItem('magic_username');
    localStorage.removeItem('magic_userid');
    localStorage.removeItem('magic_avatar'); // Limpa o avatar no logout
    // 👇 NOVO E CRÍTICO: Limpa as permissões no logout para não vazar acesso!
    localStorage.removeItem('magic_roles'); 
  },

  isAuthenticated() {
    return !!localStorage.getItem('magic_token');
  },

  getToken() {
    return localStorage.getItem('magic_token');
  },

  getUsername() {
    return localStorage.getItem('magic_username');
  },

  getUserId() {
    return localStorage.getItem('magic_userid');
  },

  // Getter para o avatar
  getAvatar() {
    return localStorage.getItem('magic_avatar') || 'default.webp';
  },

  // 👇 NOVOS GETTERS PARA FACILITAR A VIDA NO FRONTEND 👇
  getRoles() {
    const rolesStr = localStorage.getItem('magic_roles');
    return rolesStr ? JSON.parse(rolesStr) : [];
  },

  isAdmin() {
    const roles = this.getRoles();
    return roles.includes('Owner') || roles.includes('Admin');
  }
};