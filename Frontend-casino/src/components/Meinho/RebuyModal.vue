<template>
  <div class="rebuy-modal-overlay">
    <div class="rebuy-modal">
      <h2>Suas fichas acabaram!</h2>
      <p>Você deseja continuar no jogo?</p>
      <p class="balance-info">Conta Geral: R$ {{ maxBalance }}</p>
      
      <div class="slider-container">
        <label>Comprar: R$ {{ localRebuyAmount }}</label>
        <input 
          type="range" 
          :min="minBuyIn" 
          :max="maxBalance" 
          v-model.number="localRebuyAmount" 
          class="styled-slider" 
        />
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('cancel')">Não (Levantar)</button>
        <button class="btn-confirm" @click="$emit('confirm', localRebuyAmount)">Sim (Comprar)</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{
  minBuyIn: number;
  maxBalance: number;
}>();

// Define os eventos que serão enviados para a mesa principal
const emit = defineEmits(['confirm', 'cancel']);

// O valor do rebuy fica isolado dentro do modal
const localRebuyAmount = ref(props.minBuyIn);

// Garante que o slider nunca fique abaixo da aposta mínima se ela mudar
watch(() => props.minBuyIn, (newVal) => {
  if (localRebuyAmount.value < newVal) {
    localRebuyAmount.value = newVal;
  }
});

onMounted(() => {
  if (localRebuyAmount.value < props.minBuyIn) {
    localRebuyAmount.value = props.minBuyIn;
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
  font-size: 14px; 
  margin: 10px 0; 
}

.balance-info { 
  color: #3ce48a; 
  font-weight: bold; 
  font-size: 16px !important;
  margin-bottom: 20px !important;
}

.slider-container { 
  margin: 25px 0; 
}

.slider-container label { 
  display: block; 
  margin-bottom: 10px; 
  font-weight: bold; 
  font-size: 16px; 
  color: #fff;
}

.styled-slider { 
  width: 100%; 
  accent-color: #3ce48a; 
  cursor: pointer;
}

.modal-actions { 
  display: flex; 
  justify-content: space-between; 
  margin-top: 25px; 
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
  background: #e74c3c; 
  color: white; 
}

.btn-confirm { 
  background: #3ce48a; 
  color: #000; 
}
</style>