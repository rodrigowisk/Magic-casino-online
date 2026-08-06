<template>
  <div class="screen-wrapper">
    <div class="auth-box">
      <div class="logo-area">
        <h3 class="top-title">CASINO ON-LINE</h3>
        
        <div class="magic-logo-wrapper">
          <MagicLogo />
        </div>
        
      </div>
      
      <div class="auth-form" @keydown.enter="fazerLogin">
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

        <button type="button" @click="fazerLogin" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? 'ENTRANDO...' : 'ENTRAR' }}
        </button>
      </div>

      <div class="auth-footer">
        <p>Não tem uma conta? <a href="#" @click.prevent="irParaCadastro">Cadastre-se aqui</a></p>
      </div>

      <div class="certifications-footer">
        <img src="../assets/imagens/GamingLabs.webp" alt="Gaming Labs Certified" class="gl-logo" />
        <p class="legal-links">
          <a href="#" @click.prevent="abrirLegal('termos')">Termos de Serviço</a> &amp; 
          <a href="#" @click.prevent="abrirLegal('privacidade')">Política de Privacidade</a>
        </p>
        <a href="#" @click.prevent="showSupportModal = true" class="support-link">Precisa de ajuda? Suporte Técnico</a>
      </div>
    </div>

    <div class="modal-overlay" v-if="showBannedModal" @click.self="fecharModalBanned">
      <div class="modal-box custom-alert-box">
        <div class="alert-icon">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 class="text-neon-red">ACESSO NEGADO</h3>
        <p class="text-gray-light">{{ bannedMessage }}</p>
        <button type="button" class="btn-confirm-full" @click="fecharModalBanned">ENTENDI</button>
      </div>
    </div>

    <div class="modal-overlay" v-if="showSupportModal" @click.self="showSupportModal = false">
      <div class="modal-box custom-support-box">
        <div class="support-icon">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </div>
        <h3 class="text-neon-blue">SUPORTE TÉCNICO</h3>
        <p class="text-gray-light">Está com problemas para acessar sua conta ou esqueceu sua senha? Fale diretamente com nossa equipe de suporte.</p>
        
        <div class="modal-actions-support">
          <button type="button" class="btn-cancel-support" @click="showSupportModal = false">FECHAR</button>
          <button type="button" class="btn-whatsapp" @click="abrirWhatsApp">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="wa-icon"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            WHATSAPP
          </button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showLegalModal" @click.self="showLegalModal = false">
      <div class="modal-box custom-legal-box">
        <div class="legal-header">
          <h3 class="text-neon-purple">DOCUMENTOS LEGAIS</h3>
          <button type="button" class="btn-close-legal" @click="showLegalModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="legal-tabs">
          <button :class="{ active: legalTab === 'termos' }" @click="legalTab = 'termos'">Termos de Uso</button>
          <button :class="{ active: legalTab === 'privacidade' }" @click="legalTab = 'privacidade'">Privacidade</button>
        </div>

        <div class="legal-content custom-scrollbar">
          <LegalContent :tab="legalTab" />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/authService';

import MagicLogo from '../components/MagicLogo.vue'; 
import LegalContent from '../components/LegalContent.vue'; 

const router = useRouter();
const username = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

const showBannedModal = ref(false);
const bannedMessage = ref('');
const showSupportModal = ref(false); 
const showLegalModal = ref(false); 
const legalTab = ref('termos');    

const fecharModalBanned = () => {
  showBannedModal.value = false;
  bannedMessage.value = '';
};

const abrirLegal = (tab: string) => {
  legalTab.value = tab;
  showLegalModal.value = true;
};

const abrirWhatsApp = () => {
  const numeroSuporte = "5547992891050"; 
  const mensagem = encodeURIComponent("Olá, estou com problemas para acessar minha conta no Magic Casino e preciso de suporte.");
  window.open(`https://wa.me/${numeroSuporte}?text=${mensagem}`, '_blank');
};

const fazerLogin = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = "Preencha usuário e senha.";
    return;
  }

  errorMessage.value = '';
  isLoading.value = true;
  
  try {
    const userData = await authService.login(username.value.toUpperCase(), password.value);
    
    if (userData && userData.roles) {
      localStorage.setItem('magic_roles', JSON.stringify(userData.roles));
    } else {
      localStorage.setItem('magic_roles', JSON.stringify([]));
    }

    router.push('/lobby');
  } catch (error: any) {
    const msg = error.message || 'Credenciais inválidas.';
    
    if (msg.includes('BANIDO')) {
      bannedMessage.value = msg;
      showBannedModal.value = true;
    } else {
      errorMessage.value = msg;
    }
  } finally {
    isLoading.value = false;
  }
};

const irParaCadastro = () => router.push('/cadastro');
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');

.screen-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh; 
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

.auth-box::-webkit-scrollbar { width: 5px; }
.auth-box::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 10px; }

.logo-area { text-align: center; margin-bottom: 0px; } 

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

.auth-form { display: flex; flex-direction: column; gap: 10px; }

.input-group { display: flex; flex-direction: column; gap: 4px; }

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

.password-wrapper { position: relative; display: flex; align-items: center; width: 100%; }

.toggle-password {
  position: absolute; right: 12px; background: none; border: none;
  color: #a855f7; cursor: pointer; font-size: 16px;
}

