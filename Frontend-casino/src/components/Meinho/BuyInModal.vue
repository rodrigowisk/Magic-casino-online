<template>
  <div class="rebuy-modal-overlay">
    <div class="rebuy-modal">
      <h2>Entrar na Mesa</h2>
      <p>Confirme as regras antes de sentar:</p>

      <div class="info-box">
        <p>Ante (Aposta Inicial): <strong class="gold">R$ {{ minBet }}</strong></p>
        <p>Cacife Mínimo: <strong class="gold">R$ {{ minBuyIn }}</strong></p>
        <p>Rake (Comissão): <strong class="gold">{{ rake }}%</strong></p>
        <p>Tempo Restante: <strong class="timer-text">{{ timeLeftDisplay }}</strong></p>
      </div>

      <p class="balance-info" :class="{ 'text-error': maxBalance < minBuyIn }">
        Seu Saldo: R$ {{ maxBalance }}
      </p>
      
      <div class="slider-container" v-if="maxBalance >= minBuyIn">
        <label>Buy-in Mínimo: R$ {{ localBuyInAmount }}</label>
        <input 
          type="range" 
          :min="minBuyIn" 
          :max="maxBalance" 
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
          :disabled="maxBalance < minBuyIn"
          @click="$emit('confirm', localBuyInAmount)"
        >
          Sentar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  minBet: number;
  minBuyIn: number; 
  rake: number;
  maxBalance: number;
  expiresAt: string; // 👇 A data exata que a mesa morre
}>();

const emit = defineEmits(['confirm', 'cancel']);

const localBuyInAmount = ref(props.minBuyIn);
const timeLeftDisplay = ref('Calculando...');
let timerId: ReturnType<typeof setInterval> | null = null;

watch(() => props.minBuyIn, () => {
  if (localBuyInAmount.value < props.minBuyIn) {
    localBuyInAmount.value = props.minBuyIn;
  }
});

// LÓGICA DO CRONÓMETRO: Calcula a diferença entre a hora atual e a hora de encerramento
function formatTimeLeft() {
  if (!props.expiresAt) return '--:--:--';
  
  // O construtor Date do JS lida automaticamente com ISO strings (UTC)
  const expDate = new Date(props.expiresAt);
  const now = new Date();
  
  const diffMs = expDate.getTime() - now.getTime();
  
  // Se já tiver passado do tempo, a mesa avisa que fechou
  if (diffMs <= 0) {
    return 'Mesa Encerrada';
  }

  // Matemática simples para separar Horas, Minutos e Segundos
  const h = Math.floor(diffMs / (1000 * 60 * 60));
  const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diffMs % (1000 * 60)) / 1000);

  // Formata sempre com 2 dígitos (ex: 04:09:05)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

onMounted(() => {
  if (localBuyInAmount.value < props.minBuyIn) {
    localBuyInAmount.value = props.minBuyIn;
  }
  
  // Roda logo que abre o modal para não aparecer "Calculando..."
  timeLeftDisplay.value = formatTimeLeft();
  
  // Inicia o loop para atualizar a cada segundo
  timerId = setInterval(() => {
    timeLeftDisplay.value = formatTimeLeft();
  }, 1000);
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId); // Limpa o timer da memória quando fechar o modal
});
</script>

<style scoped>
.rebuy-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 430px;
  height: 900px; /* ✅ CORRIGIDO PARA O TAMANHO DO JOGO */
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(5px); /* ✅ Adicionado desfoque no fundo */
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
  text-align: left; /* Alinha os textos à esquerda para facilitar leitura de tabela */
}

.info-box p {
  margin: 5px 0;
  color: #ccc;
  font-size: 13px;
  display: flex;
  justify-content: space-between; /* Empurra os valores para a direita */
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

/* 👇 Classes dinâmicas para caso de erro de saldo 👇 */
.text-error {
  color: #ff4757 !important;
}
.error-msg {
  color: #ff4757;
  font-size: 15px;
  font-weight: bold;
  margin-top: 10px;
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

/* 👇 Estilo para o botão Sentar quando estiver desativado 👇 */
.btn-confirm:disabled {
  background: #444;
  color: #888;
  cursor: not-allowed;
  box-shadow: none;
}
</style>