<template>
  <div class="screen-wrapper">
    <div class="app-box">
      <Header />

      <main class="content-area">
        <div class="page-title">
          <h2>AJUSTES</h2>
        </div>
        <div class="empty-message">
          <p>Configurações de som e mesa em construção...</p>
        </div>
      </main>

      <BottomNav />
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from '../components/Header.vue';
import BottomNav from '../components/BottomNav.vue';
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');

.screen-wrapper {
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh; 
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px; 
  box-sizing: border-box;
  background-color: #000;
  background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%);
  font-family: 'Montserrat', sans-serif;
}

.app-box {
  width: 100%;
  max-width: 480px; 
  height: 95vh; 
  height: 95dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden; 
  background: linear-gradient(to bottom, #000000 0%, rgba(10, 15, 24, 0.9) 100%);
  border: 2px solid #a855f7;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.4);
  box-sizing: border-box;
  color: white;
}

.content-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.page-title h2 {
  margin: 0 0 20px 0;
  font-size: 22px;
  font-weight: 900;
  color: #f1c40f; /* Dourado para configurações */
  text-align: center;
  text-transform: uppercase;
}

.empty-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-style: italic;
  font-size: 14px;
}
</style>