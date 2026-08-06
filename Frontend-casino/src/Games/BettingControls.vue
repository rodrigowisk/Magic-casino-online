<template>
  <div class="player-controls">
    
    <div class="action-buttons">
      <!-- 🔥 A BALA DE PRATA: Usamos @pointerup no lugar de @click. 
           O @click vazio absorve os cliques fantasmas de foco/teclado e não faz NADA. -->
      <button 
        class="skip-btn" 
        :disabled="isClickLocked" 
        @pointerup.prevent.stop="acionarPular" 
        @click.prevent.stop 
        @keyup.prevent 
        @keydown.prevent
      >
        PULAR
      </button>

      <button 
        class="confirm-bet-btn" 
        :disabled="isClickLocked" 
        @pointerup.prevent.stop="acionarApostar" 
        @click.prevent.stop 
        @keyup.prevent 
        @keydown.prevent
      >
        <span class="btn-text">APOSTAR</span>
        <span class="bet-val">R$ {{ formatValue(localBetAmount) }}</span>
      </button>
    </div>

    <div class="slider-wrapper">
      <span class="val-max" @pointerup="setExactValue(maxBet)" @click.prevent title="Apostar Máximo">{{ formatValue(maxBet) }}</span>
      
      <div class="range-container">
        <input 
          type="range" 
          :min="minBet" 
          :max="maxBet" 
          step="0.01"
          v-model.number="sliderValue"
          class="custom-range"
          @pointerdown="isDragging = true"
          @pointerup="isDragging = false"
          @change="isDragging = false"
        />
      </div>

      <span class="val-min" @pointerup="setExactValue(minBet)" @click.prevent title="Apostar Mínimo">{{ formatValue(minBet) }}</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';

// 👇 Importamos o nosso motor de vibração profissional
import { hapticsService } from '../services/haptics';

const props = defineProps<{
  minBet: number;
  maxBet: number;
}>();

const emit = defineEmits(['pular', 'apostar']);

const localBetAmount = ref(props.minBet);
const isDragging = ref(false); 

// 🔥 COMEÇA TRAVADO!
const isClickLocked = ref(true);

const aplicarTravaDeSeguranca = () => {
  isClickLocked.value = true;
  setTimeout(() => {
    isClickLocked.value = false;
  }, 700);
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    aplicarTravaDeSeguranca();
  }
};

onMounted(() => {
  aplicarTravaDeSeguranca();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', aplicarTravaDeSeguranca);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('focus', aplicarTravaDeSeguranca);
});

watch(() => props.minBet, (newVal) => {
  if (!isDragging.value) {
    localBetAmount.value = newVal;
  }
});

const formatValue = (val: number) => {
  if (Number.isInteger(val)) return val.toString();
  return Number(val).toFixed(2).replace('.', ',');
};

const setExactValue = (val: number) => {
  hapticsService.lightImpact(); 
  localBetAmount.value = val;
};

// Variável para bloquear duplo-clique físico acidental
let lastActionTime = 0;

const acionarPular = (e: Event) => {
  if (isClickLocked.value) return;
  if (Date.now() - lastActionTime < 1000) return; // Trava física de 1 segundo
  
  isClickLocked.value = true;
  lastActionTime = Date.now();
  
  // Arranca o foco residual do navegador
  if (e && e.currentTarget) {
    (e.currentTarget as HTMLElement).blur();
  }
  
  hapticsService.lightImpact(); 
  emit('pular');
};

const acionarApostar = (e: Event) => {
  if (isClickLocked.value) return;
  if (Date.now() - lastActionTime < 1000) return; 

  isClickLocked.value = true;
  lastActionTime = Date.now();
  
  if (e && e.currentTarget) {
    (e.currentTarget as HTMLElement).blur();
  }

  hapticsService.lightImpact(); 
  emit('apostar', localBetAmount.value);
};

const dynamicStep = computed(() => {
  const range = props.maxBet - props.minBet;
  if (range <= 50) return 1;      
  if (range <= 200) return 5;     
  if (range <= 1000) return 10;   
  if (range <= 5000) return 50;   
  return 100;                     
});

