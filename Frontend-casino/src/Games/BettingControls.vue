<template>
  <div class="player-controls">
    
    <div class="action-buttons">
      <button class="skip-btn" @click="$emit('pular')">PULAR</button>

      <button class="confirm-bet-btn" @click="$emit('apostar', localBetAmount)">
        <span class="btn-text">APOSTAR</span>
        <span class="bet-val">R$ {{ localBetAmount }}</span>
      </button>
    </div>

    <div class="slider-wrapper">
      <span class="val-max">{{ maxBet }}</span>
      <input 
        type="range" 
        orient="vertical"
        :min="minBet" 
        :max="maxBet" 
        v-model.number="localBetAmount"
        class="vertical-slider"
      />
      <span class="val-min">{{ minBet }}</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  minBet: number;
  maxBet: number;
}>();

defineEmits(['pular', 'apostar']);

const localBetAmount = ref(props.minBet);

watch(() => props.minBet, (newVal) => {
  localBetAmount.value = newVal;
});
</script>

<style scoped>
.player-controls {
  position: relative;
  width: 100%;
  /* MÁGICA AQUI: O CSS Grid força o elemento central a ficar exatamente no meio da tela */
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: flex-end;
  pointer-events: none; 
  /* Empurra o bloco todo mais para baixo na tela, fugindo do avatar */
  transform: translateY(15px); 
}

.player-controls > * {
  pointer-events: auto; 
}

.action-buttons {
  grid-column: 2; /* Trava os botões na coluna central do Grid */
  display: flex;
  align-items: flex-end;
  gap: 10px; /* Distância menor entre os dois botões */
  padding-bottom: 5px; /* Alinha a base dos botões com a base do slider */
}

/* === BOTÃO PULAR (SLIM) === */
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

/* === BOTÃO APOSTAR (SLIM) === */
.confirm-bet-btn {
  /* 👇 AQUI: Mudamos para um gradiente verde mais escuro e sólido */
  background: linear-gradient(to bottom, #27ae60, #145a32);
  /* 👇 AQUI: Borda verde bem escura para acompanhar */
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
  /* Aumentei levemente a sombra do texto para destacar ainda mais no fundo escuro */
  text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
}

.confirm-bet-btn .bet-val {
  font-size: 12px;
  color: #fff;
  font-weight: bold;
  margin-top: 2px;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
}

/* === SLIDER VERTICAL MAIS GROSSO === */
.slider-wrapper {
  grid-column: 3; /* Fica na coluna da direita */
  justify-self: start; /* Gruda no limite esquerdo da sua coluna (logo após os botões) */
  margin-left: 15px; /* O respiro exato entre os botões e a barra */
  
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(10, 15, 24, 0.85);
  border: 1px solid #1a2639;
  border-radius: 16px;
  padding: 10px 5px;
  color: white;
  font-weight: bold;
  font-size: 11px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.6);
}

.val-max { color: #f1c40f; } 
.val-min { color: #888; }

.vertical-slider {
  -webkit-appearance: slider-vertical; 
  appearance: slider-vertical;
  width: 26px; 
  height: 120px; 
  margin: 8px 0;
  cursor: pointer;
  accent-color: #3ce48a;
}
</style>