<template>
  <transition name="fade-out">
    <div v-if="visible" class="loading-overlay">
      <div class="loading-content">
        
        <div class="logo-wrapper">
          <MagicLogo />
        </div>

        <div class="progress-text text-neon">
          {{ Math.round(progress) }}%
        </div>

        <div class="progress-track">
          <div class="progress-bar bg-neon" :style="{ width: progress + '%' }"></div>
        </div>

        <div class="status-text">Conectando à Mesa...</div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
// Importe o componente que acabamos de criar. Ajuste o caminho conforme sua estrutura de pastas!
import MagicLogo from '../MagicLogo.vue'; 

const props = defineProps({
  visible: { type: Boolean, default: true }
});

const progress = ref(0);

// Mantemos apenas a lógica da barra de progresso no Loading
onMounted(() => {
  const duration = 2500; 
  const interval = 20; 
  const steps = duration / interval;
  const increment = 100 / steps;

  const timer = setInterval(() => {
    progress.value += increment;
    if (progress.value >= 100) {
      progress.value = 100;
      clearInterval(timer);
    }
  }, interval);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #0b0f18;
  background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  border-radius: 20px;
  font-family: 'Montserrat', sans-serif;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px; 
  width: 80%;
}

.logo-wrapper {
  position: relative;
  /* Margem negativa mantida para colar na barra */
  margin-bottom: -100px; 
}

.text-neon {
  color: #00f3ff;
  font-weight: 900;
  font-size: 24px;
  text-shadow: 0 0 10px rgba(0, 243, 255, 0.7), 0 0 20px rgba(0, 243, 255, 0.5);
  margin-top: 10px; 
}

.progress-track {
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(168, 85, 247, 0.2);
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
}

.bg-neon {
  height: 100%;
  background: linear-gradient(90deg, #a855f7 0%, #d8b4fe 100%);
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.8), 0 0 20px rgba(168, 85, 247, 0.5);
  transition: width 0.1s linear;
}

.status-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 5px;
}

.fade-out-leave-active {
  transition: opacity 0.8s ease-out;
}
.fade-out-leave-to {
  opacity: 0;
}
</style>