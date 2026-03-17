<template>
  <div class="screen-wrapper">
    <div class="auth-box">
      <div class="logo-area">
        <h3 class="top-title">CASINO ON-LINE</h3>
        <img :src="logoImg" alt="Logo" class="app-logo" />
      </div>
      
      <form @submit.prevent="fazerLogin" class="auth-form">
        <div class="input-group">
          <label>Nome de Usuário</label>
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/authService';
import logoImg from '../assets/imagens/logo-casino.png';

const router = useRouter();
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

const fazerLogin = async () => {
  errorMessage.value = '';
  isLoading.value = true;
  try {
    // ENVIANDO .toUpperCase() PARA A API PARA BUSCA EXATA
    await authService.login(username.value.toUpperCase(), password.value);
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
  width: 100vw;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px; 
  box-sizing: border-box;
  background-color: #000;
  background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%);
  font-family: 'Montserrat', sans-serif;
}

.auth-box {
  width: 100%;
  max-width: 380px; 
  max-height: 90vh; 
  overflow-y: auto;
  background: linear-gradient(to bottom, #000000 0%, rgba(10, 15, 24, 0.9) 100%);
  border: 2px solid #a855f7;
  border-radius: 20px;
  padding: 25px 20px; 
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.4);
  box-sizing: border-box;
}

/* Custom Scrollbar */
.auth-box::-webkit-scrollbar { width: 5px; }
.auth-box::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 10px; }

.logo-area { text-align: center; margin-bottom: 20px; } 

.top-title {
  color: #ffffff;
  font-size: 16px; 
  font-weight: 900;
  letter-spacing: 4px;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.app-logo {
  max-width: 130px; 
  height: auto;
  filter: drop-shadow(0px 4px 10px rgba(0,0,0,0.8));
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px; 
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 5px; 
}

.input-group label {
  color: #aaa;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-group input {
  background: #111;
  border: 1px solid #444;
  color: #fff;
  padding: 12px; 
  border-radius: 8px;
  font-size: 14px; 
  outline: none;
  transition: border-color 0.2s;
}

.input-group input:focus { border-color: #a855f7; }

.password-wrapper { position: relative; display: flex; align-items: center; }

.toggle-password {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #a855f7;
  cursor: pointer;
  font-size: 16px;
}

.messages-area { text-align: center; min-height: 15px; margin-top: -5px; }
.error-msg { color: #ff4757; font-size: 12px; font-weight: bold; margin: 0; }
.success-msg { color: #2ecc71; font-size: 12px; font-weight: bold; margin: 0; }

.btn-primary {
  background: linear-gradient(to bottom, #a855f7, #7e22ce);
  border: 1px solid #6b21a8;
  color: white;
  height: 48px; 
  border-radius: 8px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 16px; 
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.25), 0px 4px 6px rgba(0,0,0,0.5);
  transition: all 0.1s ease;
  margin-top: 5px;
}

.btn-primary:active { transform: translateY(3px) scale(0.98); }

.auth-footer { text-align: center; margin-top: 15px; color: #888; font-size: 13px; } 
.auth-footer a { color: #a855f7; text-decoration: none; font-weight: 700; }
</style>