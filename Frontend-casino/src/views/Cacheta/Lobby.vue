<template>
  <div class="screen-wrapper">
    <div class="lobby-box">
      <div class="header-area">
        <button class="btn-back" @click="router.push('/lobby')">← Voltar pro Meinho</button>
        <h2>Lobby - Cacheta</h2>
        <button class="btn-create" @click="router.push('/criar-mesa-cacheta')">+ Criar Mesa</button>
      </div>

      <div v-if="isLoading" class="loading-state">
        Buscando mesas de Cacheta...
      </div>

      <div v-else-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div v-else-if="tables.length === 0" class="empty-state">
        Nenhuma mesa de Cacheta ativa no momento.<br>
        <span class="sub-text">Seja o primeiro a criar uma!</span>
      </div>

      <div v-else class="tables-list">
        <div 
          v-for="table in tables" 
          :key="table.id" 
          class="table-card" 
          @click="entrarNaMesa(table)"
        >
          <div class="table-info">
            <div class="table-name">
              <span v-if="table.hasPassword" class="lock-icon">🔒</span>
              {{ table.name }}
            </div>
            <div class="table-details">
              <span><strong>Buy-in:</strong> R$ {{ table.minBuyIn }}</span>
              <span><strong>Ante:</strong> R$ {{ table.ante }}</span>
              <span><strong>Rake:</strong> {{ table.rake }}%</span>
            </div>
          </div>
          <div class="table-players">
            <div class="players-count" :class="{ 'full': table.currentPlayers >= table.maxPlayers }">
              👥 {{ table.currentPlayers }} / {{ table.maxPlayers }}
            </div>
            <button class="btn-play">JOGAR</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const tables = ref<any[]>([]);
const isLoading = ref(true);
const errorMessage = ref('');
let pollInterval: ReturnType<typeof setInterval> | null = null;

const CACHETA_API_URL = import.meta.env.VITE_CACHETA_API_URL || 'https://cacheta.magic-casino.online';

const fetchTables = async () => {
  try {
    const token = localStorage.getItem('magic_token');
    if (!token) return;

    const response = await fetch(`${CACHETA_API_URL}/api/table`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Falha ao carregar mesas.');
    tables.value = await response.json();
    errorMessage.value = '';
  } catch (error: any) {
    errorMessage.value = "Erro ao conectar com o servidor da Cacheta.";
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

const entrarNaMesa = (table: any) => {
  // Se tiver senha, no futuro você pode abrir um modal aqui pedindo a senha
  // Por enquanto, apenas redireciona para a mesa da Cacheta
  router.push(`/mesa-cacheta/${table.id}`);
};

onMounted(() => {
  fetchTables();
  pollInterval = setInterval(fetchTables, 5000); // Atualiza a lista a cada 5 segundos
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
  font-family: Arial, sans-serif;
}

.lobby-box {
  width: 95%;
  max-width: 600px;
  height: 85vh;
  background: rgba(10, 15, 24, 0.95);
  border: 2px solid #38bdf8; /* Azul claro para diferenciar da Cacheta */
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
}

.header-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.header-area h2 {
  color: #fff;
  margin: 0;
  font-size: 22px;
}

.btn-back {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-weight: bold;
}

.btn-create {
  background: linear-gradient(to bottom, #38bdf8, #0284c7);
  border: 1px solid #0c4a6e;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0px 4px 6px rgba(0,0,0,0.4);
  transition: transform 0.1s;
}

.btn-create:active {
  transform: translateY(2px);
}

.tables-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 5px;
}

.tables-list::-webkit-scrollbar {
  width: 6px;
}
.tables-list::-webkit-scrollbar-thumb {
  background: #38bdf8;
  border-radius: 4px;
}

.table-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.table-card:hover {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
  transform: translateY(-2px);
}

.table-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.table-name {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 6px;
}

.lock-icon {
  font-size: 12px;
}

.table-details {
  display: flex;
  gap: 15px;
  color: #94a3b8;
  font-size: 12px;
}

.table-details strong {
  color: #cbd5e1;
}

.table-players {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.players-count {
  background: #1e293b;
  color: #38bdf8;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  border: 1px solid #0f172a;
}

.players-count.full {
  color: #ef4444;
}

.btn-play {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border: 1px solid #38bdf8;
  padding: 6px 16px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 12px;
  cursor: pointer;
}

.table-card:hover .btn-play {
  background: #38bdf8;
  color: #0f172a;
}

.loading-state, .error-message, .empty-state {
  text-align: center;
  margin-top: 50px;
  color: #94a3b8;
}

.error-message {
  color: #ef4444;
}

.empty-state .sub-text {
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
  display: block;
}
</style>