<template>
  <div class="screen-wrapper">
    
    <div class="header-full-width">
      <Header />
    </div>

    <main class="lobby-content">
      
      <div class="content-header">
        <div class="header-titles-row">
          <button class="btn-back" @click="voltar">←</button>
          <div class="header-titles">
            <h2>MEINHO</h2>
            <span style="color: #94a3b8; font-size: 14px; font-weight: 500;">
              {{ mappedMeinhoRooms.length }} mesas encontradas
            </span>
          </div>
        </div>
        <button class="btn-create meinho-btn-head" @click="irParaCriarMeinho">Criar Mesa Meinho +</button>
      </div>

      <div v-if="isLoading" class="loading-message">
        Carregando salão do Meinho...
      </div>

      <div v-else-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div v-else class="games-feed">
        
        <div v-if="mappedMeinhoRooms.length === 0" class="empty-message">
          Nenhuma sala de Meinho ativa no momento. Que tal criar uma agora?
        </div>

        <div v-else class="games-grid">
          <LobbyCards 
            v-for="room in mappedMeinhoRooms" 
            :key="room.id"
            :room="room"
            :is-processing="processingId === room.id"
            @enter="tentarEntrarNoMeinho"
          />
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
          @keyup.enter="verificarSenhaEEntrar" 
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

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';

import { authService } from '../../services/authService'; 
import Header from '../../components/Header.vue'; 
import BottomNav from '../../components/BottomNav.vue'; 
import LobbyCards from '../../components/LobbyCards.vue'; 

const router = useRouter();

const isLoading = ref(true);
const errorMessage = ref('');
const processingId = ref<number | null>(null);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const meinhoRoomsRaw = ref<any[]>([]);

// Modais
const showPasswordModal = ref(false);
const selectedTableId = ref('');
const tablePassword = ref('');
const passwordError = ref('');
const isVerifying = ref(false);
const passwordInput = ref<HTMLInputElement | null>(null);

const MEINHO_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';

const fetchMeinhoGames = async () => {
  try {
    const token = localStorage.getItem('magic_token');
    if (!token) {
      errorMessage.value = "Usuário não autenticado.";
      isLoading.value = false;
      return;
    }

    errorMessage.value = '';

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
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

const mappedMeinhoRooms = computed(() => {
  return meinhoRoomsRaw.value.map(mesa => {
    const startDate = new Date(Date.now() - 3600000).toISOString(); 
    const endDate = new Date(Date.now() + (mesa.durationHours * 3600000)).toISOString(); 

    return {
      id: mesa.id,
      name: mesa.hasPassword ? `🔒 ${mesa.name}` : mesa.name,
      description: `Mesa de Meinho. Rake: ${mesa.rake}% | Tempo: ${mesa.durationHours}h`,
      participantsCount: mesa.currentPlayers || mesa.current_players || 0,
      maxParticipants: mesa.maxPlayers || mesa.max_players || 0,
      
      entryFee: mesa.ante || 0, 
      prizePool: mesa.minBuyIn || mesa.min_buyin || 0, 

      mode: 'MEINHO',
      startDate: startDate,
      endDate: endDate,
      isJoined: false, 
      isFavorite: false,
      hasPassword: mesa.hasPassword,
      // 🔥 REPASSANDO A IMAGEM EM .webp AQUI 🔥
      coverImage: mesa.coverImage || mesa.CoverImage || 'casino.webp',
      
      // 👇 AQUI: Repassando o gameType para a cartinha
      gameType: mesa.gameType || mesa.game_type || 'MEINHO'
    };
  });
});

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
    // Entrada direta se não tiver senha
    processingId.value = roomId;
    // Pequeno delay fake para feedback visual
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
      throw new Error(errorData.message || 'Senha incorreta!');
    }

    // Senha correta, navega para a mesa
    showPasswordModal.value = false;
    router.push(`/mesa/${selectedTableId.value}`);

  } catch (error: any) {
    passwordError.value = error.message;
  } finally {
    isVerifying.value = false;
  }
};

const voltar = () => {
  router.push('/lobby');
};

