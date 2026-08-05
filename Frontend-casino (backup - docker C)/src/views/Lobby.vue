<template>
  <div class="screen-wrapper">
    
    <div class="header-full-width">
      <Header />
    </div>

    <main class="lobby-content">
      
      <div class="content-header">
        <div class="header-titles">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h3>Lobby</h3>
            
            <div v-if="canAccessVip" class="mode-toggle-wrapper">
              <span :class="{'active-mode': isDemoMode}">DEMO</span>
              <label class="switch-mode">
                <input type="checkbox" :checked="!isDemoMode" @change="toggleMode">
                <span class="slider-mode round"></span>
              </label>
              <span :class="{'active-mode-vip': !isDemoMode}">VIP</span>
            </div>
          </div>
          <span class="subtitle">Escolha seu jogo e divirta-se</span>
        </div>
        <button v-if="isOwner && !isDemoMode" class="btn-create" @click="abrirModalEscolha">Criar Mesa +</button>
      </div>

      <div v-if="isDemoMode" class="demo-banner">
        <div class="banner-icon">🎮</div>
        <div class="banner-text">
          <strong>Modo Treinamento</strong>
        </div>
      </div>

      <div v-if="isLoading" class="loading-message">
        Carregando o salão de jogos...
      </div>

      <div v-else-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div v-else class="games-feed">
        
        <div class="game-section" v-if="activeGames.cacheta && mappedCachetaTables.length > 0">
          <LobbyCarousel 
            v-if="featuredCachetaTables.length > 0 && !isDemoMode"
            title="🔥 Cacheta: Destaques" 
            :rooms="featuredCachetaTables" 
            :processing-id="processingId"
            view-all-type="cacheta-featured"
            @enter="entrarNaCacheta"
          />

          <LobbyCarousel 
            :title="isDemoMode ? '🎮 Cacheta Iniciante' : '🃏 Cacheta: Todas as Mesas'" 
            :rooms="mappedCachetaTables" 
            :processing-id="processingId"
            @enter="entrarNaCacheta"
          />
        </div>

        <hr class="divider" v-if="(activeGames.cacheta && mappedCachetaTables.length > 0) && (activeGames.meinho && mappedMeinhoRooms.length > 0)" />

        <div class="game-section" v-if="activeGames.meinho && mappedMeinhoRooms.length > 0">
          <div class="carousel-header-api">
            <LobbyCarousel 
              :title="isDemoMode ? '🎮 Meinho Iniciante' : '🎴 MEINHO'" 
              :rooms="mappedMeinhoRooms" 
              :processing-id="processingId"
              @enter="tentarEntrarNoMeinho"
            />
            <router-link v-if="!isDemoMode" to="/lobby-meinho" class="view-all-link">ver todos →</router-link>
          </div>
        </div>

        <div v-if="(!activeGames.cacheta || mappedCachetaTables.length === 0) && (!activeGames.meinho || mappedMeinhoRooms.length === 0)" class="empty-message">
          {{ isDemoMode ? 'Nenhuma mesa de treinamento disponível no momento.' : 'Nenhuma mesa VIP ativa no momento. Que tal criar a sua?' }}
        </div>

      </div>
    </main>

    <BottomNav />
      
    <div class="password-modal-overlay" v-if="showPasswordModal" @click.self="fecharModalSenha">
      <div class="password-modal">
        <h3>Mesa Privada</h3>
        <p>Esta mesa é protegida. Digite a senha para entrar.</p>
        
        <input 
          type="password" 
          v-model="tablePassword" 
          placeholder="Senha da mesa" 
          @keyup.enter.prevent="verificarSenhaEEntrar" 
          ref="passwordInput"
        />
        
        <div v-if="passwordError" class="modal-error">{{ passwordError }}</div>
        
        <div class="modal-actions">
          <button class="btn-cancel" @click="fecharModalSenha">Cancelar</button>
          <button class="btn-confirm" @click="verificarSenhaEEntrar" :disabled="isVerifying">
            {{ isVerifying ? 'Verificando...' : 'Entrar' }}
          </button>
        </div>
      </div>
    </div>

    <div class="password-modal-overlay" v-if="showCreateChoice" @click.self="showCreateChoice = false">
      <div class="password-modal">
        <h3>Criar Nova Mesa</h3>
        <p>Qual jogo você deseja criar?</p>
        <div class="modal-actions-column">
          <button v-if="activeGames.cacheta" class="btn-confirm cacheta-btn" @click="irParaCriar('cacheta')">Criar Mesa Cacheta</button>
          <button v-if="activeGames.meinho" class="btn-confirm meinho-btn" @click="irParaCriar('meinho')">Criar Mesa Meinho</button>
          <button class="btn-cancel" @click="showCreateChoice = false">Cancelar</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/authService'; 
