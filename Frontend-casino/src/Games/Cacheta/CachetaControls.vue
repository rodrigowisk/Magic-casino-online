<template>
  <div class="player-controls">
    
    <div class="action-buttons" v-if="!hasDrawnThisTurn">
      <button 
        class="action-btn lixo-btn" 
        :disabled="!canDrawFromDiscard || hasFurou"
        @click="$emit('draw', true)"
        :title="hasFurou ? 'Você furou e só pode comprar do monte!' : 'Comprar a carta aberta no lixo'"
      >
        COMPRAR LIXO
      </button>

      <button 
        class="action-btn monte-btn" 
        @click="$emit('draw', false)"
        title="Comprar carta fechada do monte"
      >
        COMPRAR MONTE
      </button>
    </div>

    <div class="action-buttons" v-else>
      <div class="discard-hint" v-if="!selectedCard">
        Selecione a carta para descartar ou bater direto
      </div>

      <button 
        class="action-btn bater-btn" 
        @click="$emit('declareWin', selectedCard)"
        title="Bater na mesa (Vitória)"
      >
        <span class="btn-text">🏆 BATER</span>
      </button>

      <button 
        class="action-btn discard-btn" 
        :disabled="!selectedCard"
        @click="$emit('discard', selectedCard)"
      >
        <span class="btn-text">DESCARTAR</span>
        <span class="card-val" v-if="selectedCard">{{ selectedCard }}</span>
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

const props = defineProps<{
  hasDrawnThisTurn: boolean;
  canDrawFromDiscard: boolean;
  selectedCard: string | null; 
  hasFurou: boolean;
}>();

defineEmits(['draw', 'discard', 'declareWin']);
</script>

<style scoped>
.player-controls {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  pointer-events: none; 
  transform: translateY(15px); 
}

.player-controls > * {
  pointer-events: auto; 
}

.action-buttons {
  display: flex;
  align-items: flex-end;
  gap: 15px; 
  padding-bottom: 5px;
}

.action-btn {
  color: white;
  width: 120px; 
  height: 55px; 
  font-family: Arial, sans-serif;
  font-size: 13px;
  font-weight: 800;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.2), 0px 4px 6px rgba(0,0,0,0.5);
  text-transform: uppercase;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  transition: all 0.1s ease;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.action-btn:not(:disabled):active { 
  transform: translateY(3px);
  box-shadow: inset 0px 1px 1px rgba(255,255,255,0.1), 0px 1px 2px rgba(0,0,0,0.5);
}

.action-btn:disabled {
  background: linear-gradient(to bottom, #475569, #1e293b);
  border: 1px solid #0f172a;
  color: #94a3b8;
  cursor: not-allowed;
  text-shadow: none;
  box-shadow: none;
  animation: none; 
}

.lixo-btn {
  background: linear-gradient(to bottom, #f39c12, #d35400);
  border: 1px solid #a04000;
}

.monte-btn {
  background: linear-gradient(to bottom, #3498db, #2980b9);
  border: 1px solid #1a5276;
}

.bater-btn {
  background: linear-gradient(135deg, #ff0055, #ffaa00);
  border: 1px solid #ff0055;
  width: 120px;
  animation: pulseBater 1.5s infinite;
}

.bater-btn .btn-text {
  font-size: 15px;
  font-weight: 900;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
}

@keyframes pulseBater {
  0% { box-shadow: 0 0 5px rgba(255, 0, 85, 0.4); }
  50% { box-shadow: 0 0 20px rgba(255, 0, 85, 0.8), inset 0px 2px 2px rgba(255,255,255,0.4); }
  100% { box-shadow: 0 0 5px rgba(255, 0, 85, 0.4); }
}

.discard-btn {
  background: linear-gradient(to bottom, #e74c3c, #c0392b);
  border: 1px solid #922b21;
  width: 140px; 
}

.discard-btn .btn-text {
  font-size: 14px;
}

.discard-btn .card-val {
  font-size: 16px;
  color: #fff;
  font-weight: 900;
  margin-top: 2px;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
}

.discard-hint {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 4px 10px;
  border-radius: 12px;
  color: #f1c40f;
  font-size: 11px;
  font-weight: bold;
  white-space: nowrap;
  border: 1px solid rgba(241, 196, 15, 0.3);
}
</style>