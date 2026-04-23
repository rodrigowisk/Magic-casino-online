<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">
      
      <div class="modal-header">
        <h3 class="modal-title">Mãos Jogadas</h3>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <div class="modal-body">
        <div v-if="groupedHands.length === 0" class="empty-state">
          Nenhuma mão registrada nesta sessão ainda.
        </div>

        <div v-else class="round-container">
          
          <div class="table-headers">
            <div>Ação</div>
            <div>Cartas</div>
            <div>Vira</div>
          </div>

          <div class="players-list">
            <div v-for="(player, index) in currentRound.players" :key="index" class="history-item">
              
              <div class="info-section">
                <span class="player-name" :class="{ 'is-me': player.playerId === currentUserId }">
                  {{ truncateName(player.playerName) }}
                </span>
                <span v-if="player.betAmount > 0" class="action-badge bet">
                  R$ {{ player.betAmount }}
                </span>
                <span v-else class="action-badge fold">Correu</span>
              </div>

              <div class="hole-cards">
                <template v-if="player.betAmount > 0 || player.playerId === currentUserId">
                  <div class="mini-card mini-card-open" :class="getCardClass(player.holeCards[0])">
                    <div class="card-top-left">
                      <span class="rank">{{ parseCard(player.holeCards[0]).rank }}</span>
                      <span class="suit">{{ parseCard(player.holeCards[0]).suit }}</span>
                    </div>
                  </div>

                  <div class="mini-card mini-card-open" :class="getCardClass(player.holeCards[1])">
                    <div class="card-top-left">
                      <span class="rank">{{ parseCard(player.holeCards[1]).rank }}</span>
                      <span class="suit">{{ parseCard(player.holeCards[1]).suit }}</span>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="mini-card card-back"></div>
                  <div class="mini-card card-back"></div>
                </template>
              </div>

              <div class="community-card-wrapper">
                <template v-if="player.communityCard">
                  <div v-if="player.betAmount > 0" class="mini-card mini-card-open community" :class="getCardClass(player.communityCard)">
                    <div class="card-top-left">
                      <span class="rank">{{ parseCard(player.communityCard).rank }}</span>
                      <span class="suit">{{ parseCard(player.communityCard).suit }}</span>
                    </div>
                  </div>
                  <div v-else class="mini-card community card-back"></div>
                </template>
                <template v-else>
                  <span class="no-vira">-</span>
                </template>
              </div>

            </div>
          </div>

          <div class="pagination-controls">
            <button 
              class="nav-btn" 
              @click="nextPage" 
              :disabled="currentIndex === groupedHands.length - 1"
              title="Mão Anterior (Mais antiga)"
            >
              &#10094;
            </button>
            
            <div class="round-time">
              Mão {{ currentIndex + 1 }} de {{ groupedHands.length }}
            </div>

            <button 
              class="nav-btn" 
              @click="prevPage" 
              :disabled="currentIndex === 0"
              title="Próxima Mão (Mais recente)"
            >
              &#10095;
            </button>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed, ref, watch } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  history: any[];
  currentUserId: string;
}>();

const emit = defineEmits(['update:isOpen']);

const closeModal = () => {
  emit('update:isOpen', false);
};

const currentIndex = ref(0);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    currentIndex.value = 0; // Sempre reseta para mostrar a mais recente (Index 0)
  }
});

const truncateName = (name: string) => {
  if (!name) return 'Livre';
  return name.length > 10 ? name.substring(0, 10) + '...' : name;
};

// Lógica de Agrupamento 100% Corrigida
const groupedHands = computed(() => {
  if (!props.history || props.history.length === 0) return [];

  // 1. Garante que o histórico está em ordem cronológica antes de agrupar
  const sortedHistory = [...props.history].sort((a, b) => 
    new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
  );

  const groups: any[] = [];

  sortedHistory.forEach(item => {
    const lastGroup = groups[groups.length - 1];
    let added = false;

    if (lastGroup) {
      // Usa a última ação registrada na mão para calcular o tempo
      const lastItemInGroup = lastGroup.players[lastGroup.players.length - 1];
      const t1 = new Date(lastItemInGroup.playedAt).getTime();
      const t2 = new Date(item.playedAt).getTime();
      
      // Se este jogador JÁ ESTÁ neste grupo, é obrigatoriamente uma mão NOVA.
      const playerAlreadyInGroup = lastGroup.players.some((p: any) => p.playerId === item.playerId);

      // Agrupa se ocorreu em menos de 60 segundos desde a última ação E o jogador ainda não jogou nesta mão
      if (Math.abs(t2 - t1) < 60 * 1000 && !playerAlreadyInGroup) {
        lastGroup.players.push(item);
        added = true;
      }
    }

    // Cria uma nova "Mão" se as validações acima falharem (ou seja, nova rodada começou)
    if (!added) {
      groups.push({
        id: item.id,
        playedAt: item.playedAt,
        players: [item]
      });
    }
  });

  // 2. Inverte o array para que o Index 0 (a tela inicial do modal) seja sempre a mão mais nova!
  return groups.reverse();
});

