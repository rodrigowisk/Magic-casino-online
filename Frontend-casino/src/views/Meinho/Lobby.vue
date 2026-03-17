<template>
  <div class="screen-wrapper">
    
    <div class="header-full-width">
      <Header />
    </div>

    <main class="lobby-content">
      <div class="content-header">
        <h2>Mesas de Meinho</h2>
        <button class="btn-create" @click="irParaCriarMesa">Criar Mesa +</button>
      </div>

      <div v-if="isLoading" class="loading-message">
        Carregando mesas disponíveis...
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div v-if="!isLoading && mesasDisponiveis.length === 0" class="empty-message">
        Nenhuma mesa ativa no momento. Que tal criar uma?
      </div>

      <div class="table-list" v-if="!isLoading && mesasDisponiveis.length > 0">
        <div class="table-card" v-for="mesa in mesasDisponiveis" :key="mesa.id">
          <div class="table-info">
            <h4>
              {{ mesa.name }} 
              <span v-if="mesa.hasPassword" class="lock-icon" title="Mesa com senha">🔒</span>
            </h4>
            <div class="table-stats">
              <span>Ante: <strong class="gold">R$ {{ mesa.ante }}</strong></span>
              <span>Cacife: <strong class="gold">R$ {{ mesa.minBuyIn }}</strong></span>
              <span>Rake: <strong>{{ mesa.rake }}%</strong></span>
              <span>Tempo: <strong>{{ mesa.durationHours }}h</strong></span>
              <span>Jogadores: <strong>{{ mesa.currentPlayers }} / {{ mesa.maxPlayers }}</strong></span>
            </div>
          </div>
          <button class="btn-play" @click="tentarEntrarNaMesa(mesa)">JOGAR</button>
        </div>
      </div>
    </main>

    <BottomNav />
      
    <div class="password-modal-overlay" v-if="showPasswordModal" @click.self="fecharModalSenha">
      <div class="password-modal">
        <h3>Mesa Privada</h3>
        <p>Esta mesa é protegida. Digite a senha para entrar.</p>
        
        <input 
          type="password" 
          v-model="tablePassword" 
          placeholder="Senha da mesa" 
          @keyup.enter="verificarSenhaEEntrar" 
          ref="passwordInput"
        />
        
        <div v-if="passwordError" class="modal-error">{{ passwordError }}</div>
        
        <div class="modal-actions">
          <button class="btn-cancel" @click="fecharModalSenha">Cancelar</button>
          <button class="btn-confirm" @click="verificarSenhaEEntrar" :disabled="isVerifying">
            {{ isVerifying ? 'A verificar...' : 'Entrar' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../../services/authService'; 

import Header from '../../components/Header.vue'; 
import BottomNav from '../../components/BottomNav.vue'; 

const router = useRouter();

const isLoading = ref(true);
const errorMessage = ref('');
const mesasDisponiveis = ref<any[]>([]);

const showPasswordModal = ref(false);
const selectedTableId = ref('');
const tablePassword = ref('');
const passwordError = ref('');
const isVerifying = ref(false);
const passwordInput = ref<HTMLInputElement | null>(null);

const carregarMesas = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const token = localStorage.getItem('magic_token');

    if (!token) {
      throw new Error('Não está autenticado.');
    }

    const GAME_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';

    const response = await fetch(`${GAME_API_URL}/api/table`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Não foi possível carregar as mesas.');
    }

    const data = await response.json();
    mesasDisponiveis.value = data;

  } catch (error: any) {
    console.error(error);
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }
  carregarMesas();
});

const tentarEntrarNaMesa = (mesa: any) => {
  if (mesa.hasPassword) {
    selectedTableId.value = mesa.id;
    tablePassword.value = '';
    passwordError.value = '';
    showPasswordModal.value = true;
    
    nextTick(() => {
      if (passwordInput.value) passwordInput.value.focus();
    });
  } else {
    router.push(`/mesa/${mesa.id}`);
  }
};

const fecharModalSenha = () => {
  showPasswordModal.value = false;
  tablePassword.value = '';
  passwordError.value = '';
};

