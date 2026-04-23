<template>
  <div class="screen-wrapper">
    <div class="auth-box">
      <div class="logo-area">
        <h3 class="top-title">CASINO ON-LINE</h3>
        
        <div class="magic-logo-wrapper">
          <MagicLogo />
        </div>
        
      </div>
      
      <form @submit.prevent="fazerLogin" class="auth-form">
        <div class="input-group">
          <label>Usuário</label>
          <input 
            type="text" 
            v-model="username" 
            @input="username = username.toUpperCase()"
            placeholder="Digite seu usuário" 
            required 
            :disabled="isLoading" 
          />
        </div>

        <div class="input-group">
          <label>Senha</label>
          <div class="password-wrapper">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              v-model="password" 
              placeholder="Digite sua senha" 
              required 
              :disabled="isLoading" 
            />
            <button type="button" class="toggle-password" @click="showPassword = !showPassword">
              {{ showPassword ? '👁️‍🗨️' : '👁️' }}
            </button>
          </div>
        </div>

        <div class="messages-area">
          <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? 'ENTRANDO...' : 'ENTRAR' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>Não tem uma conta? <a href="#" @click.prevent="irParaCadastro">Cadastre-se aqui</a></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/authService';

import MagicLogo from '../components/MagicLogo.vue'; 

const router = useRouter();
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

// Variável para controlar o áudio de fundo
let cosmosAudio: HTMLAudioElement | null = null;

onMounted(() => {
  // Inicializa o áudio buscando da pasta public
  cosmosAudio = new Audio('/sons/cosmos.mp3');
  cosmosAudio.loop = true; // Loop infinito
  cosmosAudio.volume = 0.05; // Volume agradável para não assustar o jogador

  // Tenta tocar automaticamente
  cosmosAudio.play().catch(() => {
    // Se o navegador bloquear o autoplay, aguarda o primeiro clique na tela
    const playOnInteraction = () => {
      cosmosAudio?.play();
      document.removeEventListener('click', playOnInteraction);
    };
    document.addEventListener('click', playOnInteraction);
  });
});

onUnmounted(() => {
  // Desliga a música e limpa a memória quando sair da tela de Login
  if (cosmosAudio) {
    cosmosAudio.pause();
    cosmosAudio.currentTime = 0;
    cosmosAudio = null;
  }
});

const fazerLogin = async () => {
  errorMessage.value = '';
  isLoading.value = true;
  try {
    // 👇 CAPTURAMOS A RESPOSTA DA API AQUI 👇
    const userData = await authService.login(username.value.toUpperCase(), password.value);
    
    // 👇 SALVAMOS AS ROLES NO NAVEGADOR 👇
    // Verifica se a API retornou as roles e salva no localStorage para o Menu Inferior ler
    if (userData && userData.roles) {
      localStorage.setItem('magic_roles', JSON.stringify(userData.roles));
    } else {
      // Se não vier role nenhuma, garante que limpamos resquícios de logins antigos
      localStorage.setItem('magic_roles', JSON.stringify([]));
    }

    router.push('/lobby');
  } catch (error: any) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

const irParaCadastro = () => router.push('/cadastro');
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');

.screen-wrapper {
  /* 👇 SOLUÇÃO DEFINITIVA: Trava o componente na tela como se fosse um App nativo */
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh; /* Continua usando dvh para a altura dinâmica */
  
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px; 
  box-sizing: border-box;
  background-color: #000;
  background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%);
  font-family: 'Montserrat', sans-serif;
  overflow: hidden;
}

.auth-box {
  width: 100%;
  max-width: 350px; 
  max-height: 90vh; 
  overflow-y: auto;
  background: linear-gradient(to bottom, #000000 0%, rgba(10, 15, 24, 0.9) 100%);
  border: 2px solid #a855f7;
  border-radius: 20px;
  padding: 15px 20px; 
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.4);
  box-sizing: border-box;
}

/* Custom Scrollbar */
.auth-box::-webkit-scrollbar { width: 5px; }
.auth-box::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 10px; }

.logo-area { 
  text-align: center; 
  margin-bottom: 0px; 
} 

.top-title {
  color: #ffffff;
  font-size: 15px; 
  font-weight: 900;
  letter-spacing: 3px;
  margin-bottom: 0px; 
  margin-top: 5px; 
  text-transform: uppercase;
}

.magic-logo-wrapper {
  transform: scale(0.85); 
  margin-top: -115px;  
  margin-bottom: -85px;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none; 
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 10px; 
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px; 
}

.input-group label {
  color: #aaa;
  font-size: 10px; 
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-group input {
  background: #111;
  border: 1px solid #444;
  color: #fff;
  padding: 10px 12px; 
  border-radius: 8px;
  font-size: 13px; 
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.input-group input:focus { border-color: #a855f7; }

.password-wrapper { 
  position: relative; 
  display: flex; 
  align-items: center; 
  width: 100%;
}

.toggle-password {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #a855f7;
  cursor: pointer;
  font-size: 16px;
}

.messages-area { text-align: center; min-height: 10px; margin-top: -2px; }
.error-msg { color: #ff4757; font-size: 11px; font-weight: bold; margin: 0; }
.success-msg { color: #2ecc71; font-size: 11px; font-weight: bold; margin: 0; }

.btn-primary {
  background: linear-gradient(to bottom, #a855f7, #7e22ce);
  border: 1px solid #6b21a8;
  color: white;
  height: 44px; 
  border-radius: 8px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 15px; 
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.25), 0px 4px 6px rgba(0,0,0,0.5);
  transition: all 0.1s ease;
  margin-top: 0px; 
}

.btn-primary:active { transform: translateY(3px) scale(0.98); }

.auth-footer { 
  text-align: center; 
  margin-top: 10px; 
  color: #888; 
  font-size: 12px; 
} 
.auth-footer a { color: #a855f7; text-decoration: none; font-weight: 700; }
</style>

<style>
html, body {
  background-color: #000 !important;
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden !important; 
  overscroll-behavior-y: none; /* Desativa o "bounce/pulo" no mobile */
}
</style>