.messages-area { text-align: center; min-height: 10px; margin-top: -2px; }
.error-msg { color: #ff4757; font-size: 11px; font-weight: bold; margin: 0; line-height: 1.4; }

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
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.auth-footer { text-align: center; margin-top: 15px; margin-bottom: 5px; color: #888; font-size: 12px; } 
.auth-footer a { color: #a855f7; text-decoration: none; font-weight: 700; transition: filter 0.2s; }
.auth-footer a:hover { filter: brightness(1.2); }

/* =========================================================
   ESTILOS DAS CERTIFICAÇÕES E SUPORTE DISCRETO
   ========================================================= */
.certifications-footer {
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.gl-logo {
  height: 24px;
  width: auto;
  object-fit: contain;
  opacity: 0.85;
  transition: opacity 0.2s;
  border-radius: 4px;
}
.gl-logo:hover { opacity: 1; }

.legal-links { margin: 0; font-size: 10px; color: #6b7280; }
.legal-links a { color: #9ca3af; text-decoration: none; transition: color 0.2s; }
.legal-links a:hover { color: #d1d5db; }

/* Link de Suporte Discreto */
.support-link {
  color: #6b7280 !important;
  font-size: 9px;
  text-decoration: underline;
  margin-top: 2px;
  transition: color 0.2s;
}
.support-link:hover {
  color: #9ca3af !important;
}

/* =========================================================
   ESTILOS DOS MODAIS GERAIS
   ========================================================= */
.modal-overlay { 
  position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; 
  background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; 
  z-index: 1000; padding: 20px; box-sizing: border-box; backdrop-filter: blur(5px); 
}

/* Modal de Banido (Vermelho) */
.custom-alert-box { 
  background: linear-gradient(to bottom, #1f2937, #111827); 
  border: 1px solid #ef4444; border-radius: 16px; padding: 24px; 
  width: 100%; max-width: 350px; 
  box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(239, 68, 68, 0.1); 
  text-align: center; animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
}

.alert-icon { 
  width: 60px; height: 60px; border-radius: 50%; display: flex; justify-content: center; align-items: center; 
  margin: 0 auto 15px auto; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); 
}
.alert-icon svg { width: 32px; height: 32px; color: #ef4444; }

.text-neon-red { 
  color: #ef4444; text-shadow: 0 0 12px rgba(239, 68, 68, 0.6); margin: 0; 
  font-size: 18px; font-weight: 900; letter-spacing: 1px; 
}

/* Modal de Suporte (Azul) */
.custom-support-box {
  background: linear-gradient(to bottom, #1f2937, #111827); 
  border: 1px solid #3b82f6; border-radius: 16px; padding: 24px; 
  width: 100%; max-width: 350px; 
  box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(59, 130, 246, 0.1); 
  text-align: center; animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
}

.support-icon {
  width: 60px; height: 60px; border-radius: 50%; display: flex; justify-content: center; align-items: center; 
  margin: 0 auto 15px auto; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); 
}
.support-icon svg { width: 32px; height: 32px; color: #3b82f6; }

.text-neon-blue { 
  color: #3b82f6; text-shadow: 0 0 12px rgba(59, 130, 246, 0.6); margin: 0; 
  font-size: 18px; font-weight: 900; letter-spacing: 1px; 
}

.text-gray-light { color: #d1d5db; font-size: 13px; line-height: 1.5; margin-top: 10px; font-weight: 500;}

/* Botões do Modal (Comum) */
.btn-confirm-full { 
  width: 100%; padding: 12px; border-radius: 8px; font-weight: 900; text-transform: uppercase; 
  font-size: 13px; cursor: pointer; background: #374151; color: white; border: none; 
  transition: background 0.2s; margin-top: 20px; 
}
.btn-confirm-full:hover { background: #4b5563; }

.modal-actions-support {
  display: flex; gap: 10px; margin-top: 20px;
}
.btn-cancel-support { 
  flex: 1; background: transparent; border: 1px solid #6b7280; color: #d1d5db; 
  padding: 12px; border-radius: 8px; font-weight: 900; font-size: 12px; text-transform: uppercase; 
  cursor: pointer; transition: all 0.2s; 
}
.btn-cancel-support:hover { background: #374151; color: #fff; }

.btn-whatsapp { 
  flex: 1; background: linear-gradient(to bottom, #10b981, #059669); border: 1px solid #047857; 
  color: white; padding: 12px; border-radius: 8px; font-weight: 900; font-size: 12px; 
  text-transform: uppercase; cursor: pointer; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); 
  transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;
}
.btn-whatsapp:hover { filter: brightness(1.1); transform: translateY(-1px); }
.wa-icon { width: 16px; height: 16px; flex-shrink: 0;}

/* =========================================================
   MODAL DE DOCUMENTOS LEGAIS (ROXO NEON)
   ========================================================= */
.custom-legal-box {
  background: linear-gradient(to bottom, #1f2937, #111827);
  border: 1px solid #a855f7;
  border-radius: 16px;
  padding: 20px;
  padding-bottom: 5px; 
  width: 100%;
  max-width: 500px;
  max-height: 85dvh; 
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(168, 85, 247, 0.15);
  animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.legal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.text-neon-purple {
  color: #a855f7;
  text-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
  margin: 0;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 1px;
}

.btn-close-legal {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 5px;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-close-legal:hover { color: #fff; }
.btn-close-legal svg { width: 24px; height: 24px; }

.legal-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  border-bottom: 1px solid #374151;
  padding-bottom: 10px;
}

.legal-tabs button {
  flex: 1;
  background: transparent;
  border: none;
  color: #6b7280;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  padding: 8px 0;
  border-bottom: 2px solid transparent;
}

.legal-tabs button.active {
  color: #a855f7;
  border-bottom: 2px solid #a855f7;
}

.legal-content {
  overflow-y: auto;
  text-align: left;
  padding-right: 10px;
  padding-bottom: 20px; 
  flex: 1;
  min-height: 0; 
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }

@keyframes modalScaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>

<style>
html, body {
  background-color: #000 !important;
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden !important; 
  overscroll-behavior-y: none;
}
</style>