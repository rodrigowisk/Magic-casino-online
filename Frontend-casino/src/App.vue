<template>
  <router-view></router-view>
</template>

<script setup lang="ts">
// Não precisamos mais importar o MeinhoTable aqui, o Router cuida disso!
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
</style>