import * as signalR from '@microsoft/signalr'; 

import Header from '../components/Header.vue'; 
import BottomNav from '../components/BottomNav.vue'; 
import LobbyCarousel from '../components/LobbyCarousel.vue'; 

import { activeGames } from '../services/gameSettings';

const router = useRouter();

const isOwner = ref(false);

// 🔥 NOVA LÓGICA DE PERMISSÃO VIP ABRANGENTE 🔥
const checkVipAccess = () => {
  const temAgente = localStorage.getItem('magic_has_agent') === 'true';
  const ehAgente = localStorage.getItem('magic_is_agent') === 'true'; 
  const roles = localStorage.getItem('magic_roles') || '';
  const temRolePrivilegiada = roles.includes('Owner') || roles.includes('Admin') || roles.includes('Agent') || roles.includes('Agente') || roles.includes('Director') || roles.includes('Diretor');
  const isAdmin = authService.isAdmin ? authService.isAdmin() : false;

  return temAgente || ehAgente || temRolePrivilegiada || isAdmin;
};

const canAccessVip = ref(checkVipAccess());
const isDemoMode = ref(localStorage.getItem('magic_lobby_mode') !== 'VIP');

const toggleMode = () => {
  isDemoMode.value = !isDemoMode.value;
  localStorage.setItem('magic_lobby_mode', isDemoMode.value ? 'DEMO' : 'VIP');
  // Avisa o Header para atualizar o saldo
  window.dispatchEvent(new Event('lobby-mode-changed'));
};

const isLoading = ref(true);
const errorMessage = ref('');
const processingId = ref<number | null>(null);
let pollInterval: ReturnType<typeof setInterval> | null = null;

let lobbyHubConnection: signalR.HubConnection | null = null;

const cachetaTablesRaw = ref<any[]>([]);
const meinhoRoomsRaw = ref<any[]>([]);

const showPasswordModal = ref(false);
const showCreateChoice = ref(false);

const selectedTableId = ref('');
const tablePassword = ref('');
const passwordError = ref('');
const isVerifying = ref(false);
const passwordInput = ref<HTMLInputElement | null>(null);

const CACHETA_API_URL = import.meta.env.VITE_CACHETA_API_URL || 'https://cacheta.magic-casino.online';
const MEINHO_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';

const setupLobbySignalR = async () => {
  const token = localStorage.getItem('magic_token');
  
  lobbyHubConnection = new signalR.HubConnectionBuilder()
    .withUrl(`${MEINHO_API_URL}/hubs/game`, {
      accessTokenFactory: () => token || ''
    })
    .withAutomaticReconnect()
    .build();

  lobbyHubConnection.on("LobbyTableUpdated", (hubTableId: string, newCount: number) => {
    const mesaMeinho = meinhoRoomsRaw.value.find((m: any) => m.id === hubTableId || m.Id === hubTableId);
    if (mesaMeinho) {
      mesaMeinho.currentPlayers = newCount;
      mesaMeinho.current_players = newCount;
      mesaMeinho.CurrentPlayers = newCount;
    }

    const mesaCacheta = cachetaTablesRaw.value.find((m: any) => m.id === hubTableId || m.Id === hubTableId);
    if (mesaCacheta) {
      mesaCacheta.currentPlayers = newCount;
      mesaCacheta.current_players = newCount;
      mesaCacheta.CurrentPlayers = newCount;
    }
  });

  try {
    await lobbyHubConnection.start();
  } catch (err) {
    console.error("Erro ao conectar o SignalR no Lobby:", err);
  }
};

