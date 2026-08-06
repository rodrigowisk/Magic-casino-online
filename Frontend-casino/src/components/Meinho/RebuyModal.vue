<template>
  <div class="rebuy-modal-overlay" @click.self="$emit('cancel')">
    <div class="rebuy-modal">
      
      <div v-if="errorMessage" class="error-warning">
        {{ errorMessage }}
      </div>

      <div v-if="currentChips === 0 && actualBalance >= minRebuy" class="timeout-warning">
        DESEJA CONTINUAR? ⏳{{ timeLeft }}s
      </div>

      <template v-if="actualBalance < minRebuy">
        <h2>Saldo Insuficiente</h2>
        <p>Você precisa de pelo menos {{ currencyIcon }} {{ formatValue(minRebuy) }} para completar a mesa.</p>
        <div class="balance-container">
          <p class="balance-info">Na Mesa: {{ currencyIcon }} {{ formatValue(currentChips) }}</p>
          <p class="balance-info">Conta Geral: {{ currencyIcon }} {{ formatValue(actualBalance) }}</p>
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
          <p class="balance-info mesa-val">Na Mesa: {{ currencyIcon }} {{ formatValue(currentChips) }}</p>
          <p class="balance-info conta-val">Conta Geral: {{ currencyIcon }} {{ formatValue(actualBalance) }}</p>
        </div>
        
        <div class="slider-container">
          <label>Adicionar: {{ currencyIcon }} {{ formatValue(localRebuyAmount) }}</label>
          <input 
            type="range" 
            :min="minRebuy" 
            :max="maxRebuy" 
            step="5"
            v-model.number="localRebuyAmount" 
            class="styled-slider" 
          />
          <div class="range-labels">
            <span @click="localRebuyAmount = minRebuy">Min: {{ currencyIcon }} {{ formatValue(minRebuy) }}</span>
            <span @click="localRebuyAmount = maxRebuy">Max: {{ currencyIcon }} {{ formatValue(maxRebuy) }}</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="$emit('cancel')">Sair da Mesa</button>
          <button class="btn-confirm" @click="$emit('confirm', localRebuyAmount)">Confirmar</button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  minBuyIn: number;
  maxBalance: number;
  currentChips: number; 
  errorMessage?: string;
}>();

const emit = defineEmits(['confirm', 'cancel']);

// LÓGICA DO MODO DE TREINO
const mode = localStorage.getItem('magic_lobby_mode') || 'DEMO';
const isDemoMode = ref(mode === 'DEMO');
const currencyIcon = computed(() => isDemoMode.value ? '🎮' : '🪙');

const actualBalance = ref(props.maxBalance);

// 🔥 LÓGICA DO CRONÓMETRO 🔥
const timeLeft = ref(30);
let timerId: ReturnType<typeof setInterval> | null = null;

const formatValue = (val: number) => {
  return Number(val).toFixed(2).replace('.', ',');
};

const minRebuy = computed(() => {
  const deficit = props.minBuyIn - props.currentChips;
  const absoluteMin = deficit > 0 ? deficit : 10; 
  return Math.min(absoluteMin, actualBalance.value); 
});

const maxRebuy = computed(() => {
  const tableAbsoluteMax = props.minBuyIn * 10; 
  const allowedToInject = tableAbsoluteMax - props.currentChips;
  return Math.min(allowedToInject > 0 ? allowedToInject : 0, actualBalance.value);
});

const localRebuyAmount = ref(minRebuy.value);

watch(() => minRebuy.value, (newVal) => {
  localRebuyAmount.value = newVal;
});

const fetchCorrectBalance = async () => {
  try {
    const userId = localStorage.getItem('magic_userid');
    if (!userId) return;

    const endpoint = isDemoMode.value ? 'demo-balance' : 'balance';
    const IDENTITY_API_URL = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';
    
    const response = await fetch(`${IDENTITY_API_URL}/api/wallet/${userId}/${endpoint}`);
    if (response.ok) {
      const data = await response.json();
      actualBalance.value = data.balance;
      
      if (localRebuyAmount.value < minRebuy.value) {
        localRebuyAmount.value = minRebuy.value;
      }
    }
  } catch (error) {
    console.error("Erro ao buscar saldo real no modal de Rebuy:", error);
  }
};

onMounted(async () => {
  await fetchCorrectBalance();

  if (localRebuyAmount.value < minRebuy.value) {
    localRebuyAmount.value = minRebuy.value;
  }

  // 🔥 INICIA O CRONÓMETRO SE AS FICHAS FOREM ZERO 🔥
  if (props.currentChips === 0) {
    timerId = setInterval(() => {
      timeLeft.value--;
      if (timeLeft.value <= 0) {
        clearInterval(timerId!);
        emit('cancel'); // O tempo acabou, fecha o modal (o backend fará o StandUp forçado)
      }
    }, 1000);
  }
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId); // Limpa o cronómetro se o modal for fechado antes
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

/* 🔥 ESTILO DO BANNER DE ERRO DO SERVIDOR 🔥 */
.error-warning {
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid #ff4757;
  color: #ff4757;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: bold;
  font-size: 12px;
  line-height: 1.4;
}

/* 🔥 ESTILO DO AVISO DE TEMPO 🔥 */
.timeout-warning {
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid #e74c3c;
  color: #e74c3c;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 1px;
  animation: pulseRed 1s infinite alternate;
}

@keyframes pulseRed {
  0% { box-shadow: 0 0 5px rgba(231, 76, 60, 0.2); }
  100% { box-shadow: 0 0 15px rgba(231, 76, 60, 0.6); }
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