const sliderValue = computed({
  get() {
    return localBetAmount.value;
  },
  set(val: number) {
    if (val >= props.maxBet - 0.001) {
      localBetAmount.value = props.maxBet;
    } 
    else if (val <= props.minBet + 0.001) {
      localBetAmount.value = props.minBet;
    } 
    else {
      const step = dynamicStep.value;
      let snapped = Math.round(val / step) * step;
      
      if (snapped >= props.maxBet) snapped = props.maxBet;
      if (snapped <= props.minBet) snapped = props.minBet;
      
      localBetAmount.value = snapped;
    }
  }
});
</script>

<style scoped>
.player-controls {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: flex-end;
  pointer-events: none; 
  transform: translateY(-25px); 
}

.player-controls > * {
  pointer-events: auto; 
}

.action-buttons {
  grid-column: 2; 
  display: flex;
  align-items: flex-end;
  gap: 10px; 
  padding-bottom: 5px; 
}

.skip-btn {
  background: linear-gradient(to bottom, #e74c3c, #c0392b);
  border: 1px solid #922b21;
  color: white;
  width: 85px; 
  height: 50px; 
  font-family: Arial, sans-serif;
  font-size: 14px;
  font-weight: 800;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.2), 0px 4px 6px rgba(0,0,0,0.5);
  text-transform: uppercase;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  transition: all 0.1s ease;
  outline: none; 
}

.skip-btn:active:not(:disabled) { 
  transform: translateY(3px);
  box-shadow: inset 0px 1px 1px rgba(255,255,255,0.1), 0px 1px 2px rgba(0,0,0,0.5);
}

.confirm-bet-btn {
  background: linear-gradient(to bottom, #27ae60, #145a32);
  border: 1px solid #0e3e23;
  color: white;
  width: 105px; 
  height: 50px; 
  font-family: Arial, sans-serif;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.2), 0px 4px 6px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-transform: uppercase;
  transition: all 0.1s ease;
  outline: none;
}

.confirm-bet-btn:active:not(:disabled) { 
  transform: translateY(3px);
  box-shadow: inset 0px 1px 1px rgba(255,255,255,0.1), 0px 1px 2px rgba(0,0,0,0.5);
}

.confirm-bet-btn .btn-text {
  font-size: 13px;
  font-weight: 900;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
}

.confirm-bet-btn .bet-val {
  font-size: 12px;
  color: #fff;
  font-weight: bold;
  margin-top: 2px;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
}

.slider-wrapper {
  grid-column: 3; 
  justify-self: start; 
  margin-left: 15px; 
  
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(10, 15, 24, 0.85);
  border: 1px solid #1a2639;
  
  border-radius: 6px; 
  padding: 10px 10px; 
  
  color: white;
  font-weight: bold;
  font-size: 11px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.6);
}

.val-max { 
  color: #f1c40f; 
  cursor: pointer; 
  transition: transform 0.1s;
  padding: 2px;
} 
.val-max:active { transform: scale(1.15); }

.val-min { 
  color: #888; 
  cursor: pointer; 
  transition: transform 0.1s;
  padding: 2px;
}
.val-min:active { transform: scale(1.15); }

.range-container {
  width: 40px; 
  height: 130px; 
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 4px 0;
}

.custom-range {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  width: 130px; 
  height: 40px; 
  
  transform: rotate(-90deg); 
  outline: none;
  margin: 0;
}

.custom-range::-webkit-slider-runnable-track {
  width: 100%;
  height: 14px; 
  background: #111a26;
  border-radius: 8px;
  border: 1px solid #080d14;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.8);
}

.custom-range::-moz-range-track {
  width: 100%;
  height: 14px;
  background: #111a26;
  border-radius: 8px;
  border: 1px solid #080d14;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.8);
}

.custom-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 26px;
  width: 26px;
  border-radius: 50%;
  background: #3ce48a; 
  cursor: pointer;
  margin-top: -7px; 
  box-shadow: 0 2px 6px rgba(0,0,0,0.9), inset 0 -2px 3px rgba(0,0,0,0.3);
  border: 2px solid #fff;
}

.custom-range::-moz-range-thumb {
  height: 26px;
  width: 26px;
  border-radius: 50%;
  background: #3ce48a;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.9), inset 0 -2px 3px rgba(0,0,0,0.3);
  border: 2px solid #fff;
}
</style>