const fetchAllGames = async () => {
  try {
    const token = localStorage.getItem('magic_token');
    if (!token) {
      errorMessage.value = "Usuário não autenticado.";
      isLoading.value = false;
      return;
    }

    errorMessage.value = '';

    try {
        const cachetaResponse = await fetch(`${CACHETA_API_URL}/api/table`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (cachetaResponse.ok) {
            cachetaTablesRaw.value = await cachetaResponse.json();
        }
    } catch (e) {
        console.warn("API Cacheta indisponível no momento.");
    }

    const meinhoResponse = await fetch(`${MEINHO_API_URL}/api/table`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (meinhoResponse.ok) {
      meinhoRoomsRaw.value = await meinhoResponse.json();
    } else {
        throw new Error('Não foi possível carregar as mesas do Meinho.');
    }

  } catch (error: any) {
    if (meinhoRoomsRaw.value.length === 0) {
        errorMessage.value = error.message;
    }
  } finally {
    isLoading.value = false;
  }
};

const mappedCachetaTables = computed(() => {
  return cachetaTablesRaw.value.filter(table => {
    const isMesaDemo = table.isDemo || table.IsDemo || false;
    return isDemoMode.value ? isMesaDemo : !isMesaDemo;
  }).map(table => {
    const startDate = new Date(Date.now() - 3600000).toISOString(); 
    const endDate = new Date(Date.now() + 86400000).toISOString(); 

    return {
      id: table.id,
      name: table.hasPassword ? `🔒 ${table.name}` : table.name,
      // 🔥 MAQUIAGEM MANTIDA + CONDICIONAL DO TREINO 🔥
      description: isDemoMode.value ? 'Treine suas habilidades sem custo!' : `Mesa de Cacheta. Entrada Mínima: 🪙 ${table.ante} | Rake: ${table.rake}%`,
      participantsCount: table.currentPlayers || table.current_players || table.CurrentPlayers || 0,
      maxParticipants: table.maxPlayers || table.max_players || table.MaxPlayers || 0,
      
      entryFee: table.ante || 0, 
      prizePool: table.minBuyIn || table.min_buyin || 0, 

      mode: 'CACHETA',
      startDate: startDate,
      endDate: endDate,
      isJoined: false, 
      isFavorite: false,
      hasPassword: table.hasPassword,
      coverImage: table.coverImage || table.CoverImage || 'casino.webp',
      
      gameType: table.gameType || table.game_type || 'CACHETA'
    };
  });
});

const featuredCachetaTables = computed(() => {
  return mappedCachetaTables.value.filter(room => room.participantsCount > 0);
});

const mappedMeinhoRooms = computed(() => {
  return meinhoRoomsRaw.value.filter(mesa => {
    const isMesaDemo = mesa.isDemo || mesa.IsDemo || false;
    return isDemoMode.value ? isMesaDemo : !isMesaDemo;
  }).map(mesa => {
    const startDate = new Date(Date.now() - 3600000).toISOString(); 
    const endDate = new Date(Date.now() + (mesa.durationHours * 3600000)).toISOString(); 

    return {
      id: mesa.id,
      name: mesa.hasPassword ? `🔒 ${mesa.name}` : mesa.name,
      // 🔥 MAQUIAGEM MANTIDA + CONDICIONAL DO TREINO 🔥
      description: isDemoMode.value ? 'Modo de Treino Iniciante' : `Mesa de Meinho. Rake: ${mesa.rake}% | Tempo: ${mesa.durationHours}h`,
      participantsCount: mesa.currentPlayers || mesa.current_players || mesa.CurrentPlayers || 0,
      maxParticipants: mesa.maxPlayers || mesa.max_players || mesa.MaxPlayers || 0,
      
      entryFee: mesa.ante || 0, 
      prizePool: mesa.minBuyIn || mesa.min_buyin || 0, 

      mode: 'MEINHO',
      startDate: startDate,
      endDate: endDate,
      isJoined: false, 
      isFavorite: false,
      hasPassword: mesa.hasPassword,
      coverImage: mesa.coverImage || mesa.CoverImage || 'casino.webp',

      gameType: mesa.gameType || mesa.game_type || 'MEINHO'
    };
  });
});

const entrarNaCacheta = (roomId: number) => {
  processingId.value = roomId;
  setTimeout(() => {
    router.push(`/mesa-cacheta/${roomId}`);
    processingId.value = null;
  }, 600);
};

const tentarEntrarNoMeinho = (roomId: number) => {
  const mesaOriginal = meinhoRoomsRaw.value.find(m => m.id === roomId);
    
  if (mesaOriginal && mesaOriginal.hasPassword) {
    selectedTableId.value = roomId.toString();
    tablePassword.value = '';
    passwordError.value = '';
    showPasswordModal.value = true;
      
    nextTick(() => {
      if (passwordInput.value) passwordInput.value.focus();
    });
  } else {
    processingId.value = roomId;
    setTimeout(() => {
      router.push(`/mesa/${roomId}`);
      processingId.value = null;
    }, 600);
  }
};

const fecharModalSenha = () => {
  showPasswordModal.value = false;
  tablePassword.value = '';
  passwordError.value = '';
};

const verificarSenhaEEntrar = async () => {
  if (!tablePassword.value) {
    passwordError.value = 'Por favor, digite a senha.';
    return;
  }

  isVerifying.value = true;
  passwordError.value = '';

  try {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${MEINHO_API_URL}/api/table/${selectedTableId.value}/validate-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ password: tablePassword.value })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      passwordError.value = errorData.message || 'Senha incorreta!';
      isVerifying.value = false;
      return; 
    }

    showPasswordModal.value = false;
    router.push(`/mesa/${selectedTableId.value}`);

    } catch (error: any) {
      passwordError.value = 'Falha na conexão. Verifique sua rede.';
    } finally {
      isVerifying.value = false;
    }
};

