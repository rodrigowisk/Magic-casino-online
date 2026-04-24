<template>
  <div class="main-layout">
    <Header />

    <main class="content-area">
      <div class="settings-container">
        
        <div class="page-header">
          <button class="btn-back glass-btn" @click="voltar">←</button>
          <div class="header-titles">
            <h1 class="page-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="title-icon text-blue">
                <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
              Gerais
            </h1>
            <p class="subtitle">Regras, suporte e preferências do app.</p>
          </div>
        </div>

        <div class="sections-wrapper fade-in-up">
          
          <div class="glass-card section-card">
            <div class="section-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <h2>Preferências do App</h2>
            </div>
            <div class="section-body">
              
              <div class="list-item" @click="toggleSetting('appSounds')">
                <div class="item-left">
                  <div class="icon-box bg-blue-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="item-icon text-blue"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                  </div>
                  <div class="item-text">
                    <h3 :class="{ 'text-blue': settings.appSounds }">Sons do Aplicativo</h3>
                    <p>Efeitos sonoros ao clicar em botões e menus</p>
                  </div>
                </div>
                <div class="toggle-switch" :class="{ 'active': settings.appSounds }">
                  <div class="toggle-knob"></div>
                </div>
              </div>

              <div class="list-item" @click="toggleSetting('haptics')">
                <div class="item-left">
                  <div class="icon-box bg-yellow-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="item-icon text-yellow"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                  </div>
                  <div class="item-text">
                    <h3 :class="{ 'text-yellow': settings.haptics }">Vibração (Haptics)</h3>
                    <p>Pequenas vibrações ao interagir com o app</p>
                  </div>
                </div>
                <div class="toggle-switch" :class="{ 'active': settings.haptics }">
                  <div class="toggle-knob"></div>
                </div>
              </div>

            </div>
          </div>

          <div class="glass-card section-card">
            <div class="section-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <h2>Como Jogar</h2>
            </div>
            <div class="section-body">
              
              <button class="list-item clickable" @click="openDoc('Regras da Cacheta')">
                <div class="item-left">
                  <div class="icon-box bg-orange-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="item-icon text-orange"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </div>
                  <div class="item-text">
                    <h3>Regras da Cacheta</h3>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>

              <button class="list-item clickable" @click="openDoc('Regras do Meinho')">
                <div class="item-left">
                  <div class="icon-box bg-pink-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="item-icon text-pink"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M12 12h.01"></path><path d="M17 12h.01"></path><path d="M7 12h.01"></path></svg>
                  </div>
                  <div class="item-text">
                    <h3>Regras do Meinho</h3>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>

            </div>
          </div>

          <div class="glass-card section-card">
            <div class="section-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
              <h2>Suporte e Políticas</h2>
            </div>
            <div class="section-body">
              
              <button class="list-item clickable" @click="contactSupport">
                <div class="item-left">
                  <div class="icon-box bg-emerald-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="item-icon text-emerald"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line><line x1="14.83" y1="9.17" x2="18.36" y2="5.64"></line><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line></svg>
                  </div>
                  <div class="item-text">
                    <h3>Central de Ajuda (Suporte)</h3>
                    <p>Fale com nossa equipe via WhatsApp</p>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>

              <button class="list-item clickable" @click="$router.push('/politica')">
                <div class="item-left">
                  <div class="icon-box bg-gray-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="item-icon text-gray"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                  </div>
                  <div class="item-text">
                    <h3>Termos de Uso e Condições</h3>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>

              <button class="list-item clickable" @click="$router.push('/politica')">
                <div class="item-left">
                  <div class="icon-box bg-gray-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="item-icon text-gray"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                  </div>
                  <div class="item-text">
                    <h3>Política de Privacidade</h3>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>

              <button class="list-item clickable" @click="openDoc('Jogo Responsável')">
                <div class="item-left">
                  <div class="icon-box bg-green-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="item-icon text-green"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                  </div>
                  <div class="item-text">
                    <h3 class="text-green">Jogo Responsável</h3>
                    <p>Dicas para manter o controle e segurança</p>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>

            </div>
          </div>

          <div class="app-footer-info">
            <p class="version">Magic Casino v1.0.0</p>
            <p class="copyright">© 2026 Todos os direitos reservados.</p>
          </div>

        </div>
      </div>
    </main>

    <BottomNav />

    <transition name="fade">
      <div v-if="toast.show" class="toast-overlay">
        <div class="toast-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>{{ toast.message }}</span>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showDocModal" class="doc-modal-overlay" @click.self="showDocModal = false">
        <div class="doc-modal-box">
          
          <div class="doc-header">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="doc-icon"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              {{ docTitle }}
            </h3>
            <button @click="showDocModal = false" class="btn-close-doc">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div class="doc-body custom-scrollbar">
            <p>Bem-vindo(a) à seção de <strong>{{ docTitle }}</strong> do Magic Casino.</p>
            <br>
            <p>O conteúdo completo oficial será inserido aqui pelo administrador do sistema. Esta janela serve para manter o jogador dentro do aplicativo, garantindo uma leitura imersiva e rápida sem abrir navegadores externos.</p>
            <br>
            <p v-if="docTitle === 'Jogo Responsável'" class="text-yellow italic">Lembre-se: Jogue apenas com o dinheiro que você pode perder. O jogo é para diversão, não uma fonte de renda.</p>
          </div>

          <div class="doc-footer">
            <button @click="showDocModal = false" class="btn-close-primary">Fechar</button>
          </div>

        </div>
      </div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Header from '../components/Header.vue';
