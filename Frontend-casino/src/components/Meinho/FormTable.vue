<template>
  <div class="create-box">
    <div class="header-area">
      <button class="btn-back" @click="voltar">← Voltar</button>
      <h2>Nova Mesa de Meinho</h2>
    </div>

    <form @submit.prevent="criarMesa" class="create-form">
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>

      <div class="input-group">
        <label>Nome da Mesa</label>
        <input type="text" v-model="form.name" placeholder="Ex: Meinho dos Amigos" required />
      </div>

      <div class="input-group dual-group">
        <div class="half-group">
          <label>Ante (R$)</label>
          <input type="number" v-model.number="form.ante" required />
        </div>
        <div class="half-group">
          <label>Cacife Min. (R$)</label>
          <input type="number" v-model.number="form.minBuyIn" required />
        </div>
      </div>

      <div class="input-group dual-group">
        <div class="half-group">
          <label>Rake (%)</label>
          <input type="number" v-model.number="form.rake" min="0" max="100" required />
        </div>
        <div class="half-group">
          <label>Duração</label>
          <select v-model.number="form.durationHours" class="custom-select">
            <option value="12">12 Horas</option>
            <option value="24">24 Horas</option>
            <option value="48">48 Horas</option>
          </select>
        </div>
      </div>

      <div class="input-group">
        <div class="flex-label">
          <label>Máximo de Jogadores</label>
          <span class="badge-value">{{ form.maxPlayers }} Jogadores</span>
        </div>
        <input type="range" min="2" max="6" v-model.number="form.maxPlayers" class="range-slider" />
      </div>

      <div class="input-group">
        <label>Capa da Mesa <span class="optional">(Deslize 👉)</span></label>
        <div class="cover-selector">
          <label 
            v-for="(cover, index) in coversArray" 
            :key="index"
            class="cover-option" 
            :class="{ selected: form.coverImage === cover.fileName }"
          >
            <input type="radio" :value="cover.fileName" v-model="form.coverImage" hidden />
            <img :src="cover.url" :alt="`Capa ${index + 1}`" />
          </label>
        </div>
      </div>

      <div class="password-row">
        <div class="switch-container">
          <label>Com Senha?</label>
          <label class="toggle-switch">
            <input type="checkbox" v-model="hasPassword" @change="togglePassword" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <transition name="slide-fade">
          <input 
            v-if="hasPassword" 
            type="password" 
            v-model="form.password" 
            placeholder="Digite a senha..." 
            class="pwd-input-inline" 
            required 
          />
        </transition>
      </div>

      <button type="submit" class="btn-primary" :disabled="isLoading">
        {{ isLoading ? 'CRIANDO...' : 'CRIAR E ENTRAR' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// BUSCA DINÂMICA DAS IMAGENS DA PASTA
const rawCoversModules = import.meta.glob<{ default: string }>('../../assets/room_covers/*.{png,jpg,jpeg,svg,webp}', { eager: true });
const coversArray = Object.entries(rawCoversModules).map(([key, mod]) => {
  return {
    fileName: key.split('/').pop() || '',
    url: mod ? mod.default : ''
  };
});

const defaultCover = coversArray.length > 0 ? coversArray[0].fileName : 'casino.webp';

const form = reactive({
  name: '',
  ante: 10,
  minBuyIn: 100, 
  durationHours: 12, 
  maxPlayers: 6,
  rake: 5,
  password: '',
  coverImage: defaultCover 
});

const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const hasPassword = ref(false);

const togglePassword = () => {
  if (!hasPassword.value) {
    form.password = ''; // Limpa a senha se desativar o switch
  }
};

const criarMesa = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const token = localStorage.getItem('magic_token');

    if (!token) {
      errorMessage.value = 'Você precisa estar autenticado para criar uma mesa.';
      isLoading.value = false;
      return;
    }

    const MEINHO_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';

    const payload = {
        name: form.name,
        ante: form.ante,
        minBuyIn: form.minBuyIn,
        durationHours: form.durationHours,
        maxPlayers: form.maxPlayers,
        rake: form.rake, 
        password: hasPassword.value ? form.password : '', // Garante o envio vazio se não tiver senha
        gameType: "meinho",
        coverImage: form.coverImage 
    };

    const response = await fetch(`${MEINHO_API_URL}/api/table`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text(); 
      if (response.status === 502) throw new Error("Erro 502: O Nginx não está redirecionando para a porta 5002.");
      if (response.status === 404) throw new Error("Erro 404: Rota não encontrada. Nginx ou API offline.");
      
      try {
         const errorData = JSON.parse(errorText);
         throw new Error(errorData.title || errorData.message || `Erro HTTP ${response.status}`);
      } catch(e) {
         throw new Error(`Falha no Servidor (${response.status}). Veja o Console (F12).`);
      }
    }

    const data = await response.json();
    successMessage.value = 'Mesa criada com sucesso! A redirecionar...';

    setTimeout(() => {
      router.push(`/mesa/${data.tableId}`);
    }, 1500);

  } catch (error: any) {
    errorMessage.value = error.message || 'Erro de conexão com o servidor.';
  } finally {
    isLoading.value = false;
  }
};

