<template>
  <div class="menu-overlay" @click.self="$emit('close')">
    <div class="menu-content">
      
      <div class="menu-header">
        <button class="close-btn" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="menu-body">
        
        <button class="menu-item" @click="$emit('lobby')">
          <div class="item-left">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span class="warning-text">Voltar para o Lobby</span>
          </div>
        </button>

        <button class="menu-item" @click="$emit('leave')">
          <div class="item-left">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
            <span class="danger-text">Levantar</span>
          </div>
        </button>

        <button v-if="isSeated" class="menu-item" @click="$emit('rebuy')">
          <div class="item-left">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3ce48a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <span class="success-text">Recarregar Fichas</span>
          </div>
        </button>

        <div class="menu-item toggle-row" @click="toggleSound">
          <div class="item-left">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <div class="item-text-col">
              <span class="normal-text">Som do Jogo</span>
              <small>(efeitos sonoros)</small>
            </div>
          </div>
          <div class="custom-switch" :class="{ active: soundEnabled }">
            <div class="switch-knob"></div>
          </div>
        </div>

        <div class="menu-item toggle-row" @click="togglePeek">
          <div class="item-left">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00f3ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span class="normal-text">Filar carta</span>
          </div>
          <div class="custom-switch" :class="{ active: peekEnabled }">
            <div class="switch-knob"></div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue';

const props = withDefaults(defineProps<{
  soundEnabled?: boolean;
  peekEnabled?: boolean;
  isSeated?: boolean; 
}>(), {
  soundEnabled: true, // O som agora inicia ligado
  peekEnabled: false,
  isSeated: false
});

const emit = defineEmits(['close', 'leave', 'lobby', 'rules', 'settings', 'toggleSound', 'togglePeek', 'rebuy']);

function toggleSound() {
  emit('toggleSound', !props.soundEnabled);
}

function togglePeek() {
  emit('togglePeek', !props.peekEnabled);
}
</script>

<style scoped>
.menu-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 430px; 
  height: 900px;
  /* 👇 Fundo agora é transparente para você ver e usar a mesa 👇 */
  background: transparent;
  z-index: 100; 
}

.menu-content {
  position: absolute;
  left: 0;
  top: 20px; 
  width: fit-content; 
  min-width: 220px; 
  background: linear-gradient(135deg, rgba(20, 28, 45, 0.95), rgba(10, 15, 25, 0.98));
  border: 1px solid rgba(0, 243, 255, 0.4);
  border-left: none; 
  border-radius: 0 16px 16px 0; 
  box-shadow: 15px 5px 35px rgba(0,0,0,0.8), inset -5px 0 20px rgba(0, 243, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideInLeftTop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1);
}

@keyframes slideInLeftTop {
  0% { transform: translateX(-100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

.menu-header {
  display: flex;
  justify-content: flex-end; 
  align-items: center;
  padding: 10px 12px 0 0; 
  background: transparent;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fff;
}

.close-btn svg {
  width: 22px; 
  height: 22px;
}

.menu-body {
  display: flex;
  flex-direction: column;
  padding: 0 0 10px 0; 
}

.menu-item {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px 16px; 
  width: 100%;
  box-sizing: border-box; 
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover, .menu-item:active {
  background: rgba(0, 243, 255, 0.1);
}

.toggle-row {
  justify-content: space-between; 
  gap: 20px; 
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px; 
}

.item-left svg {
  width: 20px; 
  height: 20px;
}

.item-text-col {
  display: flex;
  flex-direction: column;
}

.item-text-col small {
  font-size: 10px; 
  color: rgba(255, 255, 255, 0.4);
  margin-top: 1px;
  font-family: Arial, sans-serif;
  line-height: 1;
  white-space: nowrap; 
}

.normal-text {
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 14px; 
  font-weight: 500;
  white-space: nowrap; 
}

.warning-text {
  color: #f1c40f;
  font-family: Arial, sans-serif;
  font-size: 14px; 
  font-weight: bold;
  white-space: nowrap; 
}

.danger-text {
  color: #e74c3c;
  font-family: Arial, sans-serif;
  font-size: 14px; 
  font-weight: bold;
  white-space: nowrap; 
}

.success-text {
  color: #3ce48a;
  font-family: Arial, sans-serif;
  font-size: 14px; 
  font-weight: bold;
  white-space: nowrap; 
}

.custom-switch {
  width: 36px; 
  height: 20px; 
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  position: relative;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0; 
}

.switch-knob {
  width: 14px; 
  height: 14px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.custom-switch.active {
  background: rgba(0, 243, 255, 0.2);
  border-color: #00f3ff;
  box-shadow: inset 0 0 10px rgba(0, 243, 255, 0.2);
}

.custom-switch.active .switch-knob {
  transform: translateX(16px); 
  background: #00f3ff;
  box-shadow: 0 0 8px #00f3ff;
}
</style>