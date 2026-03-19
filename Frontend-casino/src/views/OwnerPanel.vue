<template>
  <div class="main-layout">
    <Header />
    
    <main class="content-area">
      <div class="dashboard-container">
        
        <div class="page-header">
          <button class="btn-back glass-btn" @click="voltar">←</button>
          <div class="header-titles">
            <div class="title-row">
              <h2 class="text-neon-white">👑 Sala do Diretor</h2>
              <span class="badge-owner neon-badge-red">ADMINISTRAÇÃO</span>
            </div>
            <p class="text-gray-light">Controle total do clube, financeiro e membros.</p>
          </div>
        </div>

        <div class="tabs-wrapper glass-card mb-4">
          <button :class="['tab-btn', currentTab === 'resumo' ? 'active-tab' : '']" @click="currentTab = 'resumo'">📊 Visão Geral</button>
          <button :class="['tab-btn', currentTab === 'membros' ? 'active-tab' : '']" @click="currentTab = 'membros'">👥 Membros do Clube</button>
          <button :class="['tab-btn', currentTab === 'financeiro' ? 'active-tab' : '']" @click="currentTab = 'financeiro'">💰 Caixa Central</button>
          <button :class="['tab-btn', currentTab === 'clube' ? 'active-tab' : '']" @click="currentTab = 'clube'">⚙️ Configurações</button>
        </div>

        <div v-if="isLoading" class="loading-msg text-neon-gold text-center mt-4">Carregando dados do servidor...</div>

        <div v-if="currentTab === 'resumo' && !isLoading" class="tab-content fade-in">
          <div class="dashboard-grid">
            <div class="dash-card glass-card-red card-hover-red relative overflow-hidden">
              <span class="card-label text-red-light">FICHAS NO MERCADO</span>
              <h3 class="card-value text-neon-white">R$ {{ formatCurrency(adminData.totalChipsInMarket) }}</h3>
              <p class="card-hint text-red-muted">Total circulando entre jogadores e agentes.</p>
              <div class="bg-watermark text-red-dark">🏦</div>
            </div>
            <div class="dash-card glass-card card-hover-gold relative overflow-hidden">
              <span class="card-label">LUCRO DO CLUBE (RAKE)</span>
              <h3 class="card-value text-neon-gold">R$ {{ formatCurrency(adminData.clubProfit) }}</h3>
              <p class="card-hint text-gray-light">Recolhido nas mesas.</p>
              <div class="bg-watermark">📈</div>
            </div>
            <div class="dash-card glass-card card-hover-blue relative overflow-hidden">
              <span class="card-label">MEMBROS TOTAIS</span>
              <h3 class="card-value text-neon-blue">{{ adminData.totalMembers }}</h3>
              <p class="card-hint text-gray-light">Jogadores e agentes cadastrados.</p>
              <div class="bg-watermark">👥</div>
            </div>
          </div>

          <div class="quick-actions mt-4 glass-card">
            <h4 class="section-title text-neon-white">Ações Rápidas</h4>
            <div class="actions-grid mt-3">
              <button class="action-btn glow-btn-red" @click="irParaCriarMesa">🃏 Criar Nova Mesa</button>
              <button class="action-btn glow-btn-gold" @click="currentTab = 'membros'">🔍 Gerenciar Jogadores</button>
              <button class="action-btn glow-btn-blue" @click="currentTab = 'financeiro'">💸 Emitir Novas Fichas</button>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'membros' && !isLoading" class="tab-content fade-in">
          <div class="dash-card glass-card table-card">
            <div class="table-header">
              <span class="font-bold text-neon-white text-md">Todos os Membros</span>
              <span class="badge-count neon-badge-blue">{{ membersList.length }} registrados</span>
            </div>
            
            <div class="table-responsive mt-3">
              <table class="players-table">
                <thead>
                  <tr>
                    <th class="text-left">USUÁRIO</th>
                    <th class="text-center">CARGO</th>
                    <th class="text-right">SALDO NA CARTEIRA</th>
                    <th class="text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in membersList" :key="user.id" class="table-row-hover">
                    <td class="text-left">
                      <div class="player-cell">
                        <div class="avatar-initial glow-avatar-blue">{{ user.username.charAt(0).toUpperCase() }}</div>
                        <span class="text-white font-bold">{{ user.username }}</span>
                      </div>
                    </td>
                    <td class="text-center">
                      <span :class="user.isAgent ? 'badge-owner neon-badge-gold' : 'badge-owner neon-badge-blue'">
                        {{ user.isAgent ? 'Agente VIP' : 'Jogador' }}
                      </span>
                    </td>
                    <td class="text-right text-neon-emerald font-bold">
                      R$ {{ formatCurrency(user.balance) }}
                    </td>
                    <td class="text-center action-buttons-cell">
                      <button class="btn-sm glow-btn-blue-outline" @click="enviarFichasPara(user.username)">Enviar Fichas</button>
                    </td>
                  </tr>
                  <tr v-if="membersList.length === 0">
                    <td colspan="4" class="text-center p-3 text-gray-light">Nenhum membro encontrado.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'financeiro'" class="tab-content fade-in">
          <div class="finance-grid">
            <div class="dash-card glass-card card-hover-blue">
              <h3 class="text-neon-white mb-3">Emitir Fichas (Transferência)</h3>
              <p class="text-gray-light text-xs mb-3">Envie saldo diretamente para qualquer Jogador ou Agente do clube.</p>
              
              <form @submit.prevent="confirmarTransferencia" class="admin-form">
                <div class="input-group">
                  <label>Login de Destino</label>
                  <input type="text" v-model="financeForm.username" placeholder="Ex: ze_aposta" class="glass-input" required />
                </div>
                <div class="input-group mt-2">
                  <label>Valor a Enviar (R$)</label>
                  <input type="number" v-model="financeForm.amount" min="1" step="0.01" placeholder="0.00" class="glass-input text-neon-emerald" required />
                </div>
                
                <p v-if="transferError" class="error-msg mt-2">{{ transferError }}</p>
                <p v-if="transferSuccess" class="success-msg mt-2">{{ transferSuccess }}</p>

                <button type="submit" class="btn-primary glow-btn-emerald mt-4" :disabled="isProcessing">
                  {{ isProcessing ? 'Enviando...' : 'Transferir Saldo' }}
                </button>
              </form>
            </div>

            <div class="dash-card glass-card card-hover-red">
              <h3 class="text-neon-white mb-3">Avisos do Sistema</h3>
              <ul class="activity-list">
                <li><span class="text-neon-gold">Atenção:</span> As transferências do Caixa Central não descontam do seu saldo, elas criam fichas novas no mercado.</li>
                <li><span class="text-neon-blue">Dica:</span> Para recolher fichas de um jogador, acesse o painel de edição do banco de dados temporariamente.</li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'clube'" class="tab-content fade-in">
          <div class="dash-card glass-card card-hover-gold max-w-md mx-auto">
            <h3 class="text-neon-white mb-3 text-center">Perfil do Clube</h3>
            <form class="admin-form" @submit.prevent>
              <div class="input-group">
                <label>Nome do Clube</label>
                <input type="text" value="Magic Casino Oficial" class="glass-input" readonly />
              </div>
              <div class="input-group mt-3">
                <label>Rake Padrão (%)</label>
                <input type="number" value="5" class="glass-input" readonly />
              </div>
              <p class="text-xs text-gray-light mt-3 text-center">As configurações globais estarão disponíveis em atualizações futuras.</p>
            </form>
          </div>
        </div>

      </div>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Header from '../components/Header.vue';