const abrirModalEscolha = () => {
  showCreateChoice.value = true;
};

const irParaCriar = (tipo: string) => {
  showCreateChoice.value = false;
  if (tipo === 'cacheta') {
    router.push('/criar-mesa-cacheta');
  } else {
    router.push('/criar-mesa');
  }
};

onMounted(() => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }

  isOwner.value = authService.isAdmin();
  canAccessVip.value = checkVipAccess();
  
  // Define o modo padrão como Treino para quem entra pela primeira vez (padrão Play Store)
  if (!localStorage.getItem('magic_lobby_mode')) {
    localStorage.setItem('magic_lobby_mode', canAccessVip.value ? 'VIP' : 'DEMO');
    isDemoMode.value = !canAccessVip.value;
    // 👇 ADICIONE ESTA LINHA PARA AVISAR O HEADER NA HORA 👇
    window.dispatchEvent(new Event('lobby-mode-changed'));
  }
  
  isLoading.value = true;
  fetchAllGames();
  
  pollInterval = setInterval(fetchAllGames, 5000); 

  setupLobbySignalR();
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);

  if (lobbyHubConnection) {
    lobbyHubConnection.stop();
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap');

.screen-wrapper {
  width: 100%; 
  height: 100vh;
  height: 100dvh; 
  display: flex;
  flex-direction: column; 
  background-color: #000;
  background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%);
  font-family: 'Montserrat', sans-serif;
  color: white;
  overflow-x: hidden;
}

.header-full-width {
  width: 100%;
  flex-shrink: 0;
  z-index: 50;
}

.lobby-content {
  flex: 1; 
  width: 100%;
  max-width: 1400px;
  margin: 0 auto; 
  padding: 10px; 
  overflow-y: auto; 
  overflow-x: hidden; 
  box-sizing: border-box;
  padding-bottom: 75px; 
}

.lobby-content::-webkit-scrollbar { width: 6px; }
.lobby-content::-webkit-scrollbar-thumb { background: #38bdf8; border-radius: 10px; }
.lobby-content::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px; 
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 0px; 
}

.content-header h3 {
  margin: 0;
  font-size: 20px; 
  font-weight: 900;
  text-transform: uppercase;
  color: #fff;
  line-height: 1; 
  text-shadow: 0 2px 10px rgba(56, 189, 248, 0.5);
}

.subtitle {
  color: #94a3b8;
  font-size: 11px; 
  font-weight: 500;
  margin-top: 2px;
}