const verificarSenhaEEntrar = async () => {
  if (!tablePassword.value) {
    passwordError.value = 'Por favor, digite a senha.';
    return;
  }

  isVerifying.value = true;
  passwordError.value = '';

  try {
    const token = localStorage.getItem('magic_token');
    const GAME_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';

    const response = await fetch(`${GAME_API_URL}/api/table/${selectedTableId.value}/validate-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ password: tablePassword.value })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Senha incorreta!');
    }

    showPasswordModal.value = false;
    router.push(`/mesa/${selectedTableId.value}`);

  } catch (error: any) {
    passwordError.value = error.message;
  } finally {
    isVerifying.value = false;
  }
};

const irParaCriarMesa = () => {
  router.push('/criar-mesa');
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');

.screen-wrapper {
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh; 
  display: flex;
  flex-direction: column; 
  background-color: #000;
  background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%);
  font-family: 'Montserrat', sans-serif;
  color: white;
}

.header-full-width {
  width: 100%;
  flex-shrink: 0;
}

.lobby-content {
  flex: 1; 
  width: 100%;
  max-width: 800px; 
  margin: 0 auto; 
  padding: 20px;
  overflow-y: auto; 
  box-sizing: border-box;
}

.lobby-content::-webkit-scrollbar { width: 6px; }
.lobby-content::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 10px; }
.lobby-content::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.content-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  text-transform: uppercase;
}

.btn-create {
  background: linear-gradient(to bottom, #a855f7, #7e22ce);
  border: 1px solid #6b21a8;
  color: white;
  padding: 10px 15px;
  border-radius: 8px;
  font-weight: 900;
  font-size: 12px;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.25), 0px 4px 6px rgba(0,0,0,0.5);
}

.btn-create:active {
  transform: translateY(2px);
}

.loading-message {
  text-align: center;
  color: #aaa;
  margin-top: 40px;
  font-style: italic;
}

.error-message {
  text-align: center;
  color: #ff4757;
  background-color: rgba(255, 71, 87, 0.1);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #ff4757;
  font-size: 13px;
  font-weight: bold;
}

.empty-message {
  text-align: center;
  color: #aaa;
  background: rgba(17, 17, 17, 0.5);
  padding: 30px;
  border-radius: 12px;
  border: 1px dashed #444;
  margin-top: 20px;
  font-size: 14px;
}

.table-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-bottom: 20px; 
}

.table-card {
  background: #111;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  transition: border-color 0.2s;
}

.table-card:hover {
  border-color: #a855f7;
}

.table-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 900;
  text-transform: uppercase;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lock-icon {
  font-size: 14px;
  opacity: 0.8;
}

.table-stats {
  display: flex;
  gap: 10px;
  font-size: 11px;
  font-weight: bold;
  color: #888;
  flex-wrap: wrap; 
}

.gold {
  color: #f1c40f;
}

.btn-play {
  background: linear-gradient(to bottom, #3ce48a, #26ab65);
  border: 1px solid #124026;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 13px;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.25), 0px 4px 6px rgba(0,0,0,0.5);
}

.btn-play:active {
  transform: translateY(3px) scale(0.95);
}

.password-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.password-modal {
  background: linear-gradient(135deg, rgba(20, 28, 45, 0.95), rgba(10, 15, 25, 0.98));
  border: 2px solid #f1c40f;
  border-radius: 16px;
  padding: 25px;
  width: 90%;
  max-width: 350px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 0 15px rgba(241, 196, 15, 0.2);
  text-align: center;
  animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideUp {
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.password-modal h3 {
  color: #f1c40f;
  margin: 0 0 10px 0;
  font-weight: 900;
  text-transform: uppercase;
}

.password-modal p {
  color: #bbb;
  font-size: 13px;
  margin: 0 0 20px 0;
  font-family: Arial, sans-serif;
}

.password-modal input {
  width: 100%;
  background: #111;
  border: 1px solid #444;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  outline: none;
  font-size: 16px;
  text-align: center;
  box-sizing: border-box;
  margin-bottom: 15px;
  transition: border-color 0.2s;
}

.password-modal input:focus {
  border-color: #f1c40f;
}

.modal-error {
  color: #ff4757;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 15px;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.btn-cancel {
  flex: 1;
  background: transparent;
  border: 1px solid #666;
  color: #bbb;
  padding: 12px;
  border-radius: 8px;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #333;
  color: #fff;
}

.btn-confirm {
  flex: 1;
  background: linear-gradient(to bottom, #f1c40f, #d4ac0d);
  border: 1px solid #b7950b;
  color: #000;
  padding: 12px;
  border-radius: 8px;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.4), 0px 4px 6px rgba(0,0,0,0.5);
}

.btn-confirm:active {
  transform: translateY(2px);
}

.btn-confirm:disabled {
  background: #555;
  color: #888;
  border-color: #444;
  cursor: not-allowed;
}
</style>