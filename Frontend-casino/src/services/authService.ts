import * as signalR from '@microsoft/signalr';
import { ref } from 'vue';

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/auth`;
const HUB_URL = `${import.meta.env.VITE_API_BASE_URL}/hubs/session`;

let sessionConnection: signalR.HubConnection | null = null;

// 🔥 CADEADO DE SEGURANÇA: Evita que o Vue.js abra duas conexões ao mesmo tempo
let isConnecting = false;

export const showSessionModal = ref(false); 

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const authService = {
  async register(username: string, email: string, password: string, phone: string, referralCode?: string) {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, phone, referralCode })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Erro ao registrar usuário.');
    return data;
  },

  async login(username: string, password: string) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao fazer login. Verifique suas credenciais.');
    }

    localStorage.setItem('magic_token', data.token);
    localStorage.setItem('magic_username', data.username);
    
    const saldo = data.balance !== undefined ? data.balance : 0;
    localStorage.setItem('magic_balance', saldo.toString());

    if (data.avatar) {
      localStorage.setItem('magic_avatar', data.avatar);
    }
    
    const returnedId = data.userId || data.id; 
    if (returnedId) {
       localStorage.setItem('magic_userid', returnedId);
    }

    if (data.roles) {
      localStorage.setItem('magic_roles', JSON.stringify(data.roles));
    } else {
      localStorage.setItem('magic_roles', JSON.stringify([]));
    }

    // 🔥 CORREÇÃO DA MÁGICA: Se ele for aprovado (hasAgent: true), limpamos o Pendente
    if (data.hasAgent) {
      localStorage.setItem('magic_has_agent', 'true'); 
      localStorage.removeItem('magic_pending_agent'); // Tira o aviso ⏳
      localStorage.setItem('magic_lobby_mode', 'VIP'); 
      window.dispatchEvent(new Event('lobby-mode-changed'));
    } else {
      localStorage.removeItem('magic_has_agent'); 
    }
    
    this.startSessionHub();
    
    return data;
  },

  async validateSession() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/validate-session`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const data = await response.json();
      
      // Auto-desbloqueio VIP caso o agente tenha aceitado ele enquanto ele estava offline/ativo
      if (data.hasAgent) {
        localStorage.setItem('magic_has_agent', 'true');
        localStorage.removeItem('magic_pending_agent'); // Tira o aviso ⏳
        localStorage.setItem('magic_lobby_mode', 'VIP');
        window.dispatchEvent(new Event('lobby-mode-changed'));
      }

      // Atualiza saldos e infos sem o usuário perceber
      localStorage.setItem('magic_balance', (data.balance || 0).toString());
      if (data.avatar) localStorage.setItem('magic_avatar', data.avatar);
      if (data.roles) localStorage.setItem('magic_roles', JSON.stringify(data.roles));

      return true;
    } catch (error) {
      return false;
    }
  },

  async startSessionHub() {
    const token = this.getToken();
    if (!token) return;

    if (sessionConnection && (
        sessionConnection.state === signalR.HubConnectionState.Connected ||
        sessionConnection.state === signalR.HubConnectionState.Reconnecting
    )) {
        return; 
    }

    if (isConnecting) return;
    
    isConnecting = true;

    try {
      if (sessionConnection) {
          await sessionConnection.stop();
      }

      sessionConnection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, { 
          accessTokenFactory: () => token,
          skipNegotiation: true, 
          transport: signalR.HttpTransportType.WebSockets 
        })
        .withAutomaticReconnect()
        .build();

      sessionConnection.on("ForceLogout", async () => {
        console.log("⚠️ Fui desconectado por um novo login em outro aparelho!");
        
        if (sessionConnection) {
          await sessionConnection.stop(); 
        }
        
        this.logout();
        showSessionModal.value = true;
      });

      await sessionConnection.start();
      console.log("✅ SignalR: Monitoramento de sessão ativa.");
      
      await sessionConnection.invoke("RegisterActiveSession");
      
    } catch (err) {
      console.error("❌ SignalR: Falha na conexão", err);
    } finally {
      isConnecting = false;
    }
  },

  logout() {
    if (sessionConnection) {
      sessionConnection.stop();
      sessionConnection = null;
    }
    // 🔥 Removemos o pendente daqui também pra não vazar pra outra conta
    localStorage.removeItem('magic_token');
    localStorage.removeItem('magic_username');
    localStorage.removeItem('magic_userid');
    localStorage.removeItem('magic_avatar'); 
    localStorage.removeItem('magic_roles');
    localStorage.removeItem('magic_balance');
    localStorage.removeItem('magic_has_agent');
    localStorage.removeItem('magic_pending_agent'); // Limpeza total
    localStorage.removeItem('magic_lobby_mode');
    localStorage.removeItem('magic_referral');
  },

  isAuthenticated() {
    const token = localStorage.getItem('magic_token');
    if (!token) return false;

    const payload = parseJwt(token);
    if (!payload || !payload.exp) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp < currentTime) {
      this.logout();
      return false;
    }

    return true;
  },

  getToken() { return localStorage.getItem('magic_token'); },
  getUsername() { return localStorage.getItem('magic_username'); },
  getUserId() { return localStorage.getItem('magic_userid'); },
  getAvatar() { return localStorage.getItem('magic_avatar') || 'default.webp'; },
  getBalance() { return localStorage.getItem('magic_balance') || '0.00'; },
  
  getRoles() {
    const rolesStr = localStorage.getItem('magic_roles');
    return rolesStr ? JSON.parse(rolesStr) : [];
  },

  isAdmin() {
    const roles = this.getRoles();
    return roles.includes('Owner') || roles.includes('Admin');
  }
};