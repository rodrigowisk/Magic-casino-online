<template>
  <div class="main-layout">
    <Header />
    
    <main class="content-area">
      
      <div v-if="!isLoading && !isAgent" class="become-agent-wrapper">
        <div class="become-agent-box">
          <div class="icon-wrapper-large">🚀</div>
          <h2>Torne-se um Afiliado</h2>
          <p>Crie seu código exclusivo e comece a ganhar comissões sobre as indicações.</p>
          
          <form @submit.prevent="criarContaAgente" class="agent-form">
            <div class="input-group">
              <label>Escolha seu Código de Convite</label>
              <input 
                type="text" 
                v-model="newReferralCode" 
                @input="newReferralCode = newReferralCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()"
                placeholder="Ex: BRUXO777" 
                required 
                maxlength="20"
              />
            </div>
            <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
            <button type="submit" class="btn-primary" :disabled="isProcessing">
              {{ isProcessing ? 'CRIANDO...' : 'CRIAR MEU CÓDIGO' }}
            </button>
          </form>
        </div>
      </div>

      <div v-else-if="!isLoading && isAgent" class="dashboard-container">
        
        <div class="page-header">
          <button class="btn-back" @click="voltar">←</button>
          <div class="header-titles">
            <div class="title-row">
              <h2>🚀 Área do Agente</h2>
              <span class="badge-afiliado">AGENTE VIP</span>
            </div>
            <p>Gerencie suas indicações e acompanhe seus ganhos.</p>
          </div>
        </div>

        <div class="dashboard-grid">
          
          <div class="left-column">
            
            <div class="dash-card">
              <span class="card-label">SALDO DO AGENTE</span>
              <h3 class="card-value text-neon">R$ {{ formatCurrency(agentData.agentBalance) }}</h3>
              <p class="card-hint">Saldo que você pode enviar aos jogadores.</p>
            </div>

            <div class="dash-card">
              <div class="card-header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sm"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <span>Minhas Configurações</span>
              </div>
              <div class="config-row mt-3">
                <div>
                  <span class="card-label">Comissão (%)</span>
                  <h4 class="text-yellow">{{ agentData.commissionRate }}%</h4>
                </div>
              </div>
              <div class="config-row mt-2">
                <div>
                  <span class="card-label">Ciclo de Pagamento</span>
                  <h4 class="text-white font-normal">Manual</h4>
                </div>
              </div>
            </div>

            <div class="dash-card">
              <div class="card-header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sm"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                <span>Seu Link de Indicação</span>
              </div>
              <div class="link-box mt-3">
                <input type="text" readonly :value="referralLink" class="link-input" />
                <button class="btn-icon text-green-light" @click="copiarLink" title="Compartilhar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sm"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
                <button class="btn-icon text-white" @click="copiarLink" title="Copiar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sm"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>

            <div class="dash-card bg-green-dark relative overflow-hidden">
              <span class="card-label">COMISSÃO DISPONÍVEL</span>
              <h3 class="card-value text-white">R$ 0,00</h3>
              <p class="card-hint">O pagamento é processado pelo administrador.</p>
              <div class="bg-watermark">$</div>
            </div>

          </div>

          <div class="right-column">
            <div class="dash-card table-card h-full">
              
              <div class="table-header">
                <div class="header-links">
                  <a href="#" @click.prevent="activeTab = 'players'" class="nav-link" :class="activeTab === 'players' ? 'active' : 'text-gray'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sm" :class="activeTab === 'players' ? 'text-yellow' : ''"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span class="font-bold text-md">Lista de Jogadores</span>
                  </a>
                  
                  <a href="#" @click.prevent="activeTab = 'history'" class="nav-link" :class="activeTab === 'history' ? 'active' : 'text-gray'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sm" :class="activeTab === 'history' ? 'text-yellow' : ''"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span class="font-bold text-md hidden-mobile">Histórico de Transações</span>
                    <span class="font-bold text-md visible-mobile">Histórico</span>
                  </a>
                </div>
                
                <span class="badge-count" v-if="activeTab === 'players'">{{ playersList.length }} indicados</span>
                <span class="badge-count" v-else>{{ transactionsList.length }} registros</span>
              </div>

              <div class="table-responsive">
                
                <div v-if="activeTab === 'players'">
                  <table class="players-table" v-if="playersList.length > 0">
                    <thead>
                      <tr>
                        <th class="text-left">JOGADOR</th>
                        <th class="text-right">SALDO</th>
                        <th class="text-center">AÇÃO</th>
                        <th class="text-right">COMISSÃO</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(player, index) in playersList" :key="index">
                        <td class="text-left">
                          <div class="player-cell">
                            <div class="avatar-image-container">
                              <img :src="getAvatarUrl(player?.avatar)" alt="Avatar" class="avatar-img" />
                            </div>
                            <span 
                              class="player-name font-bold"
                              :class="(player.username === currentUserName || player.name === currentUserName) && currentUserName !== '' ? 'text-yellow' : 'text-white'"
                            >
                              {{ player.username || player.name }}
                            </span>
                          </div>
                        </td>
                        <td class="text-right text-neon">{{ formatCurrency(player.balance || 0) }}</td>
                        <td class="text-center">
                          <button class="btn-action-enviar" @click="abrirModalTransferencia(player)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-sm"><path d="m11 16-4 4-4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
                            <span class="btn-text">Transferir</span>
                          </button>
                        </td>
                        <td class="text-right text-green-bright">+{{ formatCurrency(player.commission || 0) }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="empty-players">
                    <p>Você ainda não possui jogadores indicados. Compartilhe seu link!</p>
                  </div>
                </div>

                <div v-else-if="activeTab === 'history'">
                  <table class="players-table" v-if="transactionsList.length > 0">
                    <thead>
                      <tr>
                        <th class="text-left">DATA/HORA</th>
                        <th class="text-left">AÇÃO/JOGADOR</th>
                        <th class="text-right">VALOR</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="tx in transactionsList" :key="tx.id">
                        <td class="text-left text-gray">{{ formatarDataLocal(tx.date) }}</td>
                        <td class="text-left text-white font-bold">
                          <div class="player-cell">
                            <svg v-if="tx.amount < 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="icon-sm text-neon"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="icon-sm text-red-400"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                            <span>{{ tx.description }}</span>
                          </div>
                        </td>
                        <td class="text-right font-bold" :class="tx.amount < 0 ? 'text-neon' : 'text-red-400'">
                          R$ {{ formatCurrency(Math.abs(tx.amount)) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="empty-players">
                    <p>Nenhuma transação foi encontrada no seu histórico.</p>
                  </div>
                </div>

              </div>

            </div>
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
          <h3 class="text-green-bright mt-3">Transferência Concluída!</h3>
          <p class="success-details">
            <span v-if="transactionType === 'send'">Você enviou <strong>R$ {{ formatCurrency(Number(transferAmount)) }}</strong> para o jogador</span>
            <span v-else>Você retirou <strong>R$ {{ formatCurrency(Number(transferAmount)) }}</strong> do jogador</span>
            <strong>{{ selectedPlayerObj?.username || selectedPlayerObj?.name }}</strong>.
          </p>
          <button class="btn-primary w-full mt-3" @click="fecharModalTransferencia">Concluir</button>
        </div>

        <div v-else>
          <div class="modal-top-bar">
            <h3>Gerenciar Saldo</h3>
            <button class="close-btn" @click="fecharModalTransferencia">✕</button>
          </div>
          
          <div class="player-modal-header">
            <div class="avatar-large-image-container">
              <img :src="getAvatarUrl(selectedPlayerObj?.avatar)" alt="Avatar" class="avatar-img-large" />
            </div>
            <div class="player-modal-info">
              <h4 class="text-white">{{ selectedPlayerObj?.username || selectedPlayerObj?.name }}</h4>
              <span class="player-modal-balance">Saldo atual: <strong>R$ {{ formatCurrency(selectedPlayerObj?.balance || 0) }}</strong></span>
            </div>
          </div>

          <div class="action-toggle">
            <button 
              class="toggle-btn" 
              :class="{ 'active-send': transactionType === 'send' }"
              @click="transactionType = 'send'"
            >
              ↑ Enviar
            </button>
            <button 
              class="toggle-btn" 
              :class="{ 'active-withdraw': transactionType === 'withdraw' }"
              @click="transactionType = 'withdraw'"
            >
              ↓ Retirar
            </button>
          </div>
          
          <form @submit.prevent="confirmarTransferencia" class="modal-form">
            <div class="input-group">
              <div class="input-header-flex">
                <label>Valor (R$)</label>
                <span v-if="transactionType === 'send'" class="modal-desc text-right">Seu saldo: R$ {{ formatCurrency(agentData.agentBalance) }}</span>
                <span v-else class="modal-desc text-right text-red-400">Limite: R$ {{ formatCurrency(selectedPlayerObj?.balance || 0) }}</span>
              </div>
              <input 
                type="number" 
                v-model="transferAmount" 
                min="1" 
                step="0.01" 
                :placeholder="transactionType === 'send' ? 'Valor para enviar...' : 'Valor para retirar...'" 
                required 
              />
            </div>
            
            <p v-if="modalError" class="error-msg">{{ modalError }}</p>

            <div class="modal-actions">
              <button 
                type="submit" 
                class="btn-confirm-action" 
                :class="transactionType === 'send' ? 'bg-send' : 'bg-withdraw'"
                :disabled="isProcessing"
              >
                <span v-if="isProcessing">Processando...</span>
                <span v-else>Confirmar {{ transactionType === 'send' ? 'Envio' : 'Retirada' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Header from '../components/Header.vue';
import BottomNav from '../components/BottomNav.vue';
import { agentService } from '../services/agentService';

const router = useRouter();

// ==============================================================
// DADOS DO USUÁRIO LOGADO (Para identificar o próprio agente)
// ==============================================================
const currentUserId = String(localStorage.getItem('magic_userid') || '').trim();
const currentUserName = String(localStorage.getItem('magic_username') || '').trim();
const currentAvatar = String(localStorage.getItem('magic_avatar') || 'default.webp').trim();

const isLoading = ref(true);
const isProcessing = ref(false);
const isAgent = ref(false);
const errorMessage = ref('');

const newReferralCode = ref('');

const agentData = ref({
  referralCode: '',
  agentBalance: 0,
  commissionRate: 0,
  totalReferrals: 0
});

const playersList = ref<any[]>([]);

// Controle de Abas
const activeTab = ref<'players' | 'history'>('players');
const transactionsList = ref<any[]>([]); 

const showTransferModal = ref(false);
const selectedPlayerObj = ref<any>(null);
const transferAmount = ref('');
const modalError = ref('');
const transactionType = ref<'send' | 'withdraw'>('send');
const transactionSuccess = ref(false);

const referralLink = computed(() => {
  const domain = window.location.origin;
  return `${domain}/cadastro?ref=${agentData.value.referralCode}`;
});

const formatCurrency = (val: number) => {
  return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatarDataLocal = (dataString: string) => {
  if (!dataString) return '';
  const date = new Date(dataString);
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const avatarImages: Record<string, string> = import.meta.glob('../assets/imagens/avatars/**/*.webp', { eager: true, import: 'default' });

const getAvatarUrl = (filename?: string) => {
  const safeFilename = filename || localStorage.getItem('magic_avatar') || 'default.webp';
  const path = `../assets/imagens/avatars/${safeFilename}`;
  return avatarImages[path] || avatarImages['../assets/imagens/avatars/default.webp'];
};

// 👇 Busca o saldo real da conta de jogador do Agente na Identity API
const fetchMyPlayerBalance = async () => {
  if (!currentUserId) return 0;
  try {
    const IDENTITY_API_URL = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';
    const response = await fetch(`${IDENTITY_API_URL}/api/wallet/${currentUserId}/balance`);
    if (response.ok) {
      const data = await response.json();
      return data.balance || 0;
    }
  } catch(e) {
    console.error("Erro ao buscar saldo de jogador do agente:", e);
  }
  return 0;
};

const carregarPainel = async () => {
  isLoading.value = true;
  try {
    const data = await agentService.getDashboard();
    if (data) {
      agentData.value = data;
      isAgent.value = true;

      let pList = data.players || data.Players || [];

      // 👇 Identifica se o agente já veio na lista do backend
      const myIndex = pList.findIndex((p: any) => p.username === currentUserName || p.name === currentUserName);
      
      // Busca o saldo atualizado da conta de jogador do agente
      const myBalance = await fetchMyPlayerBalance();

      if (myIndex !== -1) {
          // Se achou, atualiza o saldo e move ele pro topo da lista
          const me = pList.splice(myIndex, 1)[0];
          me.balance = myBalance;
          pList.unshift(me);
      } else if (currentUserName !== '') {
          // Se não veio na lista, injeta a própria conta no topo manualmente
          pList.unshift({
              username: currentUserName,
              name: currentUserName,
              avatar: currentAvatar,
              balance: myBalance,
              commission: 0
          });
      }

      playersList.value = pList;

      if (data.history || data.History) {
        transactionsList.value = data.history || data.History;
      } else {
        transactionsList.value = [];
      }

    } else {
      isAgent.value = false;
    }
  } catch (error: any) {
    console.error("Erro ao carregar painel", error);
  } finally {
    isLoading.value = false;
  }
};

const criarContaAgente = async () => {
  if (!newReferralCode.value) return;
  isProcessing.value = true;
  errorMessage.value = '';

  try {
    await agentService.becomeAgent(newReferralCode.value);
    await carregarPainel();
  } catch (error: any) {
    errorMessage.value = error.message;
  } finally {
    isProcessing.value = false;
  }
};

const copiarLink = async () => {
  try {
    await navigator.clipboard.writeText(referralLink.value);
    alert('Link copiado com sucesso!');
  } catch (err) {
    console.error('Falha ao copiar:', err);
  }
};

const abrirModalTransferencia = (player: any) => {
  selectedPlayerObj.value = player;
  transferAmount.value = '';
  modalError.value = '';
  transactionType.value = 'send';
  transactionSuccess.value = false;
  showTransferModal.value = true;
};

const fecharModalTransferencia = () => {
  showTransferModal.value = false;
  setTimeout(() => {
    transactionSuccess.value = false;
  }, 300);
};

const confirmarTransferencia = async () => {
  const valorNum = parseFloat(transferAmount.value);
  if (valorNum <= 0) {
    modalError.value = "Valor inválido.";
    return;
  }

  isProcessing.value = true;
  modalError.value = '';
  
  const pName = selectedPlayerObj.value.username || selectedPlayerObj.value.name;
  const dataAtual = new Date().toISOString();

  try {
    if (transactionType.value === 'send') {
      if (valorNum > agentData.value.agentBalance) {
        modalError.value = "Saldo insuficiente para envio.";
        isProcessing.value = false;
        return;
      }

      const result = await agentService.sellCredit(pName, valorNum);
      agentData.value.agentBalance = result.newAgentBalance; 
      
      const playerIndex = playersList.value.findIndex(p => p.username === pName || p.name === pName);
      if(playerIndex !== -1) {
         playersList.value[playerIndex].balance += valorNum;
      }

      // Adiciona ao histórico (Envio)
      transactionsList.value.unshift({
        id: Date.now(),
        date: dataAtual,
        description: pName,
        amount: -valorNum 
      });

      transactionSuccess.value = true;

    } else {
      if (valorNum > selectedPlayerObj.value.balance) {
        modalError.value = "O jogador não possui saldo suficiente para esta retirada.";
        isProcessing.value = false;
        return;
      }

      const result = await (agentService as any).withdrawCredit(pName, valorNum);
      agentData.value.agentBalance = result.newAgentBalance;

      const playerIndex = playersList.value.findIndex(p => p.username === pName || p.name === pName);
      if(playerIndex !== -1) {
         playersList.value[playerIndex].balance -= valorNum;
      }

      // Adiciona ao histórico (Retirada)
      transactionsList.value.unshift({
        id: Date.now(),
        date: dataAtual,
        description: pName,
        amount: valorNum 
      });

      transactionSuccess.value = true;
    }

  } catch (error: any) {
    modalError.value = error.message;
  } finally {
    isProcessing.value = false;
  }
};

const voltar = () => {
  router.push('/lobby');
};

onMounted(() => {
  carregarPainel();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;900&display=swap');

/* CORES GERAIS DA TELA */
.text-white { color: #ffffff; }
.text-gray { color: #9ca3af; }
.text-yellow { color: #f59e0b; }
.text-green-bright { color: #10b981; font-weight: 700; }
.text-green-light { color: #34d399; }
.text-blue-light { color: #60a5fa; }
.text-red-400 { color: #f87171; }
.bg-green-dark { background: linear-gradient(135deg, #064e3b 0%, #022c22 100%) !important; border-color: #047857 !important; }

/* 🔥 CLASSE VERDE NEON 🔥 */
.text-neon {
  color: #39FF14;
  font-weight: 900;
}

/* 🔥 BADGE DO PRÓPRIO AGENTE 🔥 */
.badge-voce {
  color: #f59e0b;
  font-size: 10px;
  font-weight: 900;
  margin-left: 6px;
  text-transform: uppercase;
}

/* UTILS */
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.h-full { height: 100%; }
.w-full { width: 100%; }
.font-normal { font-weight: 500; }
.font-bold { font-weight: 700; }
.text-md { font-size: 14px; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-left { text-align: left; }
.relative { position: relative; }
.overflow-hidden { overflow: hidden; }

.icon-sm { width: 16px; height: 16px; }
.icon-xs { width: 12px; height: 12px; }

.main-layout {
  width: 100%; 
  height: 100vh;      
  height: 100dvh;     
  display: flex;
  flex-direction: column;
  background-color: #0b0f19;
  color: white;
  font-family: 'Montserrat', sans-serif;
  overflow: hidden;   
}

.content-area {
  flex: 1;
  padding: 20px 40px;
  overflow-y: auto;   
  overflow-x: hidden; 
  box-sizing: border-box;
  padding-bottom: 90px;
  display: flex;           
  flex-direction: column;  
}

@media (max-width: 768px) {
  .content-area { padding: 15px 5px; padding-bottom: 90px; }
}

.dashboard-container {
  max-width: 1100px;
  margin: 0 auto; 
  width: 100%;
  flex: 1;                 
  display: flex;           
  flex-direction: column;  
}

.page-header { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; padding: 0 10px; }

.btn-back {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: white; font-size: 18px; width: 35px; height: 35px; border-radius: 50%;
  cursor: pointer; display: flex; justify-content: center; align-items: center; transition: all 0.2s;
}
.btn-back:hover { background: rgba(255,255,255,0.1); }

.header-titles { display: flex; flex-direction: column; }
.title-row { display: flex; align-items: center; gap: 10px; }
.title-row h2 { margin: 0; font-size: 20px; font-weight: 900; }
.badge-afiliado { 
  background: rgba(245, 158, 11, 0.2); color: #f59e0b; 
  padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; border: 1px solid rgba(245, 158, 11, 0.4);
}
.header-titles p { margin: 2px 0 0 0; font-size: 12px; color: #9ca3af; }

.dashboard-grid { 
  display: grid; 
  grid-template-columns: 320px 1fr; 
  gap: 20px; 
  align-items: stretch;    
  padding: 0 10px; 
  flex: 1;                 
}

@media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr; gap: 15px; } }
.left-column { display: flex; flex-direction: column; gap: 15px; }

.right-column {
  display: flex;
  flex-direction: column;
}

.dash-card {
  background: #111827; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

.card-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
.card-value { margin: 5px 0 0 0; font-size: 28px; font-weight: 900; }
.card-hint { margin: 4px 0 0 0; font-size: 10px; color: #6b7280; }
.card-header-icon { display: flex; align-items: center; gap: 8px; color: #d1d5db; font-size: 12px; font-weight: 700; }
.config-row h4 { margin: 2px 0 0 0; font-size: 16px; font-weight: 900; }

.link-box { display: flex; align-items: center; background: #0b0f19; border: 1px solid #1f2937; border-radius: 8px; padding: 4px 8px; }
.link-input { flex: 1; background: transparent; border: none; color: #34d399; font-size: 11px; padding: 6px; outline: none; width: 100%; }
.btn-icon { background: transparent; border: none; cursor: pointer; padding: 6px; display: flex; align-items: center; opacity: 0.7; transition: 0.2s;}
.btn-icon:hover { opacity: 1; transform: scale(1.1); }

.bg-watermark { position: absolute; right: -10px; bottom: -30px; font-size: 120px; font-weight: 900; color: rgba(255,255,255,0.03); line-height: 1; pointer-events: none; user-select: none; }

.table-card { 
  padding: 15px 0; 
  flex: 1;                 
  display: flex;           
  flex-direction: column;  
}

.table-header { display: flex; justify-content: space-between; align-items: center; padding: 0 15px 15px 15px; border-bottom: 1px solid #1f2937; }
.badge-count { background: rgba(255,255,255,0.1); color: #d1d5db; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }

.header-links {
  display: flex;
  gap: 20px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  opacity: 0.5;
  transition: all 0.2s;
  padding-bottom: 4px;
  border-bottom: 2px solid transparent;
}

.nav-link:hover {
  opacity: 0.8;
}

.nav-link.active {
  opacity: 1;
  color: white;
  border-bottom: 2px solid #f59e0b; 
}

.visible-mobile { display: none; }
.hidden-mobile { display: inline; }

.table-responsive { 
  overflow-x: auto; 
  overflow-y: auto;        
  width: 100%; 
  padding: 0 10px; 
  box-sizing: border-box; 
  flex: 1;                 
}

.table-responsive::-webkit-scrollbar { width: 5px; height: 5px; }
.table-responsive::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }

.players-table { width: 100%; border-collapse: collapse; }
.players-table th { color: #d1d5db; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 12px 8px; border-bottom: 1px solid #1f2937; white-space: nowrap; position: sticky; top: 0; background: #111827; z-index: 10;}
.players-table td { padding: 12px 8px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 12px; font-weight: 500; vertical-align: middle; white-space: nowrap; }
.players-table tbody tr:hover { background: rgba(255,255,255,0.02); }

.player-cell { display: flex; align-items: center; gap: 6px; }

.avatar-image-container {
  width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background-color: #374151; display: flex; justify-content: center; align-items: center; flex-shrink: 0;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }

.empty-players { padding: 30px 10px; text-align: center; color: #6b7280; font-size: 12px; font-style: italic; }

.btn-action-enviar {
  background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa;
  padding: 6px 12px; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: 0.2s;
}
.btn-action-enviar:hover { background: rgba(59, 130, 246, 0.2); }

@media (max-width: 480px) {
  .table-responsive { padding: 0 5px; }
  .players-table th { padding: 8px 4px; font-size: 8px; }
  .players-table td { padding: 10px 4px; font-size: 10px; }
  .player-name { max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle; }
  .avatar-image-container { width: 24px; height: 24px; }
  .btn-action-enviar { padding: 6px 8px; font-size: 9px; }
  
  .table-header { padding: 0 10px 10px 10px; flex-direction: column; align-items: flex-start; gap: 10px;}
  .header-links { width: 100%; justify-content: space-between; }
  .hidden-mobile { display: none; }
  .visible-mobile { display: inline; }
}

.become-agent-wrapper { display: flex; justify-content: center; align-items: center; height: 70vh; flex: 1;}
.become-agent-box { background: #111827; border: 1px solid #f59e0b; border-radius: 16px; padding: 30px; max-width: 400px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin: 0 15px;}
.icon-wrapper-large { font-size: 40px; margin-bottom: 10px; }
.become-agent-box h2 { color: #f59e0b; margin: 0 0 10px 0; font-size: 22px; font-weight: 900;}
.become-agent-box p { color: #9ca3af; font-size: 12px; margin-bottom: 20px;}

.agent-form .input-group { display: flex; flex-direction: column; text-align: left; gap: 5px; margin-bottom: 15px; }
.agent-form label { font-size: 10px; color: #d1d5db; font-weight: bold; text-transform: uppercase;}
.agent-form input { background: #0b0f19; border: 1px solid #374151; padding: 12px; color: white; border-radius: 8px; outline: none; text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 2px;}
.agent-form input:focus { border-color: #f59e0b; }

.btn-primary { background: #f59e0b; color: black; border: none; padding: 12px; width: 100%; border-radius: 8px; font-weight: 900; font-size: 14px; cursor: pointer; transition: 0.2s; }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* ========================================================
   MODAL APRIMORADO DE TRANSFERÊNCIA
   ======================================================== */
.modal-overlay { 
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); 
  display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; box-sizing: border-box; backdrop-filter: blur(5px);
}

.modal-box { 
  background: linear-gradient(to bottom, #1f2937, #111827); border: 1px solid #374151; 
  border-radius: 16px; padding: 0; width: 100%; max-width: 380px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); overflow: hidden;
  animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes modalScaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-top-bar {
  display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.05);
}
.modal-top-bar h3 { margin: 0; font-size: 14px; text-transform: uppercase; color: #d1d5db; letter-spacing: 1px;}
.close-btn { background: none; border: none; color: #9ca3af; font-size: 20px; cursor: pointer; line-height: 1; transition: 0.2s; padding: 0;}
.close-btn:hover { color: white; transform: scale(1.1); }

.player-modal-header {
  display: flex; align-items: center; gap: 15px; padding: 25px 20px;
}

.avatar-large-image-container {
  width: 50px; height: 50px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #10b981, #047857);
  display: flex; justify-content: center; align-items: center; border: 2px solid #064e3b;
}
.avatar-img-large { width: 100%; height: 100%; object-fit: cover; }

.player-modal-info { display: flex; flex-direction: column; }
.player-modal-info h4 { margin: 0; font-size: 20px; font-weight: 900; }
.player-modal-balance { color: #9ca3af; font-size: 13px; margin-top: 4px; }
.player-modal-balance strong { color: #60a5fa; }

.action-toggle {
  display: flex; padding: 0 20px; gap: 10px; margin-bottom: 20px;
}
.toggle-btn {
  flex: 1; padding: 10px; border-radius: 8px; font-weight: 700; font-size: 12px; text-transform: uppercase;
  background: #1f2937; border: 1px solid #374151; color: #9ca3af; cursor: pointer; transition: all 0.2s;
}
.toggle-btn.active-send { background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #10b981; }
.toggle-btn.active-withdraw { background: rgba(239, 68, 68, 0.15); border-color: #ef4444; color: #ef4444; }

.modal-form { padding: 0 20px 25px 20px; }
.modal-form .input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; text-align: left;}
.input-header-flex { display: flex; justify-content: space-between; align-items: flex-end; }
.modal-form label { color: #d1d5db; font-size: 11px; font-weight: bold; text-transform: uppercase;}
.modal-desc { color: #9ca3af; font-size: 11px; margin: 0;}
.modal-form input { 
  background: #0b0f19; border: 1px solid #374151; color: white; padding: 15px; 
  border-radius: 8px; font-size: 20px; text-align: center; outline: none; font-weight: 900;
}
.modal-form input:focus { border-color: #f59e0b; }

.modal-actions { display: flex; gap: 10px; }
.btn-confirm-action { flex: 1; border: none; color: white; padding: 14px; border-radius: 8px; font-weight: 900; font-size: 14px; text-transform: uppercase; cursor: pointer; transition: 0.2s;}
.bg-send { background: linear-gradient(to bottom, #10b981, #047857); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }
.bg-send:hover { filter: brightness(1.1); }
.bg-withdraw { background: linear-gradient(to bottom, #ef4444, #b91c1c); box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); }
.bg-withdraw:hover { filter: brightness(1.1); }
.btn-confirm-action:disabled { background: #374151; color: #9ca3af; cursor: not-allowed; box-shadow: none;}

.error-msg { color: #ef4444; font-size: 12px; font-weight: bold; margin-bottom: 15px; text-align: center;}
.warning-msg { color: #f59e0b; font-size: 12px; font-weight: bold; margin-bottom: 15px; text-align: center; font-style: italic;}

/* Tela de Sucesso */
.success-screen { padding: 40px 20px; text-align: center; }
.success-icon-wrapper { 
  width: 80px; height: 80px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); 
  display: flex; justify-content: center; align-items: center; margin: 0 auto; border: 2px solid #10b981;
}
.success-check { width: 40px; height: 40px; color: #10b981; }
.success-details { color: #d1d5db; font-size: 14px; line-height: 1.5; margin-top: 15px; }
.success-details strong { color: white; }

</style>