import BottomNav from '../components/BottomNav.vue';

const router = useRouter();

// Objeto reativo com as preferências globais
const settings = reactive({
  appSounds: true,
  haptics: true
});

const toast = ref({ show: false, message: '' });
const showDocModal = ref(false);
const docTitle = ref('');

const showToast = (msg: string) => {
  toast.value = { show: true, message: msg };
  setTimeout(() => { toast.value.show = false; }, 2500);
};

// Alterna as opções booleanas
const toggleSetting = (key: keyof typeof settings) => {
  if (typeof settings[key] === 'boolean') {
    (settings[key] as boolean) = !settings[key];
  }
};

// Abre o modal genérico de leitura (ainda usado pelas regras de cacheta e jogo responsável)
const openDoc = (title: string) => {
  docTitle.value = title;
  showDocModal.value = true;
};

// Ação de Suporte (Envia pro Whats ou abre Modal)
const contactSupport = () => {
    // window.open('https://wa.me/5511999999999', '_blank');
    showToast("Abrindo chat de suporte...");
};

// Carrega do LocalStorage ao montar a página
onMounted(() => {
  const savedSettings = localStorage.getItem('magic_global_settings');
  if (savedSettings) {
    Object.assign(settings, JSON.parse(savedSettings));
  }
});

// Observa mudanças e salva automaticamente
watch(settings, (newSettings) => {
  localStorage.setItem('magic_global_settings', JSON.stringify(newSettings));
}, { deep: true });

