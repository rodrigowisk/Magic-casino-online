<template>
  <div class="rebuy-modal-overlay">
    <div class="rebuy-modal">
      
      <div v-if="props.isWaitlist" class="waitlist-warning">
        ⏳ SUA VEZ! VOCÊ TEM {{ waitlistSeconds }}s
      </div>

      <div v-if="errorMessage" class="error-warning">
        {{ errorMessage }}
      </div>

      <h2>Entrar na Mesa</h2>
      <p>Confirme as regras antes de sentar:</p>

      <div class="info-box">
        <p>Ante (Aposta Inicial): <strong class="gold">{{ currencyIcon }} {{ minBet }}</strong></p>
        <p>Cacife Mínimo: <strong class="gold">{{ currencyIcon }} {{ minBuyIn }}</strong></p>
        <p>Rake (Comissão): <strong class="gold">{{ rake }}%</strong></p>
        <p>Tempo Restante: <strong class="timer-text">{{ timeLeftDisplay }}</strong></p>
      </div>

      <p class="balance-info" :class="{ 'text-error': actualBalance < minBuyIn }">
        Seu Saldo: {{ currencyIcon }} {{ formatValue(actualBalance) }}
      </p>
      
      <div class="slider-container" v-if="actualBalance >= minBuyIn">
        <label>Buy-in: {{ currencyIcon }} {{ formatValue(localBuyInAmount) }}</label>
        <input 
          type="range" 
          :min="minBuyIn" 
          :max="actualBalance" 
          v-model.number="localBuyInAmount" 
          class="styled-slider" 
        />
      </div>
      
      <div class="slider-container" v-else>
        <p class="error-msg">Você não possui saldo suficiente para o Cacife Mínimo.</p>
      </div>

      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('cancel')">Cancelar</button>
        <button 
          class="btn-confirm" 
          :disabled="actualBalance < minBuyIn || isFetching || isSubmitting"
          @click="$emit('confirm', localBuyInAmount)"
        >
          {{ isSubmitting ? 'Sentando...' : (isFetching ? 'Carregando...' : 'Sentar') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';

const props = withDefaults(defineProps<{
  minBet: number;
  minBuyIn: number; 
  rake: number;
  maxBalance: number; // O valor que vem da página do jogo (vamos ignorá-lo se for Demo)
  expiresAt: string;
  isWaitlist?: boolean; 
  errorMessage?: string;
  isSubmitting?: boolean;
}>(), {
  isWaitlist: false,
  isSubmitting: false
});

const emit = defineEmits(['confirm', 'cancel']);

// 🔥 LÓGICA DO MODO DE TREINO 🔥
const mode = localStorage.getItem('magic_lobby_mode') || 'DEMO';
const isDemoMode = ref(mode === 'DEMO');
const currencyIcon = computed(() => isDemoMode.value ? '🎮' : '🪙');

// Vamos usar o actualBalance para substituir o maxBalance antigo
const actualBalance = ref(props.maxBalance);
const isFetching = ref(true);

const localBuyInAmount = ref(props.minBuyIn);
const timeLeftDisplay = ref('Calculando...');
let timerId: ReturnType<typeof setInterval> | null = null;

const waitlistSeconds = ref(15);
let waitlistTimerId: ReturnType<typeof setInterval> | null = null;

const formatValue = (val: number) => {
  return Number(val).toFixed(2).replace('.', ',');
};

watch(() => props.minBuyIn, () => {
  if (localBuyInAmount.value < props.minBuyIn) {
    localBuyInAmount.value = props.minBuyIn;
  }
});

function formatTimeLeft() {
  if (!props.expiresAt) return '--:--:--';
  
  const expDate = new Date(props.expiresAt);
  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return 'Mesa Encerrada';
  }

  const h = Math.floor(diffMs / (1000 * 60 * 60));
  const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diffMs % (1000 * 60)) / 1000);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 🔥 BUSCA O SALDO CORRETO DIRETAMENTE DA API QUANDO O MODAL ABRE 🔥
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
    }
  } catch (error) {
    console.error("Erro ao buscar saldo real no modal de BuyIn:", error);
  } finally {
    isFetching.value = false;
  }
};

onMounted(async () => {
  // Puxa o saldo correto assim que o modal pisca no ecrã
  await fetchCorrectBalance();

  if (localBuyInAmount.value < props.minBuyIn) {
    localBuyInAmount.value = props.minBuyIn;
  }
  
  timeLeftDisplay.value = formatTimeLeft();
  timerId = setInterval(() => {
    timeLeftDisplay.value = formatTimeLeft();
  }, 1000);

  if (props.isWaitlist) {
    waitlistSeconds.value = 15;
    waitlistTimerId = setInterval(() => {
      waitlistSeconds.value--;
      if (waitlistSeconds.value <= 0) {
        clearInterval(waitlistTimerId!);
        emit('cancel'); 
      }
    }, 1000);
  }
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId); 
  if (waitlistTimerId) clearInterval(waitlistTimerId); 
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
  z-index: 500;
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
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.waitlist-warning {
  background: rgba(241, 196, 15, 0.15);
  border: 1px solid #f1c40f;
  color: #f1c40f;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 1px;
  animation: pulseGlow 1.5s infinite;
}

@keyframes pulseGlow {
  0% { box-shadow: 0 0 5px rgba(241, 196, 15, 0.2); }
  50% { box-shadow: 0 0 15px rgba(241, 196, 15, 0.6); }
  100% { box-shadow: 0 0 5px rgba(241, 196, 15, 0.2); }
}

.rebuy-modal h2 { 
  margin-top: 0; 
  font-size: 20px; 
  color: #3ce48a; 
  text-transform: uppercase;
  letter-spacing: 1px;
}

.rebuy-modal p { 
  font-size: 14px; 
  margin: 10px 0; 
}

.info-box {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
  text-align: left; 
}

.info-box p {
  margin: 5px 0;
  color: #ccc;
  font-size: 13px;
  display: flex;
  justify-content: space-between; 
}

.gold {
  color: #f1c40f;
  font-size: 14px;
  text-shadow: 0 0 5px rgba(241, 196, 15, 0.4);
}

.timer-text {
  color: #ff4757;
  font-family: 'Courier New', Courier, monospace; 
  font-size: 15px;
  font-weight: 900;
  text-shadow: 0 0 8px rgba(255, 71, 87, 0.5);
  letter-spacing: 1px;
}

.balance-info { 
  color: #3ce48a !important; 
  font-weight: bold; 
  font-size: 16px !important;
  margin-bottom: 20px !important;
  transition: color 0.3s;
}

.text-error {
  color: #ff4757 !important;
}
.error-msg {
  color: #ff4757;
  font-size: 15px;
  font-weight: bold;
  margin-top: 10px;
}

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

.btn-cancel:active:not(:disabled), .btn-confirm:active:not(:disabled) {
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

.btn-confirm:disabled {
  background: #444;
  color: #888;
  cursor: not-allowed;
  box-shadow: none;
}
</style>