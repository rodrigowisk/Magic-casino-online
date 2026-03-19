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

  <div class="avatar-modal-overlay" v-if="showAvatarModal" @click.self="fecharModalAvatar">
    <div class="avatar-modal-box">
      <h3>Escolha seu Avatar</h3>
      <p>Selecione uma imagem para o seu perfil</p>
      
      <div class="avatar-tabs">
        <button 
          :class="{ active: currentTab === 'man' }" 
          @click="currentTab = 'man'">
          Homem
        </button>
        <button 
          :class="{ active: currentTab === 'woman' }" 
          @click="currentTab = 'woman'">
          Mulher
        </button>
      </div>
      
      <div class="avatar-grid">
        <img 
          v-for="av in avataresExibidos" 
          :key="av" 
          :src="getAvatarUrl(av)" 
          :class="['avatar-option', currentAvatar === av ? 'selected' : '']"
          @click="salvarNovoAvatar(av)"
        />
      </div>
      
      <div class="modal-actions">
        <button class="btn-cancel" @click="fecharModalAvatar">Fechar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/authService'; 
// 👇 NOVO: Importa o SignalR
import * as signalR from '@microsoft/signalr';

const router = useRouter();
const currentUser = ref(''); 
const balance = ref('R$ 0,00'); 

// === ESTADOS DO AVATAR ===
const currentAvatar = ref('default.webp');
const showAvatarModal = ref(false);
const currentTab = ref<'man' | 'woman'>('man'); // Controla a aba atual

// Gera as listas baseadas na quantidade de arquivos das suas pastas
const listaHomem = Array.from({ length: 24 }, (_, i) => `man/${i + 1}.webp`);
const listaMulher = Array.from({ length: 5 }, (_, i) => `woman/${i + 1}.webp`);

// Alterna a lista a ser exibida
const avataresExibidos = computed(() => {
  return currentTab.value === 'man' ? listaHomem : listaMulher;
});

// 👇 A MÁGICA DEFINITIVA DO VITE 👇
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

// FUNÇÃO PARA BUSCAR O SALDO INICIAL
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
  
  // 1. Busca o saldo normal ao carregar a página
  await fetchUserBalance(); 

  // 👇 2. NOVO: CONEXÃO SIGNALR GLOBAL PARA O HEADER ESCUTAR O SALDO
  try {
    const userId = localStorage.getItem('magic_userid');
    const token = localStorage.getItem('magic_token');
    const GAME_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';

    if (userId && token) {
      const headerHub = new signalR.HubConnectionBuilder()
        .withUrl(`${GAME_API_URL}/gamehub`, { accessTokenFactory: () => token })
        .withAutomaticReconnect()
        .build();

      // Quando o backend gritar "WalletBalanceUpdated", o Header atualiza na hora!
      headerHub.on("WalletBalanceUpdated", (newBalance: number) => {
        balance.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newBalance);
      });

      await headerHub.start();
      // Registra o usuário no grupo dele para receber os updates em todas as abas
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
.app-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 40px; /* Ajustado para alinhar com o content-area no Desktop */
  background: rgba(17, 17, 17, 0.6);
  border-bottom: 1px solid #222; 
  box-sizing: border-box;
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
  background-color: #111;
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

/* Área Direita (Saldo + Sair) */
.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Pílula de Saldo */
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

/* Ícone de Sair */
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

.btn-logout-icon svg {
  width: 22px;
  height: 22px;
}

.btn-logout-icon:hover {
  background: rgba(231, 76, 60, 0.15);
  box-shadow: 0 0 10px rgba(231, 76, 60, 0.3);
  transform: scale(1.05);
}

.btn-logout-icon:active {
  transform: scale(0.95);
}

/* === MODAL DE AVATAR === */
.avatar-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.avatar-modal-box {
  background: linear-gradient(135deg, rgba(20, 28, 45, 0.95), rgba(10, 15, 25, 0.98));
  border: 2px solid #a855f7;
  border-radius: 16px;
  padding: 25px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 0 15px rgba(168, 85, 247, 0.2);
  text-align: center;
  animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideUp {
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.avatar-modal-box h3 {
  color: #a855f7;
  margin: 0 0 10px 0;
  font-weight: 900;
  text-transform: uppercase;
}

.avatar-modal-box p {
  color: #bbb;
  font-size: 13px;
  margin: 0 0 15px 0;
}

/* ESTILOS DAS ABAS HOMEM/MULHER */
.avatar-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.avatar-tabs button {
  background: #111;
  border: 1px solid #444;
  color: #888;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 12px;
  transition: all 0.2s;
}

.avatar-tabs button:hover {
  background: #222;
  color: #fff;
}

.avatar-tabs button.active {
  background: rgba(168, 85, 247, 0.15);
  border-color: #a855f7;
  color: #fff;
  box-shadow: inset 0 0 8px rgba(168, 85, 247, 0.3);
}

/* GRELHA DE AVATARES */
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 15px;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 5px;
}

.avatar-grid::-webkit-scrollbar { width: 5px; }
.avatar-grid::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 10px; }

.avatar-option {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.6;
}

.avatar-option:hover {
  opacity: 1;
  transform: scale(1.1);
}

.avatar-option.selected {
  opacity: 1;
  border-color: #a855f7;
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.8);
  transform: scale(1.1);
}

.modal-actions {
  margin-top: 25px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #666;
  color: #bbb;
  padding: 10px 25px;
  border-radius: 8px;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #333;
  color: #fff;
}

/* Responsividade Básica para Celulares e alinhamento com o Layout */
@media (max-width: 768px) {
  .app-header {
    padding: 15px 15px; /* Ajustado para alinhar com o content-area no Mobile */
  }
}

@media (max-width: 400px) {
  .user-info h3 {
    font-size: 14px;
  }
  .balance-pill {
    padding: 4px 10px;
    font-size: 12px;
  }
  .header-right {
    gap: 8px;
  }
}
</style>