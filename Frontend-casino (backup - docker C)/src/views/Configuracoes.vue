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
            <p class="subtitle">Regras, suporte e políticas do clube.</p>
          </div>
        </div>

        <div class="sections-wrapper fade-in-up">
          
          <div class="glass-card section-card">
            <div class="section-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <h2>Como Jogar</h2>
            </div>
            <div class="section-body">
              
              <button v-if="activeGames.cacheta" class="list-item clickable" @click="$router.push('/regras/cacheta')">
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

              <button v-if="activeGames.meinho" class="list-item clickable" @click="$router.push('/regras/meinho')">
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

              <button class="list-item clickable" @click="$router.push('/politica/termos')">
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

              <button class="list-item clickable" @click="$router.push('/politica/privacidade')">
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

              <button class="list-item clickable" @click="$router.push('/jogo-responsavel')">
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
              
              <button class="list-item clickable" @click="openDeleteModal">
                <div class="item-left">
                  <div class="icon-box bg-red-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="item-icon text-red"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </div>
                  <div class="item-text">
                    <h3 class="text-red">Excluir Conta</h3>
                    <p>Solicitar remoção permanente de dados</p>
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

    <div v-if="showDeleteModal" class="modal-overlay fade-in">
      <div class="modal-content glass-card danger-border fade-in-up">
        
        <div v-if="!isDeleted" class="modal-state">
          <div class="modal-icon-wrapper bg-red-light">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="modal-icon text-red"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </div>
          <h2 class="text-red">Excluir Conta?</h2>
          <p class="modal-text">Sua conta e todos os seus dados serão permanentemente apagados de nossos servidores. Deseja continuar?</p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="closeModal">Cancelar</button>
            <button class="btn-danger" @click="confirmDelete">Sim, Excluir</button>
          </div>
        </div>

        <div v-else class="modal-state">
          <div class="modal-icon-wrapper bg-green-light">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="modal-icon text-green"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h2 class="text-green">Solicitação Recebida</h2>
          <p class="modal-text">Recebemos a sua solicitação. Sua conta será totalmente desativada em no máximo <strong>24 horas</strong>.</p>
          <div class="modal-actions full-width">
            <button class="btn-primary" @click="closeModal">Entendi</button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Header from '../components/Header.vue';
import BottomNav from '../components/BottomNav.vue';
import { activeGames } from '../services/gameSettings';

const router = useRouter();

// ==========================================
// CONTROLES DO MODAL DE EXCLUSÃO DE CONTA
// ==========================================
const showDeleteModal = ref(false);
const isDeleted = ref(false);

const openDeleteModal = () => {
  showDeleteModal.value = true;
  isDeleted.value = false; // Garante que comece sempre na tela de confirmação
};

const confirmDelete = () => {
  // Troca para a tela de "Solicitação Recebida (24h)"
  isDeleted.value = true;
  
  // DICA: Aqui no futuro você pode colocar o código para enviar 
  // um aviso para sua API de backend marcando o usuário para exclusão.
};

const closeModal = () => {
  showDeleteModal.value = false;
};
// ==========================================

const contactSupport = () => {
  const whatsappNumber = "554792891050"; 
  const mensagem = encodeURIComponent("Olá, preciso de suporte no aplicativo Magic Casino.");
  window.open(`https://wa.me/${whatsappNumber}?text=${mensagem}`, '_blank');
};

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
.text-red { color: #ef4444; }
.bg-red-light { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); }

/* ========================================================
   ESTRUTURA PRINCIPAL E COMPONENTES
   ======================================================== */
