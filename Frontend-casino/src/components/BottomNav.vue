<template>
  <nav class="bottom-nav">
    
    <router-link to="/lobby" class="nav-item" active-class="active">
      <div class="icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
      <span>Início</span>
    </router-link>

    <router-link to="/caixa" class="nav-item" active-class="active">
      <div class="icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
          <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
          <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
        </svg>
      </div>
      <span>Caixa</span>
    </router-link>

    <router-link to="/agente" class="nav-item" active-class="active">
      <div class="icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </div>
      <span>Agente</span>
    </router-link>

    <router-link to="/perfil" class="nav-item" active-class="active">
      <div class="icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <span>Perfil</span>
    </router-link>

    <router-link to="/configuracoes" class="nav-item" active-class="active">
      <div class="icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </div>
      <span>Ajustes</span>
    </router-link>

  </nav>
</template>

<script setup lang="ts">
// Nenhuma lógica pesada necessária aqui. O router-link do Vue 
// gerencia automaticamente qual botão está ativo com a classe "active".
</script>

<style scoped>
.bottom-nav {
  width: 100%;
  height: 70px;
  background: rgba(10, 15, 24, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid #1a2639;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-sizing: border-box;
  /* Borda arredondada embaixo para encaixar no seu layout Neon */
  border-radius: 0 0 18px 18px; 
  padding: 0 10px;
  position: relative;
  z-index: 10;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #66768f; /* Cor inativa (cinza azulado) */
  width: 60px;
  height: 100%;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.icon-wrapper {
  position: relative;
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
  transition: all 0.3s ease;
}

.icon-wrapper svg {
  width: 100%;
  height: 100%;
  transition: all 0.3s ease;
}

.nav-item span {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

/* === EFEITOS DE HOVER (Quando o usuário passa o dedo/mouse) === */
.nav-item:hover {
  color: #8da1bc;
}

/* === EFEITO ACTIVE (AZUL NEON INTERNACIONAL) === */
.nav-item.active {
  color: #00f3ff; /* Azul Neon */
}

.nav-item.active .icon-wrapper {
  /* O ícone pula para cima */
  transform: translateY(-8px) scale(1.15);
}

.nav-item.active .icon-wrapper svg {
  /* Brilho neon intenso no ícone */
  filter: drop-shadow(0px 0px 8px rgba(0, 243, 255, 0.8));
}

.nav-item.active span {
  /* O texto ganha brilho e sobe um pouquinho junto */
  transform: translateY(-2px);
  text-shadow: 0px 0px 8px rgba(0, 243, 255, 0.5);
}

/* Bolinha luminosa abaixo do ícone ativo (Estilo iOS Premium) */
.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: 8px;
  width: 4px;
  height: 4px;
  background-color: #00f3ff;
  border-radius: 50%;
  box-shadow: 0 0 8px #00f3ff, 0 0 12px #00f3ff;
  animation: pulseLight 2s infinite alternate;
}

@keyframes pulseLight {
  0% { opacity: 0.6; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.2); }
}
</style>