<template>
  <div class="screen-wrapper">
    <div class="auth-box">
      <div class="logo-area">
        <h3 class="top-title">CASINO ON-LINE</h3>
        <img :src="logoImg" alt="Logo" class="app-logo" />
      </div>
      
      <form @submit.prevent="fazerCadastro" class="auth-form" autocomplete="off">
        <div class="input-group">
          <label>Nome de Usuário</label>
          <input 
            type="text" 
            v-model="form.username" 
            @input="form.username = form.username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()"
            placeholder="Apenas letras e números" 
            required 
            :disabled="isLoading" 
            autocomplete="off"
          />
        </div>

        <div class="input-group">
          <label>Telefone</label>
          <input 
            type="tel" 
            v-model="form.phone" 
            placeholder="(00) 00000-0000" 
            required 
            :disabled="isLoading" 
            autocomplete="off" 
          />
        </div>

        <div class="input-group">
          <label>E-mail</label>
          <input 
            type="email" 
            v-model="form.email" 
            placeholder="seu@email.com" 
            required 
            :disabled="isLoading" 
            autocomplete="off" 
          />
        </div>

        <div class="input-group">
          <label>Senha</label>
          <div class="password-wrapper">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              v-model="form.password" 
              placeholder="Mínimo 6 caracteres" 
              minlength="6" 
              required 
              :disabled="isLoading" 
              autocomplete="new-password"
            />
            <button type="button" class="toggle-password" @click="showPassword = !showPassword">
              {{ showPassword ? '👁️‍🗨️' : '👁️' }}
            </button>
          </div>
        </div>

        <div class="input-group">
          <label>Código de Convite (Opcional)</label>
          <input 
            type="text" 
            v-model="form.referralCode" 
            @input="form.referralCode = form.referralCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()"
            placeholder="Se tiver, digite aqui" 
            :disabled="isLoading" 
            autocomplete="off" 
          />
        </div>

        <div class="messages-area">
          <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
          <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? 'ENTRANDO...' : 'CADASTRAR' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>Já possui uma conta? <a href="#" @click.prevent="irParaLogin">Faça Login</a></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authService } from '../services/authService';
import logoImg from '../assets/imagens/logo-casino.png';

const router = useRouter();
const route = useRoute();
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const form = reactive({ 
  username: '', 
  password: '', 
  email: '', 
  phone: '',
  referralCode: '' 
});

onMounted(() => {
  form.username = '';
  form.password = '';
  form.email = '';
  form.phone = '';
  errorMessage.value = '';
  successMessage.value = '';

  const refCodeFromUrl = route.query.ref as string;
  if (refCodeFromUrl) {
    localStorage.setItem('magic_referral', refCodeFromUrl);
    form.referralCode = refCodeFromUrl;
  } else {
    form.referralCode = localStorage.getItem('magic_referral') || '';
  }
});

const fazerCadastro = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  isLoading.value = true;
  
  try {
    const userFormatado = form.username.toUpperCase();
    
    await authService.register(userFormatado, form.email, form.password, form.phone, form.referralCode);
    
    successMessage.value = 'Conta criada! Entrando no lobby...';
    
    await authService.login(userFormatado, form.password);
    
    form.username = '';
    form.password = '';
    form.email = '';
    form.phone = '';
    localStorage.removeItem('magic_referral');

    setTimeout(() => router.push('/lobby'), 1000);
    
  } catch (error: any) {
    errorMessage.value = error.message || 'Erro ao processar o cadastro.';
  } finally {
    isLoading.value = false;
  }
};

const irParaLogin = () => router.push('/login');
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');

.screen-wrapper {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px; /* Reduzido de 20px */
  box-sizing: border-box;
  background-color: #000;
  background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%);
  font-family: 'Montserrat', sans-serif;
}

.auth-box {
  width: 100%;
  max-width: 380px; 
  max-height: 95vh; /* Aumentado um pouco o limite máximo para não cortar fácil */
  overflow-y: auto;
  background: linear-gradient(to bottom, #000000 0%, rgba(10, 15, 24, 0.9) 100%);
  border: 2px solid #a855f7;
  border-radius: 16px; /* Bordas um pouco mais suaves para salvar espaço */
  padding: 18px 20px; /* Reduzido o padding vertical de 25px para 18px */
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.4);
  box-sizing: border-box;
}

/* Custom Scrollbar */
.auth-box::-webkit-scrollbar { width: 5px; }
.auth-box::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 10px; }

.logo-area { text-align: center; margin-bottom: 12px; } /* Reduzido de 20px */

.top-title {
  color: #ffffff;
  font-size: 14px; /* Reduzido de 16px */
  font-weight: 900;
  letter-spacing: 3px;
  margin-bottom: 5px; /* Reduzido de 10px */
  text-transform: uppercase;
}

.app-logo {
  max-width: 100px; /* Reduzido de 130px para salvar muita altura */
  height: auto;
  filter: drop-shadow(0px 4px 10px rgba(0,0,0,0.8));
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 8px; /* Reduzido o espaço entre os inputs (de 12px para 8px) */
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 3px; /* Reduzido o espaço entre a label e o input (de 5px para 3px) */
}

.input-group label {
  color: #aaa;
  font-size: 10px; /* Reduzido de 11px */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-group input {
  background: #111;
  border: 1px solid #444;
  color: #fff;
  padding: 10px; /* Reduzido de 12px para 10px */
  border-radius: 8px;
  font-size: 13px; /* Reduzido de 14px */
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

.messages-area { text-align: center; min-height: 12px; margin-top: 0px; } /* Diminuído */
.error-msg { color: #ff4757; font-size: 11px; font-weight: bold; margin: 0; }
.success-msg { color: #3ce48a; font-size: 11px; font-weight: bold; margin: 0; }

.btn-primary {
  background: linear-gradient(to bottom, #a855f7, #7e22ce);
  border: 1px solid #6b21a8;
  color: white;
  height: 42px; /* Reduzido de 48px para 42px */
  border-radius: 8px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 14px; /* Reduzido de 16px */
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.25), 0px 4px 6px rgba(0,0,0,0.5);
  transition: all 0.1s ease;
  margin-top: 0px; /* Tirado a margem extra do botão */
}

.btn-primary:active { transform: translateY(3px) scale(0.98); }

.auth-footer { text-align: center; margin-top: 10px; color: #888; font-size: 12px; } /* Reduzido de 15px para 10px e fonte para 12px */
.auth-footer a { color: #a855f7; text-decoration: none; font-weight: 700; }
</style>