const irParaCriarMeinho = () => {
  router.push('/criar-mesa');
};

// Ciclo de vida: Autenticação e Polling
onMounted(() => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }
  
  isLoading.value = true;
  fetchMeinhoGames();
  
  pollInterval = setInterval(fetchMeinhoGames, 5000); 
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap');

.screen-wrapper {
  width: 100vw;
  height: 100vh;
  height: 100dvh; 
  display: flex;
  flex-direction: column; 
  background-color: #000;
  background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%);
  font-family: 'Montserrat', sans-serif;
  color: white;
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
  padding: 20px;
  overflow-y: auto; 
  box-sizing: border-box;
  padding-bottom: 90px;
}

.lobby-content::-webkit-scrollbar { width: 6px; }
.lobby-content::-webkit-scrollbar-thumb { background: #3ce48a; border-radius: 10px; } 
.lobby-content::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 15px;
}

.header-titles-row {
  display: flex;
  align-items: center;
  gap: 15px;
}

.btn-back {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  font-size: 20px;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s;
}

.btn-back:hover { background: rgba(255,255,255,0.1); }

.content-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
  text-transform: uppercase;
  color: #fff;
  text-shadow: 0 2px 10px rgba(60, 228, 138, 0.5);
}

.btn-create {
  background: linear-gradient(to bottom, #38bdf8, #0284c7);
  border: 1px solid #0c4a6e;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 900;
  font-size: 13px;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.25), 0px 4px 6px rgba(0,0,0,0.5);
  transition: all 0.2s;
}

.btn-create:active { transform: translateY(2px); }
.btn-create:hover { filter: brightness(1.1); }

.meinho-btn-head {
  background: linear-gradient(to bottom, #3ce48a, #26ab65);
  border: 1px solid #124026;
}

.games-feed {
  display: flex;
  flex-direction: column;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px; 
  padding: 10px 0;
}

@media (min-width: 1100px) {
  .games-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.loading-message {
  text-align: center;
  color: #aaa;
  margin-top: 40px;
  font-style: italic;
}

.error-message {
  text-align: center;
  color: #ff4757;
  background-color: rgba(255, 71, 87, 0.1);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #ff4757;
  font-size: 13px;
  font-weight: bold;
}

.empty-message {
  text-align: center;
  color: #aaa;
  background: rgba(17, 17, 17, 0.5);
  padding: 30px;
  border-radius: 12px;
  border: 1px dashed #444;
  margin-top: 20px;
  font-size: 14px;
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
  border: 2px solid #2ecc71; 
  border-radius: 16px;
  padding: 25px;
  width: 90%;
  max-width: 350px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 0 15px rgba(46, 204, 113, 0.2);
  text-align: center;
  animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideUp {
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.password-modal h3 {
  color: #2ecc71; 
  margin: 0 0 10px 0;
  font-weight: 900;
  text-transform: uppercase;
}

.password-modal p {
  color: #bbb;
  font-size: 13px;
  margin: 0 0 20px 0;
  font-family: Arial, sans-serif;
}

.password-modal input {
  width: 100%;
  background: #111;
  border: 1px solid #444;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  outline: none;
  font-size: 16px;
  text-align: center;
  box-sizing: border-box;
  margin-bottom: 15px;
  transition: border-color 0.2s;
}

.password-modal input:focus { border-color: #2ecc71; }

.modal-error {
  color: #ff4757;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 15px;
}

.modal-actions { display: flex; gap: 10px; }

.btn-cancel {
  flex: 1;
  background: transparent;
  border: 1px solid #666;
  color: #bbb;
  padding: 12px;
  border-radius: 8px;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover { background: #333; color: #fff; }

.btn-confirm {
  flex: 1;
  background: linear-gradient(to bottom, #3ce48a, #26ab65); 
  border: 1px solid #124026;
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.4), 0px 4px 6px rgba(0,0,0,0.5);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

.btn-confirm:active { transform: translateY(2px); }
.btn-confirm:disabled { background: #555; color: #888; border-color: #444; cursor: not-allowed; }
</style>