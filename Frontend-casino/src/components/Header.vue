<template>
  <header class="app-header">
    <div class="user-info">
      <div class="avatar-wrapper" @click="abrirModalAvatar" title="Mudar Avatar">
        <img :src="getAvatarUrl(currentAvatar)" alt="Avatar" class="profile-avatar" />
        <div class="edit-badge">✏️</div>
      </div>
      <h3>{{ currentUser }}</h3>
    </div>

    <div class="header-right">
      <div class="balance-pill">
        {{ balance }}
      </div>
      <button class="btn-logout-icon" @click="sair" title="Sair">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
    </div>
  </header>

  <AvatarModal 
    :show="showAvatarModal" 
    :currentAvatar="currentAvatar" 
    @close="fecharModalAvatar" 
    @select="salvarNovoAvatar" 
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/authService'; 
import * as signalR from '@microsoft/signalr';

// 👇 Importação do Novo Componente
import AvatarModal from './AvatarModal.vue';

const router = useRouter();
const currentUser = ref(''); 
const balance = ref('R$ 0,00'); 

const currentAvatar = ref('default.webp');
const showAvatarModal = ref(false);

const avatarImages: Record<string, string> = import.meta.glob('../assets/imagens/avatars/**/*.webp', { eager: true, import: 'default' });

const getAvatarUrl = (filename: string) => {
  const safeFilename = filename || 'default.webp';
  const path = `../assets/imagens/avatars/${safeFilename}`;
  return avatarImages[path] || avatarImages['../assets/imagens/avatars/default.webp'];
};

const abrirModalAvatar = () => showAvatarModal.value = true;
const fecharModalAvatar = () => showAvatarModal.value = false;

const salvarNovoAvatar = async (novoAvatar: string) => {
  try {
    const token = localStorage.getItem('magic_token');
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    await fetch(`${API_URL}/auth/avatar`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatar: novoAvatar }) 
    });

    localStorage.setItem('magic_avatar', novoAvatar);
    currentAvatar.value = novoAvatar;
    fecharModalAvatar();

  } catch (error) {
    console.error("Erro ao atualizar avatar:", error);
    localStorage.setItem('magic_avatar', novoAvatar);
    currentAvatar.value = novoAvatar;
    fecharModalAvatar();
  }
};

const fetchUserBalance = async () => {
  try {
    const userId = localStorage.getItem('magic_userid');
    if (!userId) return;

    const IDENTITY_API_URL = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';
    const response = await fetch(`${IDENTITY_API_URL}/api/wallet/${userId}/balance`);
    
    if (response.ok) {
      const data = await response.json();
      balance.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.balance);
    }
  } catch (error) {
    console.error("Erro ao buscar saldo real no Header:", error);
  }
};

onMounted(async () => {
  currentUser.value = authService.getUsername() || 'Jogador';
  currentAvatar.value = authService.getAvatar() || 'default.webp'; 
  
  await fetchUserBalance(); 

  try {
    const userId = localStorage.getItem('magic_userid');
    const token = localStorage.getItem('magic_token');
    const GAME_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';

    if (userId && token) {
      // 👇 CORREÇÃO: URL certa (/hubs/game) e as regras anti-queda do WebSocket
      const headerHub = new signalR.HubConnectionBuilder()
        .withUrl(`${GAME_API_URL}/hubs/game`, { 
            accessTokenFactory: () => token,
            skipNegotiation: true,
            transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect()
        .build();

      headerHub.on("WalletBalanceUpdated", (newBalance: number) => {
        balance.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newBalance);
      });

      await headerHub.start();
      await headerHub.invoke("RegisterUser", userId);
    }
  } catch (error) {
    console.error("Erro ao conectar SignalR no Header:", error);
  }
});

const sair = () => {
  authService.logout();
  router.push('/login');
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;900&display=swap');

.app-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 40px; 
  background: rgba(17, 17, 17, 0.6);
  border-bottom: 1px solid #222; 
  box-sizing: border-box;
  font-family: 'Montserrat', sans-serif;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-wrapper {
  position: relative;
  width: 45px;
  height: 45px;
  cursor: pointer;
  transition: transform 0.2s;
}

.avatar-wrapper:hover {
  transform: scale(1.05);
}

.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background-color: transparent;
  border: 2px solid #a855f7; 
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
}

.edit-badge {
  position: absolute;
  bottom: -2px;
  right: -5px;
  background: #222;
  border: 1px solid #a855f7;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 9px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.8);
}

.user-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
  text-transform: uppercase;
  color: white;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.balance-pill {
  background: rgba(60, 228, 138, 0.15);
  border: 1px solid rgba(60, 228, 138, 0.5);
  color: #3ce48a;
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 900;
  font-size: 14px;
  display: flex;
  align-items: center;
  box-shadow: 0 0 10px rgba(60, 228, 138, 0.1);
}

.btn-logout-icon {
  background: transparent;
  border: none;
  color: #e74c3c;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-logout-icon svg { width: 22px; height: 22px; }
.btn-logout-icon:hover { background: rgba(231, 76, 60, 0.15); box-shadow: 0 0 10px rgba(231, 76, 60, 0.3); transform: scale(1.05); }
.btn-logout-icon:active { transform: scale(0.95); }

@media (max-width: 768px) {
  .app-header { padding: 15px 15px; }
}

@media (max-width: 400px) {
  .user-info h3 { font-size: 14px; }
  .balance-pill { padding: 4px 10px; font-size: 12px; }
  .header-right { gap: 8px; }
}
</style>