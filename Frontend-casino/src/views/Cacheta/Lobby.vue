<template>
  <div class="screen-wrapper">
    <div class="global-lobby-container">
      
      <div class="header-area">
        <div class="header-titles">
          <h2>Lobby Principal</h2>
          <span class="subtitle">Escolha seu jogo e divirta-se</span>
        </div>
        <div class="header-actions">
          <button class="btn-create" @click="router.push('/criar-mesa')">+ Criar Mesa</button>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="loader-spin"></div>
        <p>Carregando o salão de jogos...</p>
      </div>

      <div v-else-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div v-else class="games-feed">
        
        <div class="game-section">
          <div v-if="mappedCachetaTables.length === 0" class="empty-state">
            <p>Nenhuma mesa de Cacheta ativa no momento.</p>
          </div>
          <template v-else>
            <LobbyCarousel 
              v-if="featuredCachetaTables.length > 0"
              title="🔥 Cacheta: Destaques" 
              :rooms="featuredCachetaTables" 
              :processing-id="processingId"
              view-all-type="cacheta-featured"
              @enter="entrarNaCacheta"
            />

            <LobbyCarousel 
              title="🃏 Cacheta: Todas as Mesas" 
              :rooms="mappedCachetaTables" 
              :processing-id="processingId"
              @enter="entrarNaCacheta"
            />
          </template>
        </div>

        <div class="divider"></div>

        <div class="game-section">
          <div v-if="meinhoRooms.length === 0" class="empty-state">
            <p>Nenhuma sala de Meinho ativa no momento.</p>
          </div>
          <template v-else>
            <LobbyCarousel 
              title="🎴 Meinho: Salas Abertas" 
              :rooms="meinhoRooms" 
              :processing-id="processingId"
              @enter="entrarNoMeinho"
            />
          </template>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import LobbyCarousel from '../../components/LobbyCarousel.vue';

const router = useRouter();

// Estados Globais
const isLoading = ref(true);
const errorMessage = ref('');
const processingId = ref<number | null>(null);
let pollInterval: ReturnType<typeof setInterval> | null = null;

// Estados Específicos dos Jogos
const cachetaTablesRaw = ref<any[]>([]);
const meinhoRooms = ref<any[]>([]);

const CACHETA_API_URL = import.meta.env.VITE_CACHETA_API_URL || 'https://cacheta.magic-casino.online';

