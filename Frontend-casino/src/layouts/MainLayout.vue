<template>
  <div class="main-layout">
    <Header />
    
    <main class="content-area">
      <slot></slot>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import Header from '../components/Header.vue';
import BottomNav from '../components/BottomNav.vue';
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');

.main-layout {
  width: 100vw;
  height: 100vh;      /* CORREÇÃO: Travado em height ao invés de min-height */
  height: 100dvh;     /* CORREÇÃO: Travado em height ao invés de min-height */
  display: flex;
  flex-direction: column;
  background-color: #0a0f18; /* Cor de fundo escura padrão do Lobby */
  color: white;
  font-family: 'Montserrat', sans-serif;
  overflow: hidden;   /* CORREÇÃO: Impede que a tela inteira quebre a rolagem */
}

.content-area {
  flex: 1;
  padding: 30px 40px; /* Espaçamento padrão para desktop e telas maiores */
  display: block;     /* CORREÇÃO: O display flex aqui era o que cortava o topo */
  overflow-y: auto;   /* A rolagem agora acontece perfeitamente aqui dentro */
}

/* Ajuste de responsividade para telas menores */
@media (max-width: 768px) {
  .content-area {
    padding: 20px 15px;
  }
}
</style>