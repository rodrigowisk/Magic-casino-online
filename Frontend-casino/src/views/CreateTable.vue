<template>
  <div class="create-content">
    <div class="header-titles">
      <h2>Criar Nova Mesa</h2>
      <span class="subtitle">Selecione a modalidade e configure as regras</span>
    </div>

    <div class="game-selector">
      <button 
        class="tab-btn" 
        :class="{ active: jogoSelecionado === 'cacheta' }"
        @click="jogoSelecionado = 'cacheta'"
      >
        🃏 Cacheta
      </button>
      
      <button 
        class="tab-btn" 
        :class="{ active: jogoSelecionado === 'meinho' }"
        @click="jogoSelecionado = 'meinho'"
      >
        🎴 Meinho
      </button>

      <button class="tab-btn disabled" title="Em breve">
        🎲 Truco (Em Breve)
      </button>
    </div>

    <div class="form-container">
      
      <FormCriarCacheta v-if="jogoSelecionado === 'cacheta'" />
      
      <FormCriarMeinho v-if="jogoSelecionado === 'meinho'" />

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Importação apenas dos formulários reais
import FormCriarCacheta from '../components/forms/FormCriarCacheta.vue';
import FormCriarMeinho from '../components/forms/FormCriarMeinho.vue';

// Estado que controla qual aba está aberta (padrão: cacheta)
const jogoSelecionado = ref('cacheta');
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap');

/* Agora este componente flui livremente dentro da content-area do seu main-layout */
.create-content {
  width: 100%;
  max-width: 800px; 
  margin: 0 auto; 
  display: block; 
  box-sizing: border-box;
}

.header-titles {
  text-align: center;
  margin-bottom: 30px;
}

.header-titles h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 900;
  text-transform: uppercase;
  color: #fff;
  text-shadow: 0 2px 10px rgba(56, 189, 248, 0.5);
}

.subtitle {
  color: #94a3b8;
  font-size: 14px;
  font-weight: 500;
}

.game-selector {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 30px;
  background: rgba(0, 0, 0, 0.4);
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  flex-wrap: wrap; 
}

.tab-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #94a3b8;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 120px;
}

.tab-btn:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.tab-btn.active {
  background: linear-gradient(to bottom, #38bdf8, #0284c7);
  border-color: #0c4a6e;
  color: white;
  box-shadow: 0 4px 15px rgba(2, 132, 199, 0.5);
}

.tab-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-style: dashed;
}

.form-container {
  width: 100%;
  display: block; 
}
</style>