import BottomNav from '../components/BottomNav.vue';
import { adminService } from '../services/adminService';

const router = useRouter();

// Controle de Interface
const currentTab = ref('resumo');
const isLoading = ref(true);
const isProcessing = ref(false);
const transferError = ref('');
const transferSuccess = ref('');

// Dados da API
const adminData = ref({
  totalMembers: 0,
  totalChipsInMarket: 0,
  clubProfit: 0
});

const membersList = ref<any[]>([]);

const financeForm = reactive({
  username: '',
  amount: ''
});

// Funções Utilitárias
const formatCurrency = (val: number) => {
  return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const carregarDados = async () => {
  isLoading.value = true;
  try {
    const dashData = await adminService.getDashboard();
    if (dashData) {
      adminData.value = dashData;
    }

    const membersData = await adminService.getMembers();
    if (membersData) {
      membersList.value = membersData;
    }
  } catch (error) {
    console.error("Erro ao buscar dados do painel admin", error);
  } finally {
    isLoading.value = false;
  }
};

const confirmarTransferencia = async () => {
  transferError.value = '';
  transferSuccess.value = '';
  
  const valorNum = parseFloat(financeForm.amount);
  if (valorNum <= 0 || !financeForm.username) {
    transferError.value = "Preencha os campos corretamente.";
    return;
  }

  isProcessing.value = true;

  try {
    const result = await adminService.globalTransfer(financeForm.username, valorNum);
    transferSuccess.value = result.message || "Transferência concluída!";
    
    financeForm.username = '';
    financeForm.amount = '';

    // Atualiza os dados da tela para refletir a nova grana no mercado
    await carregarDados();

    setTimeout(() => { transferSuccess.value = ''; }, 4000);
  } catch (error: any) {
    transferError.value = error.message;
  } finally {
    isProcessing.value = false;
  }
};

const enviarFichasPara = (username: string) => {
  financeForm.username = username;
  currentTab.value = 'financeiro';
};

const voltar = () => {
  router.push('/lobby');
};

const irParaCriarMesa = () => {
  router.push('/criar-mesa'); 
};

// Ao montar a página, busca os dados da API
onMounted(() => {
  carregarDados();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;900&display=swap');

/* ========================================================
   ESTILOS NEON RED & GOLD (TEMA DO DONO)
   ======================================================== */
.text-white { color: #ffffff; }
.text-gray-light { color: #94a3b8; }
.text-red-light { color: #fca5a5; }
.text-red-muted { color: #fecaca; opacity: 0.7; }
.text-red-dark { color: #450a0a; opacity: 0.3;}
.font-bold { font-weight: 700; }
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.p-3 { padding: 12px; }
.mx-auto { margin-left: auto; margin-right: auto; }
.max-w-md { max-width: 500px; }
.relative { position: relative; }
.overflow-hidden { overflow: hidden; }

/* Efeitos de Texto Neon */
.text-neon-white { color: #fff; text-shadow: 0 0 10px rgba(255, 255, 255, 0.4); }
.text-neon-gold { color: #fbbf24; text-shadow: 0 0 12px rgba(251, 191, 36, 0.5); }
.text-neon-emerald { color: #34d399; text-shadow: 0 0 12px rgba(52, 211, 153, 0.6); }
.text-neon-blue { color: #60a5fa; text-shadow: 0 0 12px rgba(96, 165, 250, 0.5); }
.text-neon-red { color: #ef4444; text-shadow: 0 0 12px rgba(239, 68, 68, 0.6); }

/* Badges */
.neon-badge-red { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); }
.neon-badge-gold { background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); box-shadow: 0 0 10px rgba(251, 191, 36, 0.2); }
.neon-badge-blue { background: rgba(96, 165, 250, 0.15); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.4); box-shadow: 0 0 10px rgba(96, 165, 250, 0.2); }

/* Glassmorphism */
.glass-card {
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%);
  backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4); transition: all 0.3s ease;
}
.glass-card-red {
  background: linear-gradient(135deg, rgba(127, 29, 29, 0.6) 0%, rgba(69, 10, 10, 0.9) 100%);
  backdrop-filter: blur(12px); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.1); transition: all 0.3s ease;
}

/* Hovers */
.card-hover-red:hover { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.6), 0 0 20px rgba(239, 68, 68, 0.15); transform: translateY(-2px); }
.card-hover-gold:hover { border-color: rgba(251, 191, 36, 0.4); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.6), 0 0 20px rgba(251, 191, 36, 0.1); transform: translateY(-2px); }
.card-hover-blue:hover { border-color: rgba(96, 165, 250, 0.4); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.6), 0 0 20px rgba(96, 165, 250, 0.15); transform: translateY(-2px); }

/* Botões */
.glow-btn-red { background: linear-gradient(to bottom, #ef4444, #b91c1c); border: 1px solid #f87171; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4), inset 0 2px 4px rgba(255,255,255,0.2); color: white;}
.glow-btn-red:hover { filter: brightness(1.2); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.6); }

.glow-btn-red-outline { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.5); color: #fca5a5; }
.glow-btn-red-outline:hover { background: rgba(239, 68, 68, 0.2); color: white; }

.glow-btn-gold { background: linear-gradient(to bottom, #f59e0b, #b45309); border: 1px solid #fbbf24; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); color: black;}
.glow-btn-gold:hover { filter: brightness(1.2); }

.glow-btn-emerald { background: linear-gradient(to bottom, #10b981, #059669); border: 1px solid #34d399; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); color: white;}
.glow-btn-emerald:hover { filter: brightness(1.1); }

.glow-btn-blue { background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.4)); border: 1px solid rgba(96, 165, 250, 0.5); color: #93c5fd; }
.glow-btn-blue:hover { background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.6)); color: #fff; }

.glow-btn-blue-outline { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; transition: 0.3s; }
.glow-btn-blue-outline:hover { background: rgba(59, 130, 246, 0.3); color: #fff; border-color: rgba(96, 165, 250, 0.8); box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);}

/* Estrutura */
.main-layout { width: 100vw; height: 100vh; height: 100dvh; display: flex; flex-direction: column; background-color: #000; background-image: radial-gradient(circle at 50% 50%, #1a1525 0%, #0a0510 100%); color: white; font-family: 'Montserrat', sans-serif; overflow: hidden; }
.content-area { flex: 1; padding: 20px 40px; overflow-y: auto; box-sizing: border-box; padding-bottom: 90px; }
.dashboard-container { max-width: 1100px; margin: 0 auto; width: 100%; }

/* Mobile */
@media (max-width: 768px) { .content-area { padding: 15px 5px; padding-bottom: 90px; } }

/* Cabeçalho */
.page-header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding: 0 10px; }
.glass-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; font-size: 18px; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.3s; }
.header-titles { display: flex; flex-direction: column; }
.title-row { display: flex; align-items: center; gap: 10px; }
.title-row h2 { margin: 0; font-size: 22px; font-weight: 900; }
.badge-owner { padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: 0.5px; }

/* Tabs */
.tabs-wrapper { display: flex; gap: 5px; padding: 8px; border-radius: 12px; overflow-x: auto; margin: 0 10px 20px 10px;}
.tabs-wrapper::-webkit-scrollbar { display: none; }
.tab-btn { flex: 1; min-width: max-content; background: transparent; border: none; color: #94a3b8; font-weight: 800; font-size: 12px; text-transform: uppercase; padding: 10px 15px; border-radius: 8px; cursor: pointer; transition: 0.3s; }
.tab-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
.active-tab { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }

.fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

/* Cards Visão Geral */
.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; padding: 0 10px; }
.card-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800; }
.card-value { margin: 8px 0 0 0; font-size: 28px; font-weight: 900; }
.card-hint { margin: 6px 0 0 0; font-size: 11px; }
.bg-watermark { position: absolute; right: -10px; bottom: -20px; font-size: 100px; font-weight: 900; color: rgba(255,255,255,0.03); pointer-events: none; user-select: none; }

/* Ações Rápidas */
.actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
.action-btn { padding: 15px; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; cursor: pointer; transition: 0.3s; }
.action-btn:active { transform: scale(0.98); }

/* Tabelas (Membros) */
.table-card { padding: 20px 0; }
.table-header { padding: 0 20px 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
.badge-count { padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; }
.table-responsive { overflow-x: auto; width: 100%; padding: 0 10px; }
.players-table { width: 100%; border-collapse: collapse; min-width: 500px; }
.players-table th { color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 15px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.players-table td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; vertical-align: middle; }
.table-row-hover:hover td { background: rgba(255,255,255,0.03); }
.player-cell { display: flex; align-items: center; gap: 10px; }
.glow-avatar-blue { width: 28px; height: 28px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 12px; font-weight: 900; flex-shrink: 0; box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); }

.action-buttons-cell { display: flex; justify-content: center; gap: 8px; }
.btn-sm { padding: 6px 12px; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer; text-transform: uppercase; transition: 0.2s;}

/* Financeiro & Forms */
.finance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 0 10px; }
@media (max-width: 768px) { .finance-grid { grid-template-columns: 1fr; } }
.admin-form .input-group { display: flex; flex-direction: column; gap: 6px; }
.admin-form label { font-size: 10px; color: #cbd5e1; font-weight: 800; text-transform: uppercase; }
.glass-input { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 12px; border-radius: 8px; outline: none; transition: 0.3s; font-size: 14px;}
.glass-input:focus { border-color: #ef4444; }
.btn-primary { width: 100%; padding: 12px; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 13px; cursor: pointer; transition: 0.3s;}

.activity-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;}
.activity-list li { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; font-size: 12px; color: #cbd5e1; border-left: 2px solid #f59e0b;}

.error-msg { color: #ef4444; font-size: 12px; font-weight: bold; }
.success-msg { color: #34d399; font-size: 12px; font-weight: bold; }
</style>