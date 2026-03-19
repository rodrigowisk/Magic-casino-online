<template>
  <MainLayout>
    <div class="caixa-container">
      
      <div class="page-header">
        <div class="title-wrapper">
          <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
            <line x1="12" y1="12" x2="12" y2="12"></line>
            <path d="M2 10h20"></path>
          </svg>
          <h2>CAIXA</h2>
        </div>

        <div v-if="temAcessoPrivilegiado" class="stats-badge">
          Jogadores: <strong>{{ afiliados.length }}</strong>
        </div>
      </div>

      <div class="search-bar-container">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Pesquisar jogador por nome ou ID..." 
          class="search-input"
        />
      </div>
      
      <div class="players-list">
        <div v-for="jogador in afiliadosFiltrados" :key="jogador.id" class="player-card">
          
          <div class="player-visual-group">
            <div class="avatar-container">
              <img :src="getAvatarUrl(jogador.avatarUrl)" :alt="jogador.nome" class="player-avatar" />
            </div>

            <div class="player-info">
              <div class="player-id-group">
                <button class="btn-copy" @click="copiarId(jogador.id)" title="Copiar ID">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <span class="player-id">{{ jogador.id }}</span>
              </div>
              <span class="player-name">{{ jogador.nome }}</span>
            </div>
          </div>

          <div class="player-financial">
            <button v-if="temAcessoPrivilegiado" class="btn-action btn-minus" title="Sacar" @click="abrirModal('sacar', jogador)">
              -
            </button>

            <div class="balance-display">
              <span class="amount">{{ formatarMoeda(jogador.saldo) }}</span>
            </div>

            <button v-if="temAcessoPrivilegiado" class="btn-action btn-plus" title="Depositar" @click="abrirModal('depositar', jogador)">
              +
            </button>
          </div>

        </div>

        <div v-if="afiliadosFiltrados.length === 0" class="empty-state">
          Nenhum jogador encontrado.
        </div>
      </div>

    </div>

    <div v-if="modalAberto" class="modal-overlay" @click.self="fecharModal">
      <div class="modal-content">
        
        <div class="modal-header">
          <h3 :class="tipoModal === 'depositar' ? 'text-green' : 'text-red'">
            {{ tipoModal === 'depositar' ? 'DEPOSITAR' : 'SACAR' }}
          </h3>
          <button class="btn-close-modal" @click="fecharModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div v-if="jogadorSelecionado" class="modal-player-mini">
          <img :src="getAvatarUrl(jogadorSelecionado.avatarUrl)" :alt="jogadorSelecionado.nome" class="mini-avatar" />
          <div class="mini-info">
            <span class="mini-name">{{ jogadorSelecionado.nome }}</span>
            <span class="mini-balance">Saldo atual: <strong>R$ {{ formatarMoeda(jogadorSelecionado.saldo) }}</strong></span>
          </div>
        </div>

        <div class="modal-input-group">
          <label for="valor-transacao">Valor (R$)</label>
          <div class="input-wrapper">
            <span class="input-prefix">R$</span>
            <input 
              id="valor-transacao"
              v-model="valorInput" 
              type="number" 
              placeholder="0,00" 
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="fecharModal">Cancelar</button>
          <button 
            class="btn-confirm" 
            :class="tipoModal === 'depositar' ? 'bg-green' : 'bg-red'"
            @click="confirmarTransacao"
            :disabled="!valorInput || Number(valorInput) <= 0"
          >
            Confirmar {{ tipoModal === 'depositar' ? 'Depósito' : 'Saque' }}
          </button>
        </div>

      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MainLayout from '../layouts/MainLayout.vue'; 

// ==========================================
// ESTADO GERAL
// ==========================================
const userRole = ref('agente'); 
const searchQuery = ref('');

