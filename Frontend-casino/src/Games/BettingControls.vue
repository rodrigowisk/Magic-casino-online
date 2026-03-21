<template>
  <div class="player-controls">
    
    <div class="action-buttons">
      <button class="skip-btn" @click="$emit('pular')">PULAR</button>

      <button class="confirm-bet-btn" @click="$emit('apostar', localBetAmount)">
        <span class="btn-text">APOSTAR</span>
        <span class="bet-val">R$ {{ formatValue(localBetAmount) }}</span>
      </button>
    </div>

    <div class="slider-wrapper">
      <span class="val-max" @click="setExactValue(maxBet)" title="Apostar Máximo">{{ formatValue(maxBet) }}</span>
      
      <div class="range-container">
        <input 
          type="range" 
          :min="minBet" 
          :max="maxBet" 
          step="0.01"
          v-model.number="sliderValue"
          class="custom-range"
        />
      </div>

      <span class="val-min" @click="setExactValue(minBet)" title="Apostar Mínimo">{{ formatValue(minBet) }}</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

const props = defineProps<{
  minBet: number;
  maxBet: number;
}>();

defineEmits(['pular', 'apostar']);

const localBetAmount = ref(props.minBet);

watch(() => props.minBet, (newVal) => {
  localBetAmount.value = newVal;
});

// Inteligência que formata o valor visualmente para o Brasil
const formatValue = (val: number) => {
  if (Number.isInteger(val)) return val.toString();
  return Number(val).toFixed(2).replace('.', ',');
};

// Força o valor exato (com ou sem centavos) se o usuário clicar nos números da ponta
const setExactValue = (val: number) => {
  localBetAmount.value = val;
};

// Inteligência que controla a "velocidade" dos números da barra
const dynamicStep = computed(() => {
  const range = props.maxBet - props.minBet;
  if (range <= 50) return 1;      // Sobe de 1 em 1
  if (range <= 200) return 5;     // Sobe de 5 em 5
  if (range <= 1000) return 10;   // Sobe de 10 em 10
  if (range <= 5000) return 50;   // Sobe de 50 em 50
  return 100;                     // Para potes milionários
});

// Interceptador (Mágica): Garante inteiros no meio da barra e exatos (com centavos) nas pontas
const sliderValue = computed({
  get() {
    return localBetAmount.value;
  },
  set(val: number) {
    // Se arrastar até o fim, aplica o valor máximo EXATO (All-in com centavos)
    if (val >= props.maxBet - 0.001) {
      localBetAmount.value = props.maxBet;
    } 
    // Se arrastar pro começo, aplica o valor mínimo EXATO
    else if (val <= props.minBet + 0.001) {
      localBetAmount.value = props.minBet;
    } 
    // Valores intermediários na barra: Corta os centavos e arredonda pelos blocos definidos
    else {
      const step = dynamicStep.value;
      let snapped = Math.round(val / step) * step;
      
      // Proteção garantindo que a barra não ultrapasse os limites devido a arredondamentos
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
  transform: translateY(15px); 
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

/* === BOTÃO PULAR === */
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
}

.skip-btn:active { 
  transform: translateY(3px);
  box-shadow: inset 0px 1px 1px rgba(255,255,255,0.1), 0px 1px 2px rgba(0,0,0,0.5);
}

/* === BOTÃO APOSTAR === */
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
}

.confirm-bet-btn:active { 
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

/* === SLIDER WRAPPER === */
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

/* === CONSTRUÇÃO DO NOVO SLIDER GROSSO === */
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

/* === Barrinha de dentro === */
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

/* === Bolinha (Thumb) === */
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