const voltar = () => {
  router.push('/lobby');
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;900&display=swap');

/* ========================================================
   CORES E UTILITÁRIOS
   ======================================================== */
.text-blue { color: #00f3ff; }
.bg-blue-light { background: rgba(0, 243, 255, 0.1); border: 1px solid rgba(0, 243, 255, 0.2); }

.text-yellow { color: #fbbf24; }
.bg-yellow-light { background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); }

.text-orange { color: #f97316; }
.bg-orange-light { background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.2); }

.text-pink { color: #ec4899; }
.bg-pink-light { background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.2); }

.text-emerald { color: #10b981; }
.bg-emerald-light { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); }

.text-gray { color: #9ca3af; }
.bg-gray-light { background: rgba(156, 163, 175, 0.1); border: 1px solid rgba(156, 163, 175, 0.2); }

.text-green { color: #22c55e; }
.bg-green-light { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); }

/* ========================================================
   ESTRUTURA PRINCIPAL
   ======================================================== */
.main-layout {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: #000;
  background-image: radial-gradient(circle at 50% 50%, #1a1525 0%, #0a0510 100%);
  color: white;
  font-family: 'Montserrat', sans-serif;
  overflow: hidden;
}

.content-area {
  flex: 1;
  padding: 20px 40px;
  overflow-y: auto;
  box-sizing: border-box;
  padding-bottom: 90px;
}

@media (max-width: 768px) {
  .content-area { padding: 15px 15px; padding-bottom: 90px; }
}

.settings-container {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* ========================================================
   CABEÇALHO
   ======================================================== */
.page-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}

.glass-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  font-size: 18px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: 0.3s;
}
.glass-btn:hover { background: rgba(255,255,255,0.1); }

.header-titles { display: flex; flex-direction: column; }
.page-title { 
  margin: 0; 
  font-size: 24px; 
  font-weight: 900; 
  display: flex; 
  align-items: center; 
  gap: 10px; 
}
.title-icon { width: 28px; height: 28px; flex-shrink: 0; }
.subtitle { margin: 2px 0 0 0; font-size: 12px; color: #9ca3af; }

/* ========================================================
   CARDS DE SEÇÃO
   ======================================================== */
.sections-wrapper { display: flex; flex-direction: column; gap: 20px; }

.glass-card {
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
}

.section-header {
  padding: 12px 15px;
  background: rgba(0,0,0,0.2);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon { width: 16px; height: 16px; color: #9ca3af; flex-shrink: 0; }

.section-header h2 {
  margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;
}

.section-body { display: flex; flex-direction: column; }

/* ========================================================
   ITENS DA LISTA
   ======================================================== */
.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  border-bottom: 1px solid rgba(255,255,255,0.02);
  background: transparent;
  border-left: none;
  border-right: none;
  border-top: none;
  color: white;
  text-align: left;
  width: 100%;
  box-sizing: border-box; 
  transition: 0.2s;
}

.list-item:last-child { border-bottom: none; }
.list-item.clickable { cursor: pointer; }
.list-item.clickable:hover { background: rgba(255,255,255,0.03); }

.item-left {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
  min-width: 0; 
}

.icon-box {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.item-icon { width: 18px; height: 18px; flex-shrink: 0; }

.chevron-icon { width: 20px; height: 20px; color: #6b7280; flex-shrink: 0; transition: 0.2s; }
.list-item.clickable:hover .chevron-icon { color: white; transform: translateX(2px); }

.item-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.item-text h3 { margin: 0; font-size: 14px; font-weight: 800; transition: 0.2s; }
.item-text p { margin: 0; font-size: 11px; color: #9ca3af; }
.list-item:hover .item-text h3 { filter: brightness(1.2); }

/* ========================================================
   TOGGLE SWITCH (BOTÃO LIGA/DESLIGA)
   ======================================================== */
.toggle-switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: #374151;
  border: 1px solid #4b5563;
  position: relative;
  transition: all 0.3s ease;
  cursor: pointer;
  flex-shrink: 0; 
}

.toggle-switch.active {
  background: #22c55e;
  border-color: #4ade80;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
}

.toggle-knob {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 3px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(20px);
}

/* ========================================================
   RODAPÉ DO APP E MODAIS
   ======================================================== */
.app-footer-info { text-align: center; padding: 30px 0; }
.app-footer-info .version { margin: 0; font-size: 12px; font-weight: 900; color: #4b5563; text-transform: uppercase; letter-spacing: 2px;}
.app-footer-info .copyright { margin: 5px 0 0 0; font-size: 10px; color: #374151; }

.doc-modal-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(5px);
  display: flex; justify-content: center; align-items: center;
  z-index: 9999; padding: 15px; box-sizing: border-box;
}

.doc-modal-box {
  background: #1a2c38; border: 1px solid #374151; border-radius: 12px;
  width: 100%; max-width: 600px; height: 80vh; display: flex; flex-direction: column;
  box-shadow: 0 20px 50px rgba(0,0,0,0.8); overflow: hidden;
  animation: modalScaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.doc-header { padding: 15px 20px; background: #0f212e; border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; }
.doc-header h3 { margin: 0; font-size: 14px; font-weight: 900; color: white; display: flex; align-items: center; gap: 8px; }
.doc-icon { width: 18px; height: 18px; color: #00f3ff; flex-shrink: 0; }

.btn-close-doc { background: transparent; border: none; color: #6b7280; width: 24px; height: 24px; cursor: pointer; padding: 0; transition: 0.2s; }
.btn-close-doc:hover { color: white; transform: scale(1.1); }

.doc-body { padding: 25px; flex: 1; overflow-y: auto; background: #15202b; color: #d1d5db; font-size: 13px; line-height: 1.6; }
.doc-body p { margin: 0 0 15px 0; }
.doc-body strong { color: white; font-weight: 900; }
.doc-body .italic { font-style: italic; }

.doc-footer { padding: 15px 20px; background: #0f212e; border-top: 1px solid #374151; display: flex; justify-content: flex-end; }
.btn-close-primary { padding: 10px 25px; background: #374151; border: none; border-radius: 6px; color: white; font-size: 11px; font-weight: 900; text-transform: uppercase; cursor: pointer; transition: 0.2s; }
.btn-close-primary:hover { background: #4b5563; }

.toast-overlay { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); z-index: 9999; pointer-events: none; }
.toast-box { background: #1a2c38; border: 1px solid rgba(34, 197, 94, 0.5); color: white; padding: 12px 24px; border-radius: 30px; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
.toast-icon { width: 20px; height: 20px; color: #4ade80; flex-shrink: 0; }
.toast-box span { font-size: 12px; font-weight: 800; }

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }

.fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes modalScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>