const afiliados = ref([
  { id: '#678967696978', nome: 'rodrigowisk', saldo: 1500.50, avatarUrl: 'rodrigo_avatar_real' }, 
  { id: '#889900112233', nome: 'maria_cassino', saldo: 250.00, avatarUrl: 'maria_avatar_real' },  
  { id: '#445566778899', nome: 'jogador_vip10', saldo: 12400.75, avatarUrl: 'vip10_avatar_real' }, 
]);

// ==========================================
// ESTADO DO MODAL
// ==========================================
const modalAberto = ref(false);
const tipoModal = ref<'depositar' | 'sacar'>('depositar');
const jogadorSelecionado = ref<any>(null);
const valorInput = ref('');

const avatarImages: Record<string, string> = import.meta.glob('../assets/imagens/avatars/**/*.webp', { eager: true, import: 'default' });

// ==========================================
// LÓGICA COMPUTADA E MÉTODOS
// ==========================================
const afiliadosFiltrados = computed(() => {
  if (!searchQuery.value) {
    return afiliados.value;
  }
  const query = searchQuery.value.toLowerCase();
  return afiliados.value.filter(jogador => 
    jogador.nome.toLowerCase().includes(query) || 
    jogador.id.toLowerCase().includes(query)
  );
});

const temAcessoPrivilegiado = computed(() => {
  return ['dono', 'gerente', 'agente'].includes(userRole.value);
});

