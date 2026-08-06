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
      
      <!-- CONTAINER DA CARTEIRA COM MENU EXPANSIVO -->
      <div class="wallet-container" ref="walletContainerRef">
        <!-- PILL DE SALDO (AGORA CLICÁVEL SE FOR VIP) -->
        <div 
          class="balance-pill" 
          :class="{'demo-balance': isDemoMode, 'clickable': !isDemoMode}"
          @click="toggleMenu"
        >
          {{ balance }}
          <!-- Ícone de Chevron (seta) apenas no modo VIP para indicar o menu -->
          <svg 
            v-if="!isDemoMode" 
            class="chevron-icon" 
            :class="{'open': isMenuOpen}" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        
        <!-- DROPDOWN MENU (APENAS VIP) -->
        <div v-if="isMenuOpen && !isDemoMode" class="wallet-dropdown">
          <div class="dropdown-item" @click="handleAction('/deposito')">
            <div class="icon-wrapper deposit-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </div>
            <span>Depositar</span>
          </div>

          <div class="dropdown-item" @click="handleAction('/saque')">
            <div class="icon-wrapper withdraw-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </div>
            <span>Sacar</span>
          </div>

          <div class="dropdown-divider"></div>

          <div class="dropdown-item history" @click="handleAction('/historico')">
            <div class="icon-wrapper history-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <span>Histórico</span>
          </div>
        </div>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/authService'; 
import * as signalR from '@microsoft/signalr';

// 👇 Importação do Novo Componente
import AvatarModal from './AvatarModal.vue';

const router = useRouter();
const currentUser = ref(''); 
// 🔥 Valor inicial adaptado
const balance = ref('🪙 0,00'); 
const isDemoMode = ref(localStorage.getItem('magic_lobby_mode') !== 'VIP');

const currentAvatar = ref('default.webp');
const showAvatarModal = ref(false);

// Refs para o Dropdown da Carteira
const isMenuOpen = ref(false);
const walletContainerRef = ref<HTMLElement | null>(null);

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

// Controle do Menu de Carteira
const toggleMenu = () => {
  if (!isDemoMode.value) {
    isMenuOpen.value = !isMenuOpen.value;
  }
};

const handleAction = (route: string) => {
  isMenuOpen.value = false;
  router.push(route);
};

// Fecha o menu se o usuário clicar fora dele
const handleClickOutside = (event: MouseEvent) => {
  if (walletContainerRef.value && !walletContainerRef.value.contains(event.target as Node)) {
    isMenuOpen.value = false;
  }
};

// 🔥 FUNÇÃO DE SALDO ATUALIZADA: Suporta Demo e VIP 🔥
const fetchUserBalance = async () => {
  try {
    const userId = localStorage.getItem('magic_userid');
    if (!userId) return;

    // Guarda o modo exigido no momento em que a requisição começou
    const targetMode = localStorage.getItem('magic_lobby_mode') || 'DEMO';
    isDemoMode.value = targetMode === 'DEMO';
    
    // Fecha o menu automaticamente se mudar para DEMO
    if (isDemoMode.value) {
      isMenuOpen.value = false;
    }
    
    const endpoint = targetMode === 'VIP' ? 'balance' : 'demo-balance';
    const IDENTITY_API_URL = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';
    
    const response = await fetch(`${IDENTITY_API_URL}/api/wallet/${userId}/${endpoint}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // 👉 A MÁGICA FINAL: Só escreve na tela se o modo atual ainda for o mesmo que pedimos
      if (localStorage.getItem('magic_lobby_mode') === targetMode) {
         const prefix = targetMode === 'VIP' ? '🪙 ' : '🎮 '; 
         balance.value = prefix + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.balance);
      }
    }
  } catch (error) {
    console.error("Erro ao buscar saldo atual no Header:", error);
  }
};

onMounted(async () => {
  currentUser.value = authService.getUsername() || 'Jogador';
  currentAvatar.value = authService.getAvatar() || 'default.webp'; 
  
  // Registra os ouvintes
  window.addEventListener('lobby-mode-changed', fetchUserBalance);
  document.addEventListener('click', handleClickOutside);

  // Dispara a busca do saldo sem usar 'await' para não travar o Vue
  fetchUserBalance(); 

  try {
    const userId = localStorage.getItem('magic_userid');
    const token = localStorage.getItem('magic_token');
    const GAME_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';

    if (userId && token) {
      const headerHub = new signalR.HubConnectionBuilder()
        .withUrl(`${GAME_API_URL}/hubs/game`, { 
            accessTokenFactory: () => token,
            skipNegotiation: true,
            transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect()
        .build();

      headerHub.on("WalletBalanceUpdated", (newBalance: number) => {
        // Só atualiza via SignalR se estiver no modo VIP
        if (localStorage.getItem('magic_lobby_mode') === 'VIP') {
           balance.value = '🪙 ' + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(newBalance);
        }
      });

      await headerHub.start();
      await headerHub.invoke("RegisterUser", userId);
    }
  } catch (error) {
    console.error("Erro ao conectar SignalR no Header:", error);
  }
});

onUnmounted(() => {
  window.removeEventListener('lobby-mode-changed', fetchUserBalance);
  document.removeEventListener('click', handleClickOutside);
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

/* CONTAINER DA CARTEIRA */
.wallet-container {
  position: relative;
  display: flex;
  align-items: center;
}

/* SALDO VIP */
.balance-pill {
  background: rgba(60, 228, 138, 0.15);
  border: 1px solid rgba(60, 228, 138, 0.5);
  color: #3ce48a;
  padding: 8px 16px;
  border-radius: 24px;
  font-weight: 900;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 0 10px rgba(60, 228, 138, 0.1);
  transition: all 0.3s ease;
  user-select: none;
}

.balance-pill.clickable {
  cursor: pointer;
}

.balance-pill.clickable:hover {
  background: rgba(60, 228, 138, 0.25);
  transform: scale(1.02);
}

.chevron-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;
}

.chevron-icon.open {
  transform: rotate(180deg);
}

/* SALDO TREINO (AZUL) */
.balance-pill.demo-balance {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.5);
  color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
  cursor: default;
}
.balance-pill.demo-balance:hover {
  transform: none;
}

/* MENU DROPDOWN */
.wallet-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 220px;
  background: #242938; /* Cor escura baseada no design da imagem */
  border: 1px solid #33394a;
  border-radius: 14px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.6);
  padding: 10px 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s ease;
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.icon-wrapper {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon-wrapper svg {
  width: 18px;
  height: 18px;
}

/* Cores específicas dos ícones do menu */
.deposit-icon {
  background: rgba(46, 204, 113, 0.15);
  color: #2ecc71;
}

.withdraw-icon {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
}

.history-icon {
  background: transparent;
  color: #8b94a6;
}

.dropdown-item.history {
  color: #8b94a6;
}

.dropdown-divider {
  height: 1px;
  background: #33394a;
  margin: 6px 20px;
}

/* BOTÃO SAIR */
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

/* RESPONSIVIDADE */
@media (max-width: 768px) {
  .app-header { padding: 15px 15px; }
  .wallet-dropdown { right: -40px; } /* Centraliza melhor no mobile dependendo do tamanho */
}

@media (max-width: 400px) {
  .user-info h3 { font-size: 14px; }
  .balance-pill { padding: 6px 12px; font-size: 12px; gap: 6px; }
  .header-right { gap: 10px; }
  .wallet-dropdown { right: -50px; width: 200px; }
}
</style>