const voltar = () => {
  router.push('/lobby');
};
</script>

<style scoped>
/* Reduzido o padding e deixado mais slim */
.create-box {
  width: 100%;
  max-width: 450px;
  margin: 0 auto; 
  background: rgba(10, 15, 24, 0.95);
  border: 2px solid #2ecc71; 
  border-radius: 16px;
  padding: 15px 20px; 
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
  box-sizing: border-box;
}

.header-area {
  display: flex;
  align-items: center;
  justify-content: space-between; 
  margin-bottom: 15px; /* Menos margem no título */
}

.header-area h2 {
  color: #fff;
  margin: 0;
  font-size: 18px; 
}

.btn-back {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-weight: bold;
  padding: 0;
  font-size: 14px;
}

.btn-back:hover {
  color: #fff;
}

/* Espaço entre os campos reduzido de 20px para 12px */
.create-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dual-group {
  flex-direction: row !important;
  gap: 12px;
}

.half-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label, .half-group label {
  color: #2ecc71;
  font-size: 11px; /* Fonte levemente menor nos labels */
  font-weight: bold;
  text-transform: uppercase;
}

/* Caixas de texto mais finas (padding de 12px para 10px) */
.input-group input[type="text"],
.input-group input[type="number"],
.half-group input[type="number"],
.custom-select {
  background: #111;
  border: 1px solid #444;
  color: #fff;
  padding: 10px; 
  border-radius: 6px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  font-size: 14px;
}

.flex-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* O Badge de Jogadores na direita */
.badge-value {
  background: #2ecc71;
  color: #0a0f18;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 11px;
}

.range-slider {
  accent-color: #2ecc71;
  cursor: pointer;
  margin-top: 4px;
}

.optional {
  color: #666;
  font-size: 10px;
  text-transform: none;
}

/* Capas da mesa reduzidas em altura */
.cover-selector {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  margin-top: 2px;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.cover-selector::-webkit-scrollbar {
  height: 4px;
}
.cover-selector::-webkit-scrollbar-thumb {
  background: #2ecc71;
  border-radius: 10px;
}
.cover-selector::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.cover-option {
  flex: 0 0 auto;
  cursor: pointer;
  border: 2px solid #444;
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s ease;
  width: 90px;
  height: 55px; /* Reduzido de 70px para economizar muito espaço vertical */
  opacity: 0.5;
}

.cover-option img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-option:hover {
  opacity: 0.8;
  border-color: #777;
}

.cover-option.selected {
  border-color: #2ecc71;
  opacity: 1;
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
}

/* ======================================= */
/* NOVA SEÇÃO DE SENHA (SWITCH + INLINE)   */
/* ======================================= */
.password-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #333;
  min-height: 40px; /* Previne salto brusco no layout */
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.switch-container label:first-child {
  color: #2ecc71;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #555;
  transition: .3s;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #2ecc71;
}

input:checked + .toggle-slider:before {
  transform: translateX(16px);
}

.pwd-input-inline {
  flex: 1;
  background: #111;
  border: 1px solid #2ecc71;
  color: #fff;
  padding: 8px 10px;
  border-radius: 6px;
  outline: none;
  font-size: 14px;
  width: 100%;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(10px);
  opacity: 0;
}

/* ======================================= */

.btn-primary {
  background: linear-gradient(to bottom, #3ce48a, #26ab65);
  border: 1px solid #124026;
  color: white;
  height: 45px; /* Botão reduzido de 55px para 45px */
  border-radius: 8px;
  font-weight: 800;
  font-size: 16px;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 5px;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.25), 0px 4px 6px rgba(0,0,0,0.5);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

.btn-primary:active {
  transform: translateY(3px);
}

.btn-primary:disabled {
  background: #555;
  color: #888;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.error-message {
  background-color: rgba(231, 76, 60, 0.2);
  border: 1px solid #e74c3c;
  color: #ff6b6b;
  padding: 8px;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
}

.success-message {
  background-color: rgba(46, 204, 113, 0.2);
  border: 1px solid #2ecc71;
  color: #2ecc71;
  padding: 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: bold;
  text-align: center;
}
</style>