const formatarMoeda = (valor: number) => {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const copiarId = async (id: string) => {
  try {
    await navigator.clipboard.writeText(id);
    alert(`ID ${id} copiado com sucesso!`); 
  } catch (err) {
    console.error('Falha ao copiar:', err);
  }
};

const abrirModal = (tipo: 'depositar' | 'sacar', jogador: any) => {
  tipoModal.value = tipo;
  jogadorSelecionado.value = jogador;
  valorInput.value = ''; 
  modalAberto.value = true;
};

const fecharModal = () => {
  modalAberto.value = false;
  setTimeout(() => {
    jogadorSelecionado.value = null;
  }, 200); 
};

const confirmarTransacao = () => {
  const valor = Number(valorInput.value);
  if (valor <= 0) return;

  if (tipoModal.value === 'depositar') {
    console.log(`Depositando R$ ${valor} para ${jogadorSelecionado.value.nome}`);
    jogadorSelecionado.value.saldo += valor; 
  } else {
    if (valor > jogadorSelecionado.value.saldo) {
      alert('Saldo insuficiente para este saque!');
      return;
    }
    console.log(`Sacando R$ ${valor} de ${jogadorSelecionado.value.nome}`);
    jogadorSelecionado.value.saldo -= valor; 
  }

  fecharModal();
};

const getAvatarUrl = (avatarSource: string) => {
  if (avatarSource && (avatarSource.startsWith('http') || avatarSource.startsWith('data:image'))) {
    return avatarSource;
  }
  const safeFilename = avatarSource || 'default.webp';
  const path = `../assets/imagens/avatars/${safeFilename}`;
  return avatarImages[path] || avatarImages['../assets/imagens/avatars/default.webp'];
};

onMounted(async () => {
  const realAvatar = localStorage.getItem('magic_avatar') || 'default.webp';
  
  afiliados.value = afiliados.value.map(jogador => {
    if (jogador.nome === 'rodrigowisk') {
      return { ...jogador, avatarUrl: realAvatar };
    }
    if (jogador.nome === 'maria_cassino') {
        return { ...jogador, avatarUrl: 'woman/1.webp' };
    }
    if (jogador.nome === 'jogador_vip10') {
        return { ...jogador, avatarUrl: 'man/2.webp' };
    }
    return jogador;
  });
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap');

.caixa-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-width: 800px; 
  margin: 0 auto;
}

/* --- Cabeçalho e Pesquisa --- */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.title-wrapper { display: flex; align-items: center; gap: 10px; }
.header-icon { width: 28px; height: 28px; color: #3ce48a; }
.page-header h2 { margin: 0; font-size: 24px; font-weight: 900; color: #3ce48a; text-transform: uppercase; letter-spacing: 1px; }
.stats-badge { background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; padding: 6px 12px; border-radius: 20px; font-size: 14px; color: #e2e8f0; }
.stats-badge strong { color: #fff; font-weight: 700; margin-left: 5px; }
.search-bar-container { display: flex; align-items: center; background: rgba(13, 19, 33, 0.6); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 0px; padding: 8px 12px; margin-bottom: 20px; transition: all 0.3s ease; }
.search-bar-container:focus-within { border-color: #a855f7; box-shadow: 0 0 10px rgba(168, 85, 247, 0.15); background: rgba(13, 19, 33, 0.9); }
.search-icon { width: 16px; height: 16px; color: #94a3b8; margin-right: 10px; }
.search-input { flex: 1; background: transparent; border: none; color: #fff; font-size: 14px; font-family: 'Montserrat', sans-serif; outline: none; }
.search-input::placeholder { color: #64748b; font-style: italic; }

/* --- Lista de Jogadores --- */
.players-list { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-right: 5px; }
.players-list::-webkit-scrollbar { width: 6px; }
.players-list::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.3); border-radius: 4px; }
.players-list::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 4px; }

/* Card Principal (Desktop) */
.player-card { 
  display: flex; 
  flex-direction: row;
  justify-content: space-between; 
  align-items: center; 
  background: linear-gradient(145deg, #151e32 0%, #0d1321 100%); 
  border: 1px solid rgba(168, 85, 247, 0.3); 
  border-radius: 12px; 
  padding: 12px 15px; /* Adicionado padding ao redor de tudo */
  gap: 15px;
  transition: transform 0.2s, box-shadow 0.2s; 
}
.player-card:hover { border-color: rgba(168, 85, 247, 0.8); box-shadow: 0 4px 15px rgba(168, 85, 247, 0.15); }

.player-visual-group { 
  display: flex; 
  align-items: center; 
  gap: 12px; /* Espaço entre a foto circular e o texto */
  flex: 1; 
  min-width: 0; 
} 

/* AQUI: MÁSCARA CIRCULAR COM FUNDO PRETO */
.avatar-container { 
  width: 50px; 
  height: 50px; 
  border-radius: 50%; /* Círculo perfeito */
  background-color: #000; /* Fundo Preto */
  flex-shrink: 0; 
  overflow: hidden; /* Corta o que sobrar da imagem */
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1); /* Borda sutil pra destacar do fundo do card */
}

.player-avatar { 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
}

/* Info do Jogador */
.player-info { 
  display: flex; 
  flex-direction: column; 
  gap: 4px; 
  overflow: hidden; 
}
.player-id-group { display: flex; align-items: center; gap: 6px; }
.btn-copy { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; transition: color 0.2s; flex-shrink: 0; }
.btn-copy svg { width: 12px; height: 12px; }
.btn-copy:hover { color: #3ce48a; }
.player-id { font-size: 11px; color: #94a3b8; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.player-name { font-size: 15px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Controle Financeiro */
.player-financial { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.balance-display { display: flex; align-items: baseline; gap: 4px; background: rgba(0, 0, 0, 0.4); padding: 6px 12px; border-radius: 8px; min-width: 110px; justify-content: flex-end; }
.currency { font-size: 11px; color: #3ce48a; font-weight: 700; }
.amount { font-size: 16px; font-weight: 900; color: #fff; }

/* AQUI: BOTÕES ARRUMADOS */
.btn-action { 
  width: 32px; 
  height: 32px; 
  border-radius: 8px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  border: none; 
  cursor: pointer; 
  font-size: 22px; /* Fonte ajustada */
  font-weight: 900; 
  padding: 0;
  transition: all 0.2s; 
}
.btn-minus { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.5); color: #ef4444; }
.btn-minus:hover { background: rgba(239, 68, 68, 0.3); box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
.btn-plus { background: rgba(60, 228, 138, 0.1); border: 1px solid rgba(60, 228, 138, 0.5); color: #3ce48a; }
.btn-plus:hover { background: rgba(60, 228, 138, 0.3); box-shadow: 0 0 10px rgba(60, 228, 138, 0.4); }

.empty-state { text-align: center; color: #64748b; font-style: italic; padding: 40px 0; font-size: 14px; }

/* --- ESTILOS DO MODAL --- */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease-out; }
.modal-content { background: linear-gradient(to bottom, #151e32 0%, #0a0f18 100%); border: 1px solid #a855f7; border-radius: 16px; width: 90%; max-width: 380px; padding: 25px; box-shadow: 0 15px 50px rgba(0,0,0,0.8), 0 0 20px rgba(168, 85, 247, 0.2); animation: slideUp 0.3s ease-out; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 1px; }
.text-green { color: #3ce48a; }
.text-red { color: #ef4444; }
.btn-close-modal { background: none; border: none; color: #64748b; cursor: pointer; padding: 5px; display: flex; transition: color 0.2s; }
.btn-close-modal svg { width: 20px; height: 20px; }
.btn-close-modal:hover { color: #fff; }
.modal-player-mini { display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 25px; }
.mini-avatar { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; background: #000; }
.mini-info { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
.mini-name { color: #fff; font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-balance { color: #94a3b8; font-size: 13px; }
.mini-balance strong { color: #3ce48a; font-weight: 700; }
.modal-input-group { margin-bottom: 25px; }
.modal-input-group label { display: block; color: #94a3b8; font-size: 13px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; }
.input-wrapper { display: flex; align-items: center; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 8px; padding: 0 15px; transition: all 0.3s ease; }
.input-wrapper:focus-within { border-color: #a855f7; box-shadow: 0 0 10px rgba(168, 85, 247, 0.2); }
.input-prefix { color: #3ce48a; font-weight: 900; font-size: 18px; margin-right: 10px; }
.input-wrapper input { flex: 1; background: transparent; border: none; color: #fff; font-size: 24px; font-weight: 900; padding: 15px 0; font-family: 'Montserrat', sans-serif; outline: none; }
.input-wrapper input::-webkit-outer-spin-button, .input-wrapper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.input-wrapper input[type=number] { -moz-appearance: textfield; }
.modal-actions { display: flex; gap: 10px; }
.btn-cancel { flex: 1; background: transparent; border: 1px solid #475569; color: #94a3b8; font-weight: 700; font-size: 14px; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-family: 'Montserrat', sans-serif; }
.btn-cancel:hover { background: rgba(71, 85, 105, 0.2); color: #fff; }
.btn-confirm { flex: 2; border: none; color: #fff; font-weight: 700; font-size: 14px; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-family: 'Montserrat', sans-serif; }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.bg-green { background: #10b981; }
.bg-green:not(:disabled):hover { background: #059669; box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
.bg-red { background: #ef4444; }
.bg-red:not(:disabled):hover { background: #dc2626; box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* =========================================================
   AQUI: CORREÇÃO DO ANDROID (SEMPRE EM UMA LINHA)
   ========================================================= */
@media (max-width: 600px) {
  .player-card { 
    padding: 8px 10px; /* Reduz espaçamento externo do card */
    gap: 8px; /* Reduz espaço entre bloco esquerdo (info) e direito (financeiro) */
  }
  
  .player-visual-group {
    gap: 8px; /* Reduz espaço entre foto e texto */
  }

  .avatar-container { 
    width: 42px; 
    height: 42px; 
  }

  .player-info { 
    gap: 2px; 
  }

  .player-name { font-size: 13px; }
  .player-id { font-size: 10px; }
  .btn-copy svg { width: 10px; height: 10px; }

  .player-financial { 
    gap: 6px; /* Reduz espaços entre botões e saldo */
  }
  
  .btn-action { 
    width: 28px; 
    height: 28px; 
    font-size: 20px; 
  }

  .balance-display { 
    padding: 4px 6px; 
    min-width: 75px; 
  }
  
  .amount { font-size: 13px; }
  .currency { font-size: 10px; }
}
</style>