/* 🔥 ESTILOS DO SWITCH MODO TREINO/VIP 🔥 */
.mode-toggle-wrapper { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.4); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); }
.mode-toggle-wrapper span { font-size: 10px; font-weight: 900; color: #475569; transition: 0.3s; letter-spacing: 0.5px;}
.active-mode { color: #38bdf8 !important; text-shadow: 0 0 8px rgba(56, 189, 248, 0.6); }
.active-mode-vip { color: #f1c40f !important; text-shadow: 0 0 8px rgba(241, 196, 15, 0.6); }

.switch-mode { position: relative; display: inline-block; width: 34px; height: 18px; margin: 0; }
.switch-mode input { opacity: 0; width: 0; height: 0; }
.slider-mode { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #0c4a6e; transition: .4s; border-radius: 18px; }
.slider-mode:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: #38bdf8; transition: .4s; border-radius: 50%; }

input:checked + .slider-mode { background-color: #785a00; }
input:checked + .slider-mode:before { transform: translateX(16px); background-color: #f1c40f; }

/* 🔥 ESTILOS DO BANNER DE AVISO 🔥 */
.demo-banner { display: flex; align-items: center; gap: 15px; background: linear-gradient(to right, rgba(14, 165, 233, 0.2), rgba(2, 132, 199, 0.05)); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 12px; padding: 12px 20px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); animation: fadeIn 0.4s ease-out;}
.banner-icon { font-size: 28px; }
.banner-text strong { color: #38bdf8; font-size: 14px; text-transform: uppercase; }
.banner-text p { color: #cbd5e1; font-size: 11px; margin: 4px 0 0 0; line-height: 1.4; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

.btn-create {
  background: linear-gradient(to bottom, #38bdf8, #0284c7);
  border: 1px solid #0c4a6e;
  color: white;
  padding: 6px 14px; 
  border-radius: 6px;
  font-weight: 900;
  font-size: 11px; 
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.25), 0px 4px 6px rgba(0,0,0,0.5);
  transition: all 0.2s;
}

.btn-create:active { transform: translateY(2px); }
.btn-create:hover { filter: brightness(1.1); }

.games-feed {
  display: flex;
  flex-direction: column;
  gap: 12px; 
}

.game-section {
  display: flex;
  flex-direction: column;
  gap: 4px; 
}

.carousel-header-api {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.view-all-link {
  color: #38bdf8;
  font-size: 10px; 
  font-weight: 700;
  text-transform: uppercase;
  text-decoration: none;
  background: rgba(56, 189, 248, 0.1);
  padding: 4px 10px; 
  border-radius: 20px;
  border: 1px solid rgba(56, 189, 248, 0.3);
  transition: all 0.2s;
  position: absolute;
  right: 13px; 
  top: 25px; 
  z-index: 10;
}

.view-all-link:hover {
  background: rgba(56, 189, 248, 0.2);
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
}

.divider {
  height: 1px;
  width: 100%;
  border: none;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
  margin: 4px 0; 
}

.loading-message {
  text-align: center;
  color: #aaa;
  margin-top: 15px; 
  font-style: italic;
  font-size: 12px;
}

.error-message {
  text-align: center;
  color: #ff4757;
  background-color: rgba(255, 71, 87, 0.1);
  padding: 10px; 
  border-radius: 8px;
  margin-bottom: 10px; 
  border: 1px solid #ff4757;
  font-size: 12px;
  font-weight: bold;
}

.empty-message {
  text-align: center;
  color: #aaa;
  background: rgba(17, 17, 17, 0.5);
  padding: 15px; 
  border-radius: 8px; 
  border: 1px dashed #444;
  margin-top: 10px; 
  font-size: 12px;
}

.password-modal-overlay {
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
  z-index: 1000;
}

.password-modal {
  background: linear-gradient(135deg, rgba(20, 28, 45, 0.95), rgba(10, 15, 25, 0.98));
  border: 2px solid #f1c40f;
  border-radius: 12px; 
  padding: 18px; 
  width: 90%;
  max-width: 320px; 
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 0 15px rgba(241, 196, 15, 0.2);
  text-align: center;
  animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideUp {
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.password-modal h3 {
  color: #f1c40f;
  margin: 0 0 5px 0; 
  font-weight: 900;
  font-size: 16px;
  text-transform: uppercase;
}

.password-modal p {
  color: #bbb;
  font-size: 11px; 
  margin: 0 0 15px 0;
  font-family: Arial, sans-serif;
  line-height: 1.2;
}

.password-modal input {
  width: 100%;
  background: #111;
  border: 1px solid #444;
  color: #fff;
  padding: 10px; 
  border-radius: 6px;
  outline: none;
  font-size: 14px;
  text-align: center;
  box-sizing: border-box;
  margin-bottom: 12px;
  transition: border-color 0.2s;
}

.password-modal input:focus { border-color: #f1c40f; }

.modal-error {
  color: #ff4757;
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 10px;
}

.modal-actions { display: flex; gap: 8px; } 

.modal-actions-column {
  display: flex;
  flex-direction: column;
  gap: 8px; 
}

.btn-cancel {
  flex: 1;
  background: transparent;
  border: 1px solid #666;
  color: #bbb;
  padding: 8px; 
  border-radius: 6px;
  font-weight: 900;
  font-size: 11px; 
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover { background: #333; color: #fff; }

.btn-confirm {
  flex: 1;
  background: linear-gradient(to bottom, #f1c40f, #d4ac0d);
  border: 1px solid #b7950b;
  color: #000;
  padding: 8px; 
  border-radius: 6px;
  font-weight: 900;
  font-size: 11px; 
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.4), 0px 4px 6px rgba(0,0,0,0.5);
}

.btn-confirm:active { transform: translateY(2px); }
.btn-confirm:disabled { background: #555; color: #888; border-color: #444; cursor: not-allowed; }

.cacheta-btn {
  background: linear-gradient(to bottom, #f1c40f, #d4ac0d);
  color: #000;
  border: 1px solid #b7950b;
}

.meinho-btn {
  background: linear-gradient(to bottom, #3ce48a, #26ab65);
  color: white;
  border: 1px solid #124026;
}
</style>