.main-layout { width: 100vw; height: 100vh; height: 100dvh; display: flex; flex-direction: column; background-color: #000; background-image: radial-gradient(circle at 50% 50%, #1a1525 0%, #0a0510 100%); color: white; font-family: 'Montserrat', sans-serif; overflow: hidden; }
.content-area { flex: 1; padding: 20px 40px; overflow-y: auto; box-sizing: border-box; padding-bottom: 90px; }
@media (max-width: 768px) { .content-area { padding: 15px 15px; padding-bottom: 90px; } }
.settings-container { max-width: 800px; margin: 0 auto; width: 100%; }

.page-header { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
.glass-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; font-size: 18px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.3s; }
.glass-btn:hover { background: rgba(255,255,255,0.1); }
.header-titles { display: flex; flex-direction: column; }
.page-title { margin: 0; font-size: 24px; font-weight: 900; display: flex; align-items: center; gap: 10px; }
.title-icon { width: 28px; height: 28px; flex-shrink: 0; }
.subtitle { margin: 2px 0 0 0; font-size: 12px; color: #9ca3af; }

.sections-wrapper { display: flex; flex-direction: column; gap: 20px; }
.glass-card { background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4); }
.section-header { padding: 12px 15px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 10px; }
.header-icon { width: 16px; height: 16px; color: #9ca3af; flex-shrink: 0; }
.section-header h2 { margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; }
.section-body { display: flex; flex-direction: column; }

.list-item { display: flex; align-items: center; justify-content: space-between; padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.02); background: transparent; border-left: none; border-right: none; border-top: none; color: white; text-align: left; width: 100%; box-sizing: border-box; transition: 0.2s; }
.list-item:last-child { border-bottom: none; }
.list-item.clickable { cursor: pointer; }
.list-item.clickable:hover { background: rgba(255,255,255,0.03); }
.item-left { display: flex; align-items: center; gap: 15px; flex: 1; min-width: 0; }
.icon-box { width: 36px; height: 36px; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0; }
.item-icon { width: 18px; height: 18px; flex-shrink: 0; }
.chevron-icon { width: 20px; height: 20px; color: #6b7280; flex-shrink: 0; transition: 0.2s; }
.list-item.clickable:hover .chevron-icon { color: white; transform: translateX(2px); }
.item-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.item-text h3 { margin: 0; font-size: 14px; font-weight: 800; transition: 0.2s; }
.item-text p { margin: 0; font-size: 11px; color: #9ca3af; }
.list-item:hover .item-text h3 { filter: brightness(1.2); }

.app-footer-info { text-align: center; padding: 30px 0; }
.app-footer-info .version { margin: 0; font-size: 12px; font-weight: 900; color: #4b5563; text-transform: uppercase; letter-spacing: 2px;}
.app-footer-info .copyright { margin: 5px 0 0 0; font-size: 10px; color: #374151; }

.fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ========================================================
   ESTILOS DO MODAL / POPUP
   ======================================================== */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 9999; }
.modal-content { width: 90%; max-width: 380px; padding: 30px 20px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.danger-border { border: 1px solid rgba(239, 68, 68, 0.3); }

.modal-state { display: flex; flex-direction: column; align-items: center; width: 100%; }
.modal-icon-wrapper { width: 60px; height: 60px; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin-bottom: 15px; }
.modal-icon { width: 30px; height: 30px; }
.modal-text { font-size: 13px; color: #d1d5db; line-height: 1.5; margin: 10px 0 25px 0; }

.modal-actions { display: flex; gap: 10px; width: 100%; }
.modal-actions.full-width { justify-content: center; }

.btn-cancel, .btn-danger, .btn-primary { flex: 1; padding: 14px; border-radius: 10px; font-weight: 700; font-family: 'Montserrat', sans-serif; cursor: pointer; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; transition: 0.3s; }

.btn-cancel { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; }
.btn-cancel:hover { background: rgba(255,255,255,0.1); }

.btn-danger { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; }
.btn-danger:hover { background: rgba(239, 68, 68, 0.25); box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }

.btn-primary { background: rgba(0, 243, 255, 0.15); border: 1px solid rgba(0, 243, 255, 0.4); color: #00f3ff; width: 100%; }
.btn-primary:hover { background: rgba(0, 243, 255, 0.25); box-shadow: 0 0 15px rgba(0, 243, 255, 0.3); }

.fade-in { animation: fadeIn 0.3s ease forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>