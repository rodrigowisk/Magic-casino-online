<template>
  <div class="avatar-modal-overlay" v-if="show" @click.self="fechar">
    <div class="avatar-modal-box">
      <h3>Escolha seu Avatar</h3>
      <p>Selecione uma imagem para o seu perfil</p>
      
      <div class="avatar-tabs">
        <button 
          :class="{ active: currentTab === 'man' }" 
          @click="currentTab = 'man'">
          Homem
        </button>
        <button 
          :class="{ active: currentTab === 'woman' }" 
          @click="currentTab = 'woman'">
          Mulher
        </button>
      </div>
      
      <div class="avatar-grid">
        <img 
          v-for="av in avataresExibidos" 
          :key="av" 
          :src="getAvatarUrl(av)" 
          :class="['avatar-option', currentAvatar === av ? 'selected' : '']"
          @click="selecionar(av)"
          loading="lazy"
        />
      </div>
      
      <div class="modal-actions">
        <button class="btn-cancel" @click="fechar">Fechar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  show: boolean;
  currentAvatar: string;
}>();

const emit = defineEmits(['close', 'select']);

const currentTab = ref<'man' | 'woman'>('man'); // Controla a aba atual

// Gera as listas baseadas na quantidade de arquivos das suas pastas
const listaHomem = Array.from({ length: 24 }, (_, i) => `man/${i + 1}.webp`);
const listaMulher = Array.from({ length: 5 }, (_, i) => `woman/${i + 1}.webp`);

// Alterna a lista a ser exibida
const avataresExibidos = computed(() => {
  return currentTab.value === 'man' ? listaHomem : listaMulher;
});

// A mágica do Vite para puxar as imagens
const avatarImages: Record<string, string> = import.meta.glob('../assets/imagens/avatars/**/*.webp', { eager: true, import: 'default' });

const getAvatarUrl = (filename: string) => {
  const safeFilename = filename || 'default.webp';
  const path = `../assets/imagens/avatars/${safeFilename}`;
  return avatarImages[path] || avatarImages['../assets/imagens/avatars/default.webp'];
};

// Emite os eventos para os componentes pais (Header ou Perfil)
const fechar = () => {
  emit('close');
};

const selecionar = (av: string) => {
  emit('select', av);
};
</script>

<style scoped>
/* === MODAL DE AVATAR GERAL === */
.avatar-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.avatar-modal-box {
  background: linear-gradient(135deg, rgba(20, 28, 45, 0.95), rgba(10, 15, 25, 0.98));
  border: 2px solid #a855f7;
  border-radius: 16px;
  padding: 25px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 0 15px rgba(168, 85, 247, 0.2);
  text-align: center;
  animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideUp {
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.avatar-modal-box h3 {
  color: #a855f7;
  margin: 0 0 10px 0;
  font-weight: 900;
  text-transform: uppercase;
  font-family: 'Montserrat', sans-serif;
}

.avatar-modal-box p {
  color: #bbb;
  font-size: 13px;
  margin: 0 0 15px 0;
  font-family: 'Montserrat', sans-serif;
}

/* ESTILOS DAS ABAS HOMEM/MULHER */
.avatar-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.avatar-tabs button {
  background: #111;
  border: 1px solid #444;
  color: #888;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 12px;
  transition: all 0.2s;
  font-family: 'Montserrat', sans-serif;
}

.avatar-tabs button:hover {
  background: #222;
  color: #fff;
}

.avatar-tabs button.active {
  background: rgba(168, 85, 247, 0.15);
  border-color: #a855f7;
  color: #fff;
  box-shadow: inset 0 0 8px rgba(168, 85, 247, 0.3);
}

/* GRELHA DE AVATARES - LIMPA E SEM FUNDO PRETO */
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 15px;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 5px;
}

.avatar-grid::-webkit-scrollbar { width: 5px; }
.avatar-grid::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 10px; }

/* O SEGredo para não ter círculo de fundo: Manter a imagem pura! */
.avatar-option {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.6;
}

.avatar-option:hover {
  opacity: 1;
  transform: scale(1.1);
}

.avatar-option.selected {
  opacity: 1;
  border-color: #a855f7;
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.8);
  transform: scale(1.1);
}

.modal-actions {
  margin-top: 25px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #666;
  color: #bbb;
  padding: 10px 25px;
  border-radius: 8px;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Montserrat', sans-serif;
}

.btn-cancel:hover {
  background: #333;
  color: #fff;
}
</style>