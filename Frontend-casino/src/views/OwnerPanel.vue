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
          
          <div class="dash-card glass-card table-card mb-4">
            <div class="table-header">
              <span class="font-bold text-neon-gold text-md">Painel de Agentes VIP</span>
              <span class="badge-count neon-badge-gold">{{ agentsList.length }} registrados</span>
            </div>
            
            <div class="table-responsive mt-3">
              <table class="players-table">
                <tbody>
                  <tr v-for="user in agentsList" :key="'agent-' + user.id" class="table-row-hover">
                    <td class="text-left w-1/3">
                      <div class="player-cell">
                        <div class="avatar-image-container border-gold">
                          <img :src="getAvatarUrl(user?.avatar)" alt="Avatar" class="avatar-img" />
                        </div>
                        <span class="text-yellow font-bold">{{ user.username }}</span>
                      </div>
                    </td>
                    <td class="text-right text-neon-gold font-bold w-1/3">
                      R$ {{ formatCurrency(user.agentBalance) }}
                    </td>
                    <td class="text-right action-buttons-cell w-1/3">
                      <button class="btn-action-manage" @click="abrirModalTransferencia(user, 'agent')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-transfer"><path d="m11 16-4 4-4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
                        <span class="btn-text hidden-mobile">Gerenciar Fichas</span>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="agentsList.length === 0">
                    <td colspan="3" class="text-center p-3 text-gray-light">Nenhum agente VIP encontrado.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="dash-card glass-card table-card">
            <div class="table-header">
              <span class="font-bold text-neon-white text-md">Painel de Jogadores</span>
              <span class="badge-count neon-badge-blue">{{ allPlayersList.length }} registrados</span>
            </div>
            
            <div class="table-responsive mt-3">
              <table class="players-table">
                <tbody>
                  <tr v-for="user in allPlayersList" :key="'player-' + user.id" class="table-row-hover">
                    <td class="text-left w-1/3">
                      <div class="player-cell">
                        <div class="avatar-image-container">
                          <img :src="getAvatarUrl(user?.avatar)" alt="Avatar" class="avatar-img" />
                        </div>
                        <span class="text-white font-bold">{{ user.username }}</span>
                      </div>
                    </td>
                    <td class="text-right text-neon-emerald font-bold w-1/3">
                      R$ {{ formatCurrency(user.balance) }}
                    </td>
                    <td class="text-right action-buttons-cell w-1/3">
                      <button class="btn-action-manage" @click="abrirModalTransferencia(user, 'player')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-transfer"><path d="m11 16-4 4-4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
                        <span class="btn-text hidden-mobile">Gerenciar Fichas</span>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="allPlayersList.length === 0">
                    <td colspan="3" class="text-center p-3 text-gray-light">Nenhum jogador encontrado.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <div v-if="currentTab === 'financeiro'" class="tab-content fade-in">
          <div class="finance-grid">
            <div class="dash-card glass-card card-hover-blue">
              <h3 class="text-neon-white mb-3">Emitir Fichas Manualmente</h3>
              <p class="text-gray-light text-xs mb-3">Envie saldo diretamente para qualquer Jogador ou Agente do clube.</p>
              
              <form @submit.prevent="confirmarTransferenciaAba" class="admin-form">
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
                <li><span class="text-neon-blue">Dica:</span> Para gerenciar rapidamente o saldo de alguém, use o botão "Gerenciar Fichas" na aba de Membros do Clube.</li>
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

    <div class="modal-overlay" v-if="showTransferModal" @click.self="fecharModalTransferencia">
      <div class="modal-box">
        
        <div v-if="transactionSuccess" class="success-screen">
          <div class="success-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="success-check"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h3 class="text-green-bright mt-3">Operação Concluída!</h3>
          <p class="success-details text-gray-light">
            <span v-if="transactionType === 'send'">O caixa emitiu <strong>R$ {{ formatCurrency(Number(transferAmount)) }}</strong> para a carteira de {{ targetWallet === 'agent' ? 'AGENTE' : 'JOGADOR' }}</span>
            <span v-else>Você recolheu <strong>R$ {{ formatCurrency(Number(transferAmount)) }}</strong> da carteira de {{ targetWallet === 'agent' ? 'AGENTE' : 'JOGADOR' }}</span>
            de <strong>{{ selectedPlayerObj?.username }}</strong>.
          </p>
          <button class="btn-primary glow-btn-blue mt-4 w-full" @click="fecharModalTransferencia">Concluir</button>
        </div>

        <div v-else>
          <div class="modal-top-bar">
            <h3>Saldo de {{ targetWallet === 'agent' ? 'Agente VIP' : 'Jogador' }}</h3>
            <button class="close-btn" @click="fecharModalTransferencia">✕</button>
          </div>
          
          <div class="player-modal-header">
            <div class="avatar-large-image-container">
              <img :src="getAvatarUrl(selectedPlayerObj?.avatar)" alt="Avatar" class="avatar-img-large" />
            </div>
            <div class="player-modal-info">
              <h4 class="text-white">{{ selectedPlayerObj?.username }}</h4>
              <span class="player-modal-balance">
                Saldo na carteira: <strong :class="targetWallet === 'agent' ? 'text-neon-gold' : 'text-neon-emerald'">R$ {{ formatCurrency(targetWallet === 'agent' ? (selectedPlayerObj?.agentBalance || 0) : (selectedPlayerObj?.balance || 0)) }}</strong>
              </span>
            </div>
          </div>

          <div class="action-toggle">
            <button class="toggle-btn" :class="{ 'active-send': transactionType === 'send' }" @click="transactionType = 'send'">↑ Emitir Fichas</button>
            <button class="toggle-btn" :class="{ 'active-withdraw': transactionType === 'withdraw' }" @click="transactionType = 'withdraw'">↓ Recolher Fichas</button>
          </div>
          
          <form @submit.prevent="confirmarTransferenciaModal" class="modal-form">
            <div class="input-group">
              <div class="input-header-flex">
                <label>Valor (R$)</label>
                <span v-if="transactionType === 'send'" class="modal-desc text-right text-neon-gold font-bold">Caixa Central: ∞</span>
                <span v-else class="modal-desc text-right text-red-400">Limite: R$ {{ formatCurrency(targetWallet === 'agent' ? (selectedPlayerObj?.agentBalance || 0) : (selectedPlayerObj?.balance || 0)) }}</span>
              </div>
              <input type="number" v-model="transferAmount" min="1" step="0.01" :placeholder="transactionType === 'send' ? 'Valor para emitir...' : 'Valor para recolher...'" required />
            </div>
            
            <p v-if="modalError" class="error-msg">{{ modalError }}</p>

            <div class="modal-actions">
              <button type="submit" class="btn-confirm-action" :class="transactionType === 'send' ? 'bg-send' : 'bg-withdraw'" :disabled="isProcessing">
                <span v-if="isProcessing">Processando...</span>
                <span v-else>Confirmar {{ transactionType === 'send' ? 'Envio' : 'Recolhimento' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Header from '../components/Header.vue';
import BottomNav from '../components/BottomNav.vue';
import { adminService } from '../services/adminService';

const router = useRouter();
const currentTab = ref('membros'); 
const isLoading = ref(true);
const isProcessing = ref(false);

const showTransferModal = ref(false);
const selectedPlayerObj = ref<any>(null);
const targetWallet = ref<'player' | 'agent'>('player'); 
const transferAmount = ref('');
const modalError = ref('');
const transactionType = ref<'send' | 'withdraw'>('send');
const transactionSuccess = ref(false);

const adminData = ref({ totalMembers: 0, totalChipsInMarket: 0, clubProfit: 0 });
const membersList = ref<any[]>([]);

const agentsList = computed(() => {
  return membersList.value.filter(u => u.isAgent).sort((a, b) => a.username.localeCompare(b.username));
});

const allPlayersList = computed(() => {
  return membersList.value.sort((a, b) => a.username.localeCompare(b.username));
});

const formatCurrency = (val: number) => Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const avatarImages: Record<string, string> = import.meta.glob('../assets/imagens/avatars/**/*.webp', { eager: true, import: 'default' });
const getAvatarUrl = (filename?: string) => {
  const path = `../assets/imagens/avatars/${filename || 'default.webp'}`;
  return avatarImages[path] || avatarImages['../assets/imagens/avatars/default.webp'];
};

const carregarDados = async () => {
  isLoading.value = true;
  try {
    const dashData = await adminService.getDashboard();
    if (dashData) adminData.value = dashData;

    const membersData = await adminService.getMembers();
    if (membersData) membersList.value = membersData;
  } catch (error) {
    console.error("Erro ao buscar dados do painel admin", error);
  } finally {
    isLoading.value = false;
  }
};

const financeForm = reactive({
  username: '',
  amount: ''
});

const confirmarTransferenciaAba = async () => {
  modalError.value = '';
  transferError.value = '';
  transferSuccess.value = '';
  
  const valorNum = parseFloat(financeForm.amount);
  if (valorNum <= 0 || !financeForm.username) {
    transferError.value = "Preencha os campos corretamente.";
    return;
  }

  isProcessing.value = true;

  try {
    const result = await adminService.globalTransfer(financeForm.username, valorNum, 'player');
    transferSuccess.value = result.message || "Transferência concluída!";
    financeForm.username = '';
    financeForm.amount = '';
    await carregarDados();
    setTimeout(() => { transferSuccess.value = ''; }, 4000);
  } catch (error: any) {
    transferError.value = error.message;
  } finally {
    isProcessing.value = false;
  }
};

const abrirModalTransferencia = (user: any, walletType: 'player' | 'agent') => {
  selectedPlayerObj.value = user;
  targetWallet.value = walletType; 
  transferAmount.value = '';
  modalError.value = '';
  transactionType.value = 'send';
  transactionSuccess.value = false;
  showTransferModal.value = true;
};

const fecharModalTransferencia = () => {
  showTransferModal.value = false;
  setTimeout(() => { transactionSuccess.value = false; }, 300);
};

const confirmarTransferenciaModal = async () => {
  const valorNum = parseFloat(transferAmount.value);
  if (valorNum <= 0) { modalError.value = "Valor inválido."; return; }

  isProcessing.value = true;
  modalError.value = '';
  const pName = selectedPlayerObj.value.username;

  try {
    if (transactionType.value === 'send') {
      await adminService.globalTransfer(pName, valorNum, targetWallet.value);
      
      if (targetWallet.value === 'agent') selectedPlayerObj.value.agentBalance += valorNum;
      else selectedPlayerObj.value.balance += valorNum;
      
      adminData.value.totalChipsInMarket += valorNum;
      transactionSuccess.value = true;
      
    } else {
      const saldoAtual = targetWallet.value === 'agent' ? selectedPlayerObj.value.agentBalance : selectedPlayerObj.value.balance;
      
      if (valorNum > saldoAtual) {
        modalError.value = "Saldo insuficiente nesta carteira para o recolhimento.";
        isProcessing.value = false;
        return;
      }
      
      await adminService.globalWithdraw(pName, valorNum, targetWallet.value);

      if (targetWallet.value === 'agent') selectedPlayerObj.value.agentBalance -= valorNum;
      else selectedPlayerObj.value.balance -= valorNum;

      adminData.value.totalChipsInMarket -= valorNum;
      transactionSuccess.value = true;
    }
  } catch (error: any) {
    modalError.value = error.message;
  } finally {
    isProcessing.value = false;
  }
};

const voltar = () => router.push('/lobby');
const irParaCriarMesa = () => router.push('/criar-mesa');

onMounted(() => {
  carregarDados();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;900&display=swap');

.text-white { color: #ffffff; }
.text-gray-light { color: #94a3b8; }
.text-red-light { color: #fca5a5; }
.text-red-muted { color: #fecaca; opacity: 0.7; }
.text-red-dark { color: #450a0a; opacity: 0.3;}
.text-yellow { color: #fbbf24; }
.font-bold { font-weight: 700; }
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }
.w-1\/3 { width: 33.333333%; }
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
.w-full { width: 100%; }

.text-neon-white { color: #fff; text-shadow: 0 0 10px rgba(255, 255, 255, 0.4); }
.text-neon-gold { color: #fbbf24; text-shadow: 0 0 12px rgba(251, 191, 36, 0.5); }
.text-neon-emerald { color: #34d399; text-shadow: 0 0 12px rgba(52, 211, 153, 0.6); }
.text-neon-blue { color: #60a5fa; text-shadow: 0 0 12px rgba(96, 165, 250, 0.5); }
.text-neon-red { color: #ef4444; text-shadow: 0 0 12px rgba(239, 68, 68, 0.6); }

.neon-badge-red { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); }
.neon-badge-gold { background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); box-shadow: 0 0 10px rgba(251, 191, 36, 0.2); }
.neon-badge-blue { background: rgba(96, 165, 250, 0.15); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.4); box-shadow: 0 0 10px rgba(96, 165, 250, 0.2); }

.glass-card { background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4); transition: all 0.3s ease; }
.glass-card-red { background: linear-gradient(135deg, rgba(127, 29, 29, 0.6) 0%, rgba(69, 10, 10, 0.9) 100%); backdrop-filter: blur(12px); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.1); transition: all 0.3s ease; }

.card-hover-red:hover { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.6), 0 0 20px rgba(239, 68, 68, 0.15); transform: translateY(-2px); }
.card-hover-gold:hover { border-color: rgba(251, 191, 36, 0.4); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.6), 0 0 20px rgba(251, 191, 36, 0.1); transform: translateY(-2px); }
.card-hover-blue:hover { border-color: rgba(96, 165, 250, 0.4); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.6), 0 0 20px rgba(96, 165, 250, 0.15); transform: translateY(-2px); }

.glow-btn-red { background: linear-gradient(to bottom, #ef4444, #b91c1c); border: 1px solid #f87171; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4), inset 0 2px 4px rgba(255,255,255,0.2); color: white;}
.glow-btn-red:hover { filter: brightness(1.2); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.6); }
.glow-btn-gold { background: linear-gradient(to bottom, #f59e0b, #b45309); border: 1px solid #fbbf24; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); color: black;}
.glow-btn-gold:hover { filter: brightness(1.2); }
.glow-btn-emerald { background: linear-gradient(to bottom, #10b981, #059669); border: 1px solid #34d399; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); color: white;}
.glow-btn-emerald:hover { filter: brightness(1.1); }
.glow-btn-blue { background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.4)); border: 1px solid rgba(96, 165, 250, 0.5); color: #93c5fd; cursor: pointer; transition: 0.3s; }
.glow-btn-blue:hover { background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.6)); color: #fff; }

.main-layout { width: 100vw; height: 100vh; height: 100dvh; display: flex; flex-direction: column; background-color: #000; background-image: radial-gradient(circle at 50% 50%, #1a1525 0%, #0a0510 100%); color: white; font-family: 'Montserrat', sans-serif; overflow: hidden; }
.content-area { flex: 1; padding: 20px 40px; overflow-y: auto; box-sizing: border-box; padding-bottom: 90px; }
.dashboard-container { max-width: 1100px; margin: 0 auto; width: 100%; }

@media (max-width: 768px) { .content-area { padding: 15px 5px; padding-bottom: 90px; } }

.page-header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding: 0 10px; }
.glass-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; font-size: 18px; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.3s; }
.header-titles { display: flex; flex-direction: column; }
.title-row { display: flex; align-items: center; gap: 10px; }
.title-row h2 { margin: 0; font-size: 22px; font-weight: 900; }
.badge-owner { padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: 0.5px; }

.tabs-wrapper { display: flex; gap: 5px; padding: 8px; border-radius: 12px; overflow-x: auto; margin: 0 10px 20px 10px;}
.tabs-wrapper::-webkit-scrollbar { display: none; }
.tab-btn { flex: 1; min-width: max-content; background: transparent; border: none; color: #94a3b8; font-weight: 800; font-size: 12px; text-transform: uppercase; padding: 10px 15px; border-radius: 8px; cursor: pointer; transition: 0.3s; }
.tab-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
.active-tab { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }

.fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; padding: 0 10px; }
.card-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800; }
.card-value { margin: 8px 0 0 0; font-size: 28px; font-weight: 900; }
.card-hint { margin: 6px 0 0 0; font-size: 11px; }
.bg-watermark { position: absolute; right: -10px; bottom: -20px; font-size: 100px; font-weight: 900; color: rgba(255,255,255,0.03); pointer-events: none; user-select: none; }

.actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
.action-btn { padding: 15px; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; cursor: pointer; transition: 0.3s; }
.action-btn:active { transform: scale(0.98); }

.table-card { padding: 20px 0; }
.table-header { padding: 0 20px 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
.badge-count { padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; }
.table-responsive { overflow-x: auto; width: 100%; padding: 0 10px; }
.players-table { width: 100%; border-collapse: collapse; min-width: 400px; }
.players-table td { padding: 16px 10px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; vertical-align: middle; }
.table-row-hover:hover td { background: rgba(255,255,255,0.03); }
.player-cell { display: flex; align-items: center; gap: 12px; }

.avatar-image-container { width: 36px; height: 36px; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

.action-buttons-cell { display: flex; justify-content: flex-end; gap: 8px; padding-right: 15px !important; }

.btn-action-manage {
  background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa;
  padding: 8px 14px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s; text-transform: uppercase;
}
.btn-action-manage:hover { background: rgba(59, 130, 246, 0.2); }
.icon-transfer { width: 16px; height: 16px; flex-shrink: 0; min-width: 16px; min-height: 16px; }

.finance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 0 10px; }
.admin-form .input-group { display: flex; flex-direction: column; gap: 6px; }
.admin-form label { font-size: 10px; color: #cbd5e1; font-weight: 800; text-transform: uppercase; }
.glass-input { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 12px; border-radius: 8px; outline: none; transition: 0.3s; font-size: 14px;}
.glass-input:focus { border-color: #ef4444; }
.btn-primary { width: 100%; padding: 12px; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 13px; cursor: pointer; transition: 0.3s;}

.activity-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;}
.activity-list li { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; font-size: 12px; color: #cbd5e1; border-left: 2px solid #f59e0b;}

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; box-sizing: border-box; backdrop-filter: blur(5px); }
.modal-box { background: linear-gradient(to bottom, #1f2937, #111827); border: 1px solid #374151; border-radius: 16px; padding: 0; width: 100%; max-width: 380px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); overflow: hidden; animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

@keyframes modalScaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.modal-top-bar { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.05); }
.modal-top-bar h3 { margin: 0; font-size: 14px; text-transform: uppercase; color: #d1d5db; letter-spacing: 1px;}
.close-btn { background: none; border: none; color: #9ca3af; font-size: 20px; cursor: pointer; line-height: 1; transition: 0.2s; padding: 0;}
.close-btn:hover { color: white; transform: scale(1.1); }

.player-modal-header { display: flex; align-items: center; gap: 15px; padding: 25px 20px; }
.avatar-large-image-container { width: 50px; height: 50px; border-radius: 50%; display: flex; justify-content: center; align-items: center; }
.avatar-img-large { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

.player-modal-info { display: flex; flex-direction: column; }
.player-modal-info h4 { margin: 0; font-size: 20px; font-weight: 900; }
.player-modal-balance { color: #9ca3af; font-size: 13px; margin-top: 4px; }
.player-modal-balance strong { color: #60a5fa; }

.action-toggle { display: flex; padding: 0 20px; gap: 10px; margin-bottom: 20px; }
.toggle-btn { flex: 1; padding: 10px; border-radius: 8px; font-weight: 700; font-size: 12px; text-transform: uppercase; background: #1f2937; border: 1px solid #374151; color: #9ca3af; cursor: pointer; transition: all 0.2s; }
.toggle-btn.active-send { background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #10b981; }
.toggle-btn.active-withdraw { background: rgba(239, 68, 68, 0.15); border-color: #ef4444; color: #ef4444; }

.modal-form { padding: 0 20px 25px 20px; }
.modal-form .input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; text-align: left;}
.input-header-flex { display: flex; justify-content: space-between; align-items: flex-end; }
.modal-form label { color: #d1d5db; font-size: 11px; font-weight: bold; text-transform: uppercase;}
.modal-desc { color: #9ca3af; font-size: 11px; margin: 0;}
.modal-form input { background: #0b0f19; border: 1px solid #374151; color: white; padding: 15px; border-radius: 8px; font-size: 20px; text-align: center; outline: none; font-weight: 900; }
.modal-form input:focus { border-color: #f59e0b; }

.modal-actions { display: flex; gap: 10px; }
.btn-confirm-action { flex: 1; border: none; color: white; padding: 14px; border-radius: 8px; font-weight: 900; font-size: 14px; text-transform: uppercase; cursor: pointer; transition: 0.2s;}
.bg-send { background: linear-gradient(to bottom, #10b981, #047857); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }
.bg-withdraw { background: linear-gradient(to bottom, #ef4444, #b91c1c); box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); }
.btn-confirm-action:disabled { background: #374151; color: #9ca3af; cursor: not-allowed; box-shadow: none;}

.error-msg { color: #ef4444; font-size: 12px; font-weight: bold; margin-bottom: 15px; text-align: center;}
.success-screen { padding: 40px 20px; text-align: center; }
.success-icon-wrapper { width: 80px; height: 80px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); display: flex; justify-content: center; align-items: center; margin: 0 auto; border: 2px solid #10b981; }
.success-check { width: 40px; height: 40px; color: #10b981; }
.success-details { color: #d1d5db; font-size: 14px; line-height: 1.5; margin-top: 15px; }

@media (max-width: 480px) {
  .hidden-mobile { display: none !important; }
  .btn-action-manage { width: 34px; height: 34px; padding: 0; border-radius: 8px; }
  .players-table td { padding: 12px 6px; }
  .avatar-image-container { width: 28px; height: 28px; }
}
</style>