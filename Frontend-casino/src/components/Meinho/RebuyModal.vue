<template>
  <div class="rebuy-modal-overlay" @click.self="$emit('cancel')">
    <div class="rebuy-modal">
      
      <template v-if="maxBalance < minRebuy">
        <h2>Saldo Insuficiente</h2>
        <p>Você precisa de pelo menos R$ {{ formatValue(minRebuy) }} para completar a mesa.</p>
        <div class="balance-container">
          <p class="balance-info">Na Mesa: R$ {{ formatValue(currentChips) }}</p>
          <p class="balance-info">Conta Geral: R$ {{ formatValue(maxBalance) }}</p>
        </div>
        
        <div class="modal-actions-single">
          <button class="btn-cancel full-width" @click="$emit('cancel')">Fechar / Levantar</button>
        </div>
      </template>

      <template v-else>
        <h2 v-if="currentChips === 0">Suas fichas acabaram!</h2>
        <h2 v-else>Recarregar Fichas</h2>
        
        <p v-if="currentChips === 0">Você deseja continuar no jogo?</p>
        <p v-else>Adicione fichas até o limite máximo da mesa.</p>
        
        <div class="balance-container">
          <p class="balance-info mesa-val">Na Mesa: R$ {{ formatValue(currentChips) }}</p>
          <p class="balance-info conta-val">Conta Geral: R$ {{ formatValue(maxBalance) }}</p>
        </div>
        
        <div class="slider-container">
          <label>Adicionar: R$ {{ formatValue(localRebuyAmount) }}</label>
          <input 
            type="range" 
            :min="minRebuy" 
            :max="maxRebuy" 
            step="5"
            v-model.number="localRebuyAmount" 
            class="styled-slider" 
          />
          <div class="range-labels">
            <span @click="localRebuyAmount = minRebuy">Min: R$ {{ formatValue(minRebuy) }}</span>
            <span @click="localRebuyAmount = maxRebuy">Max: R$ {{ formatValue(maxRebuy) }}</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="$emit('cancel')">Cancelar</button>
          <button class="btn-confirm" @click="$emit('confirm', localRebuyAmount)">Confirmar</button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';

const props = defineProps<{
  minBuyIn: number;
  maxBalance: number;
  currentChips: number; // NOVO: Propriedade que recebe as fichas que já estão na mesa
}>();

const emit = defineEmits(['confirm', 'cancel']);

const formatValue = (val: number) => {
  return Number(val).toFixed(2).replace('.', ',');
};

// 🧠 INTELIGÊNCIA: Calcula quanto falta para inteirar o Buy-in Mínimo.
const minRebuy = computed(() => {
  const deficit = props.minBuyIn - props.currentChips;
  const absoluteMin = deficit > 0 ? deficit : 10; // Se ele já tem o mínimo, o rebuy base é 10
  return Math.min(absoluteMin, props.maxBalance); 
});

// 🧠 INTELIGÊNCIA: Calcula o limite máximo da mesa (Ex: 10x o Buy-in Mínimo)
const maxRebuy = computed(() => {
  const tableAbsoluteMax = props.minBuyIn * 10; 
  const allowedToInject = tableAbsoluteMax - props.currentChips;
  return Math.min(allowedToInject > 0 ? allowedToInject : 0, props.maxBalance);
});

const localRebuyAmount = ref(minRebuy.value);

watch(() => minRebuy.value, (newVal) => {
  localRebuyAmount.value = newVal;
});

onMounted(() => {
  if (localRebuyAmount.value < minRebuy.value) {
    localRebuyAmount.value = minRebuy.value;
  }
});
</script>

<style scoped>
.rebuy-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 430px;
  height: 900px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(5px);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
}

.rebuy-modal {
  background: linear-gradient(145deg, #1a2639, #111827);
  border: 2px solid #3ce48a;
  border-radius: 16px;
  padding: 24px;
  width: 80%;
  text-align: center;
  color: white;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
  font-family: 'Arial', sans-serif;
}

.rebuy-modal h2 { 
  margin-top: 0; 
  font-size: 20px; 
  color: #f1c40f; 
  text-transform: uppercase;
  letter-spacing: 1px;
}

.rebuy-modal p { 
  font-size: 13px; 
  margin: 10px 0; 
  color: #8da1bc;
}

.balance-container {
  display: flex;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #1a2639;
  margin: 15px 0;
}

.balance-info { 
  font-weight: bold; 
  font-size: 12px !important;
  margin: 0 !important;
}

.mesa-val { color: #f1c40f; }
.conta-val { color: #3ce48a; }

.slider-container { 
  margin: 25px 0 15px 0; 
}

.slider-container label { 
  display: block; 
  margin-bottom: 15px; 
  font-weight: 900; 
  font-size: 18px; 
  color: #fff;
}

.styled-slider { 
  width: 100%; 
  accent-color: #3ce48a; 
  cursor: pointer;
  height: 6px;
  background: #111a26;
  border-radius: 4px;
  outline: none;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 10px;
  color: #66768f;
  font-weight: bold;
}

.range-labels span {
  cursor: pointer;
}

.range-labels span:hover {
  color: #3ce48a;
}

.modal-actions { 
  display: flex; 
  justify-content: space-between; 
  margin-top: 25px; 
}

.modal-actions-single {
  display: flex;
  justify-content: center;
  margin-top: 25px;
}

.full-width {
  width: 100% !important;
}

.btn-cancel, .btn-confirm { 
  padding: 12px 15px; 
  border-radius: 8px; 
  font-weight: bold; 
  cursor: pointer; 
  border: none; 
  width: 46%; 
  text-transform: uppercase;
  font-size: 13px;
  transition: transform 0.1s ease;
}

.btn-cancel:active, .btn-confirm:active {
  transform: scale(0.95);
}

.btn-cancel { 
  background: transparent; 
  color: #e74c3c; 
  border: 1px solid #e74c3c;
}

.btn-confirm { 
  background: #3ce48a; 
  color: #000; 
}
</style>