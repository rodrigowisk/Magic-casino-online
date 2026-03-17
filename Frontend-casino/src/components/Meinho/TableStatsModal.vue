<template>
  <div v-if="isOpen" class="menu-overlay" @click.self="closeModal">
    <div class="stats-content">
      
      <div class="menu-header">
        <h3 class="panel-title">Estatísticas</h3>
        <button class="close-btn" @click="closeModal">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="menu-body">
        
        <div class="stats-grid header">
          <div class="col-jogador">Jogador</div>
          <div class="col-buyin">Buy-in</div>
          <div class="col-lucro">Balanço</div>
        </div>

        <div class="stats-list">
          <div v-for="p in activePlayers" :key="p.userId" class="stats-grid stats-row">
            <div class="col-jogador player-name">{{ truncateName(p.name) }}</div>
            <div class="col-buyin text-muted">R$ {{ (p.totalBuyIn || 0).toFixed(2).replace('.', ',') }}</div>
            <div class="col-lucro" :class="profitClass(p)">
              {{ formatProfit(p) }}
            </div>
          </div>
          
          <div v-if="activePlayers.length === 0" class="empty-state">
            Nenhum jogador na mesa.
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  players: any[];
}>();

const emit = defineEmits(['update:isOpen']);

const closeModal = () => {
  emit('update:isOpen', false);
};

const activePlayers = computed(() => {
  return props.players.filter(p => p.isSeated);
});

const truncateName = (name: string) => {
  if (!name) return 'Livre';
  return name.length > 8 ? name.substring(0, 8) + '...' : name;
};

// 👇 NOVA MATEMÁTICA AQUI: (Fichas + Saques) - Compras
const profitClass = (player: any) => {
  const profit = (player.chips + (player.totalCashOut || 0)) - (player.totalBuyIn || 0);
  if (profit > 0) return 'text-green';
  if (profit < 0) return 'text-red';
  return 'text-gray';
};

const formatProfit = (player: any) => {
  const profit = (player.chips + (player.totalCashOut || 0)) - (player.totalBuyIn || 0);
  if (profit > 0) return `+ R$ ${profit.toFixed(2).replace('.', ',')}`;
  if (profit < 0) return `- R$ ${Math.abs(profit).toFixed(2).replace('.', ',')}`;
  return 'R$ 0,00';
};
</script>

<style scoped>
.menu-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 430px; 
  height: 900px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 500; 
}

.stats-content {
  position: absolute;
  right: 0;          
  top: 20px;         
  width: 320px;      
  background: linear-gradient(135deg, rgba(20, 28, 45, 0.95), rgba(10, 15, 25, 0.98));
  border: 1px solid rgba(0, 243, 255, 0.4);
  border-right: none; 
  border-radius: 16px 0 0 16px; 
  box-shadow: -15px 5px 35px rgba(0,0,0,0.8), inset 5px 0 20px rgba(0, 243, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideInRightTop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1);
}

@keyframes slideInRightTop {
  0% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

.menu-header {
  display: flex;
  justify-content: space-between; 
  align-items: center;
  padding: 12px 16px 10px 16px; 
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.panel-title {
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
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close-btn:hover { color: #fff; }
.close-btn svg { width: 22px; height: 22px; }

.menu-body {
  display: flex;
  flex-direction: column;
  padding: 12px; 
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr; 
  align-items: center;
  gap: 5px;
}

.header {
  padding: 0 5px 8px 5px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.65rem; 
  font-family: Arial, sans-serif;
  font-weight: bold;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
}

.stats-row {
  background: rgba(0, 243, 255, 0.05);
  border: 1px solid rgba(0, 243, 255, 0.1);
  border-radius: 8px;
  padding: 10px 8px;
  font-size: 0.8rem; 
  font-family: Arial, sans-serif;
  font-weight: bold;
}

.col-jogador { text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-buyin { text-align: center; white-space: nowrap; }
.col-lucro { text-align: right; white-space: nowrap; }

.player-name { color: #fff; }
.text-muted { color: rgba(255, 255, 255, 0.6); font-size: 0.75rem; }
.text-green { color: #4ade80; text-shadow: 0 0 5px rgba(74, 222, 128, 0.3); }
.text-red { color: #f87171; text-shadow: 0 0 5px rgba(248, 113, 113, 0.3); }
.text-gray { color: #94a3b8; }

.empty-state {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 20px 0;
  font-family: Arial, sans-serif;
  font-size: 12px;
}
</style>