const currentRound = computed(() => {
  if (groupedHands.value.length === 0) return null;
  return groupedHands.value[currentIndex.value];
});

// A inversão de botões faz sentido agora: "prevPage" vai para o Index menor (mais recente)
const prevPage = () => {
  if (currentIndex.value > 0) currentIndex.value--;
};

const nextPage = () => {
  if (currentIndex.value < groupedHands.value.length - 1) currentIndex.value++;
};

const getCardClass = (cardString: string) => {
  if (!cardString) return '';
  const isRed = cardString.includes('♥') || cardString.includes('♦');
  return isRed ? 'text-red' : 'text-black';
};

const parseCard = (cardString: string) => {
  if (!cardString) return { rank: '', suit: '' };
  const suit = cardString.slice(-1);
  const rank = cardString.slice(0, -1);
  return { rank, suit };
};
</script>

<style scoped>
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 👇 Fundo agora é transparente 👇 */
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  overflow: hidden;
}

/* 👇 GAVETA LATERAL MAIS ESTREITA (SLIM) 👇 */
.modal-container {
  position: absolute;
  left: 0;           
  bottom: 85px;      
  width: 320px;      /* Reduzido de 380px para 320px */
  max-height: 75vh;  
  background: linear-gradient(135deg, rgba(20, 28, 45, 0.95), rgba(10, 15, 25, 0.98));
  border: 1px solid rgba(0, 243, 255, 0.4);
  border-left: none; 
  border-radius: 0 16px 16px 0; 
  box-shadow: 15px -5px 35px rgba(0,0,0,0.8), inset -5px 0 20px rgba(0, 243, 255, 0.1);
  display: flex;
  flex-direction: column;
  animation: slideInLeftBottom 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1);
}

@keyframes slideInLeftBottom {
  0% { transform: translateX(-100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px 10px 14px;
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-title {
  color: #00f3ff;
  margin: 0;
  font-size: 14px;
  font-family: Arial, sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0 6px;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 10px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.empty-state {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 30px 0;
  font-family: Arial, sans-serif;
  font-size: 12px;
}

.round-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Redução dos gaps e recalibragem do Grid */
.table-headers {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.6fr; /* Reajustado para o formato Slim */
  gap: 4px;
  padding: 0 6px 6px 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.65rem;
  font-family: Arial, sans-serif;
  font-weight: bold;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 6px; /* Menor gap entre as linhas */
  max-height: 280px;
  overflow-y: auto;
}

.history-item {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.6fr; /* Mesmo Grid do cabeçalho */
  gap: 4px;
  align-items: center;
  background: rgba(0, 243, 255, 0.05);
  border: 1px solid rgba(0, 243, 255, 0.1);
  border-radius: 8px;
  padding: 6px 8px; /* Padding mais enxuto */
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-name {
  color: #f8fafc;
  font-family: Arial, sans-serif;
  font-weight: bold;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-name.is-me {
  color: #00f3ff;
}

.action-badge {
  font-size: 0.6rem; /* Texto do badge um pouco menor */
  padding: 2px 4px;
  border-radius: 4px;
  width: fit-content;
  font-weight: bold;
  text-transform: uppercase;
  white-space: nowrap;
}
.action-badge.bet { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.action-badge.fold { background: rgba(239, 68, 68, 0.2); color: #f87171; }

.hole-cards {
  display: flex;
}

.hole-cards .mini-card:nth-child(2) {
  margin-left: -14px; /* Mais sobreposição para economizar espaço lateral */
  box-shadow: -3px 0 5px rgba(0,0,0,0.4); 
}

.community-card-wrapper {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.no-vira {
  color: #475569;
  font-weight: bold;
  margin-left: 10px;
}

/* Cartas levemente menores para caber no modal slim */
.mini-card {
  width: 26px; 
  height: 38px;
  border-radius: 4px; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.6); 
  box-sizing: border-box;
  position: relative;
}

.mini-card-open {
  background: white;
  border: 1px solid #cbd5e1;
  overflow: hidden; 
}

.card-top-left {
  position: absolute;
  top: 1px;
  left: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.card-top-left .rank {
  font-family: Arial, sans-serif;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: -1px;
}

.card-top-left .suit {
  font-size: 9px;
  margin-top: -1px;
}

.mini-card-open.text-red { color: #ef4444; }
.mini-card-open.text-black { color: #0f172a; }

.mini-card-open.community {
  border: 2px solid #00f3ff;
}

.card-back {
  background-image: url('../../assets/imagens/deck.webp'); 
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 1px solid rgba(255, 255, 255, 0.2); 
}

.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 6px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 5px;
}

.nav-btn {
  background: rgba(0, 243, 255, 0.2);
  color: #00f3ff;
  border: 1px solid #00f3ff;
  border-radius: 6px;
  width: 30px;
  height: 30px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.nav-btn:not(:disabled):hover {
  background: #00f3ff;
  color: #000;
}

.nav-btn:disabled {
  background: rgba(255, 255, 255, 0.05);
  color: #444;
  border-color: #333;
  cursor: not-allowed;
}

.round-time {
  color: rgba(255, 255, 255, 0.6);
  font-family: Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: bold;
}
</style>