// =======================================================================
// FETCH DATA (BUSCA DE DADOS)
// =======================================================================
const fetchAllGames = async () => {
  try {
    const token = localStorage.getItem('magic_token');
    if (!token) {
      errorMessage.value = "Usuário não autenticado.";
      isLoading.value = false;
      return;
    }

    // Busca Cacheta
    const cachetaResponse = await fetch(`${CACHETA_API_URL}/api/table`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (cachetaResponse.ok) {
      cachetaTablesRaw.value = await cachetaResponse.json();
    }

    // MOCK DE MEINHO (Apenas para o visual funcionar enquanto a API não é ligada)
    if (meinhoRooms.value.length === 0) {
      meinhoRooms.value = [
         { id: 901, name: "Meinho dos Cria", description: "Sala amigável", participantsCount: 2, maxParticipants: 6, entryFee: 10, prizePool: 60, mode: "MEINHO", startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString(), isJoined: false, isFavorite: true },
         { id: 902, name: "High Stakes VIP", description: "Só para os fortes", participantsCount: 6, maxParticipants: 6, entryFee: 500, prizePool: 3000, mode: "MEINHO", startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString(), isJoined: false, isFavorite: false }
      ];
    }

    errorMessage.value = '';
  } catch (error: any) {
    errorMessage.value = "Erro ao conectar com os servidores de jogo.";
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

// =======================================================================
// ADAPTAÇÃO DE DADOS (CACHETA -> LOBBY CARDS)
// =======================================================================
const mappedCachetaTables = computed(() => {
  return cachetaTablesRaw.value.map(table => {
    const startDate = new Date(Date.now() - 3600000).toISOString(); 
    const endDate = new Date(Date.now() + 86400000).toISOString(); 

    return {
      id: table.id,
      name: table.hasPassword ? `🔒 ${table.name}` : table.name,
      description: `Mesa de Cacheta. Ante: R$ ${table.ante} | Rake: ${table.rake}%`,
      participantsCount: table.currentPlayers,
      maxParticipants: table.maxPlayers,
      entryFee: table.minBuyIn,
      prizePool: table.minBuyIn * table.currentPlayers, 
      mode: 'CACHETA',
      startDate: startDate,
      endDate: endDate,
      isJoined: false, 
      isFavorite: false,
      hasPassword: table.hasPassword
    };
  });
});

const featuredCachetaTables = computed(() => {
  return mappedCachetaTables.value.filter(room => room.participantsCount > 0);
});

// =======================================================================
// AÇÕES DE ROTEAMENTO (SEPARADAS POR JOGO)
// =======================================================================
const entrarNaCacheta = (roomId: number) => {
  processingId.value = roomId;
  setTimeout(() => {
    router.push(`/mesa-cacheta/${roomId}`);
    processingId.value = null;
  }, 600);
};

const entrarNoMeinho = (roomId: number) => {
  processingId.value = roomId;
  setTimeout(() => {
    router.push(`/lobby/${roomId}`); 
    processingId.value = null;
  }, 600);
};

// =======================================================================
// LIFECYCLE
// =======================================================================
onMounted(() => {
  fetchAllGames();
  pollInterval = setInterval(fetchAllGames, 5000); 
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
.screen-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000;
  background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%);
  font-family: 'Montserrat', Arial, sans-serif;
  overflow: hidden;
}

.global-lobby-container {
  width: 100vw;
  max-width: 1400px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 40px;
}

/* Scrollbar invisível/elegante para o container principal */
.global-lobby-container::-webkit-scrollbar {
  width: 8px;
}
.global-lobby-container::-webkit-scrollbar-thumb {
  background: #38bdf8;
  border-radius: 4px;
}

.header-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px 40px 20px 40px;
  background: linear-gradient(to bottom, rgba(10, 15, 24, 0.95), transparent);
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(10px);
}

.header-titles h2 {
  color: #fff;
  margin: 0;
  font-size: 28px;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: 1px;
  text-shadow: 0 2px 10px rgba(56, 189, 248, 0.5);
}

.header-titles .subtitle {
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
}

.btn-create {
  background: linear-gradient(to bottom, #38bdf8, #0284c7);
  border: 1px solid #0c4a6e;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 900;
  text-transform: uppercase;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0px 4px 15px rgba(2, 132, 199, 0.5);
  transition: all 0.2s;
}

.btn-create:hover {
  filter: brightness(1.2);
  transform: translateY(-2px);
}

.games-feed {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 20px;
}

.game-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.divider {
  height: 1px;
  width: 90%;
  margin: 10px auto;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
}

.loading-state, .error-message, .empty-state {
  text-align: center;
  margin-top: 50px;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.empty-state {
  background: rgba(255,255,255,0.02);
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 30px;
  margin: 0 20px;
}

.error-message {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 15px;
  border-radius: 8px;
  border: 1px dashed #ef4444;
  margin: 20px;
}

.loader-spin { 
  width: 40px; 
  height: 40px; 
  border: 4px solid rgba(56, 189, 248, 0.3); 
  border-top-color: #38bdf8; 
  border-radius: 50%; 
  animation: spin 1s linear infinite; 
}

@keyframes spin { 
  to { transform: rotate(360deg); } 
}

/* Responsividade Básica */
@media (max-width: 768px) {
  .header-area {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
    padding: 20px;
  }
  .games-feed {
    padding: 0 5px;
  }
}
</style>