<template>
  <router-view v-if="!showSessionModal"></router-view>

  <div class="global-modal-overlay" v-if="showSessionModal">
    <div class="modal-box custom-alert-box">
      <div class="alert-icon">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 class="text-neon-red">ACESSO INTERROMPIDO</h3>
      <p class="text-gray-light">Sua conta foi conectada em outro dispositivo.<br><br>Este acesso será encerrado por segurança.</p>
      <button type="button" class="btn-confirm-full" @click="confirmarDesconexao">ENTENDI</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { authService, showSessionModal } from './services/authService';

// Não precisamos mais importar o MeinhoTable aqui, o Router cuida disso!

onMounted(() => {
  // Assim que o App Master é montado na tela, liga o radar do SignalR
  if (authService.isAuthenticated()) {
    authService.startSessionHub();
  }
});

/**
 * Executa o redirecionamento final para o login.
 * Mantemos o showSessionModal como true para que o usuário não veja o lobby 
 * durante o tempo de carregamento do redirecionamento.
 */
const confirmarDesconexao = () => {
  window.location.href = '/login'; 
};
</script>

<style>
/* Reset global para garantir qualidade profissional em todas as telas */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #000; /* Fundo preto absoluto para imersão total */
  overflow: hidden;
  font-family: Arial, sans-serif;
}

#app {
  width: 100%;
  height: 100%;
}

/* =========================================================
   ESTILOS DO MODAL GLOBAL DE SESSÃO ÚNICA
   ========================================================= */
.global-modal-overlay { 
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100vw; 
  height: 100vh; 
  background: #000; /* Fundo preto sólido para não mostrar o lobby atrás */
  display: flex; 
  justify-content: center; 
  align-items: center; 
  z-index: 9999; 
  padding: 20px; 
  box-sizing: border-box; 
  backdrop-filter: blur(10px); 
}

.custom-alert-box { 
  background: linear-gradient(to bottom, #1f2937, #111827); 
  border: 1px solid #ef4444; 
  border-radius: 16px; 
  padding: 24px; 
  width: 100%; 
  max-width: 350px; 
  box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(239, 68, 68, 0.1); 
  text-align: center; 
  animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
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

.text-gray-light { color: #d1d5db; font-size: 13px; line-height: 1.5; margin-top: 10px; font-weight: 500;}

.btn-confirm-full { 
  width: 100%; padding: 12px; border-radius: 8px; font-weight: 900; text-transform: uppercase; 
  font-size: 13px; cursor: pointer; background: #374151; color: white; border: none; 
  transition: background 0.2s; margin-top: 20px; 
}
.btn-confirm-full:hover { background: #4b5563; }

@keyframes modalScaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>