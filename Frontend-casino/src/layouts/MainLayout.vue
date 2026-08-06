<template>
  <div class="main-layout" :style="layoutStyle">
    <Header />
    
    <main class="content-area">
      <slot></slot>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Header from '../components/Header.vue';
import BottomNav from '../components/BottomNav.vue';

// Estado para travar a altura real da tela e evitar o redimensionamento do teclado
const viewportHeight = ref('100vh');
const layoutStyle = ref({ height: '100vh' });

const updateHeight = () => {
  // Usamos window.innerHeight para pegar a altura exata ignorando o redimensionamento dinâmico do teclado em alguns browsers
  const vh = window.innerHeight;
  layoutStyle.value.height = `${vh}px`;
};

onMounted(() => {
  updateHeight();
  // Atualiza apenas se a orientação mudar (celular girar), ignorando o "resize" do teclado
  window.addEventListener('orientationchange', () => {
    setTimeout(updateHeight, 200);
  });
});

onUnmounted(() => {
  window.removeEventListener('orientationchange', updateHeight);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');

.main-layout {
  /* 🔥 CORREÇÃO CRÍTICA: Trocamos o dvh (dinâmico) por uma altura fixa controlada */
  width: 100vw;
  display: flex;
  flex-direction: column;
  background-color: #0a0f18;
  color: white;
  font-family: 'Montserrat', sans-serif;
  
  /* 🔥 FIXAÇÃO: Impede que o teclado empurre o layout para cima ou "esmague" o conteúdo */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden; 
}

.content-area {
  flex: 1;
  padding: 30px 40px;
  display: block;
  overflow-y: auto;
  /* Garante rolagem suave no iOS */
  -webkit-overflow-scrolling: touch; 
}

/* Ajuste de responsividade para telas menores */
@media (max-width: 768px) {
  .content-area {
    padding: 20px 15px;
  }
}

/* Previne que o conteúdo principal seja "comido" pela barra de navegação inferior no mobile */
main {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>