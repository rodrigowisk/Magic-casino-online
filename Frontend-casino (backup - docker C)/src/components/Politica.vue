<template>
  <div class="legal-container">
    <div class="header">
      <button class="btn-voltar" @click="$router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      <h2>Documentos Legais</h2>
    </div>

    <div class="tabs">
      <button :class="{ active: activeTab === 'termos' }" @click="activeTab = 'termos'">Termos de Uso</button>
      <button :class="{ active: activeTab === 'privacidade' }" @click="activeTab = 'privacidade'">Privacidade</button>
    </div>

    <div class="content-box custom-scrollbar" ref="contentBox">
      
      <LegalContent :tab="activeTab" />

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import LegalContent from '../components/LegalContent.vue'; // Importa o componente de texto puro

const route = useRoute();
const contentBox = ref<HTMLElement | null>(null);

// 👇 A MÁGICA AQUI: Lê a URL (ex: /politica/privacidade) para abrir a aba certa direto
const activeTab = ref((route.params.aba as string) || 'termos');

// Garante que a tela sempre abra no topo
onMounted(() => {
  window.scrollTo(0, 0);
  if (contentBox.value) {
    contentBox.value.scrollTop = 0;
  }
});

// Volta para o topo se o jogador trocar de aba
watch(activeTab, () => {
  if (contentBox.value) {
    contentBox.value.scrollTop = 0;
  }
});
</script>

<style scoped>
.legal-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #0a0f18;
  background-image: radial-gradient(circle at 50% 0%, #151e32 0%, #0a0f18 70%);
  color: #fff;
  font-family: 'Montserrat', sans-serif;
}

.header {
  display: flex;
  align-items: center;
  padding: 20px 15px;
  background: rgba(10, 15, 24, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.btn-voltar {
  background: transparent;
  border: none;
  color: #a855f7;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s;
  margin-right: 15px;
}

.btn-voltar:hover {
  background: rgba(168, 85, 247, 0.1);
}

.btn-voltar svg {
  width: 24px;
  height: 24px;
}

h2 {
  font-size: 18px;
  font-weight: 900;
  margin: 0;
  color: #fff;
  letter-spacing: 1px;
}

.tabs {
  display: flex;
  background: rgba(10, 15, 24, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0 15px;
}

.tabs button {
  flex: 1;
  background: transparent;
  border: none;
  color: #66768f;
  font-size: 14px;
  font-weight: 800;
  padding: 15px 0;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 3px solid transparent;
}

.tabs button.active {
  color: #3ce48a; /* Verde da sua paleta original da página */
  border-bottom: 3px solid #3ce48a;
}

.content-box {
  flex: 1;
  overflow-y: auto;
  padding: 25px 20px 100px 20px; /* Padding extra no final para o BottomNav não cobrir */
}

/* Scrollbar Customizada */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #2a364f;
  border-radius: 10px;
}
</style>