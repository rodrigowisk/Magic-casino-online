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
            <p class="text-gray-light">Controle total do clube, emissão de fichas e membros.</p>
          </div>
        </div>

        <div class="tabs-wrapper glass-card mb-4">
          <button :class="['tab-btn', currentTab === 'resumo' ? 'active-tab' : '']" @click="currentTab = 'resumo'">📊 Visão Geral</button>
          <button :class="['tab-btn', currentTab === 'mesas' ? 'active-tab' : '']" @click="currentTab = 'mesas'">🃏 Mesas</button>
          <button :class="['tab-btn', currentTab === 'membros' ? 'active-tab' : '']" @click="currentTab = 'membros'">👥 Membros</button>
          <button :class="['tab-btn', currentTab === 'financeiro' ? 'active-tab' : '']" @click="currentTab = 'financeiro'">🏦 Cofre do Clube</button>
          <button :class="['tab-btn', currentTab === 'transacoes' ? 'active-tab' : '']" @click="currentTab = 'transacoes'">📜 Movimentações</button>
          <button :class="['tab-btn', currentTab === 'clube' ? 'active-tab' : '']" @click="currentTab = 'clube'">⚙️ Config</button>
        </div>

        <div v-if="isLoading" class="loading-msg text-neon-gold text-center mt-4">Carregando dados do servidor...</div>

        <div v-if="currentTab === 'resumo' && !isLoading" class="tab-content fade-in">
          <div class="dashboard-grid">
            <div class="dash-card glass-card-red card-hover-red relative overflow-hidden">
              <span class="card-label text-red-light">FICHAS NO CLUBE</span>
              <h3 class="card-value text-neon-white">🪙 {{ formatCurrency(adminData.totalChipsInMarket) }}</h3>
              <p class="card-hint text-red-muted">Total circulando entre jogadores e agentes.</p>
              <div class="bg-watermark text-red-dark">🏦</div>
            </div>
            <div class="dash-card glass-card card-hover-gold relative overflow-hidden">
              <span class="card-label">ARRECADAÇÃO DO CLUBE (RAKE)</span>
              <h3 class="card-value text-neon-gold">🪙 {{ formatCurrency(adminData.clubProfit) }}</h3>
              <p class="card-hint text-gray-light">Fichas recolhidas nas mesas.</p>
              <div class="bg-watermark">📈</div>
            </div>
            <div class="dash-card glass-card card-hover-blue relative overflow-hidden">
              <span class="card-label">MEMBROS TOTAIS</span>
              <h3 class="card-value text-neon-blue">{{ adminData.totalMembers }}</h3>
              <p class="card-hint text-gray-light">Jogadores e agentes cadastrados.</p>
              <div class="bg-watermark">👥</div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'transacoes' && !isLoading" class="tab-content fade-in">
          <div class="dash-card glass-card table-card">
            <div class="table-header">
              <span class="font-bold text-neon-white text-md">Auditoria de Movimentações</span>
              <button class="btn-action-manage" @click="carregarTransacoes">🔄 Atualizar</button>
            </div>
            
            <div class="table-responsive mt-3">
              <table class="players-table">
                <thead>
                  <tr>
                    <th class="text-left text-gray-light text-xs p-2">Data / Hora</th>
                    <th class="text-left text-gray-light text-xs p-2">Movimentação</th>
                    <th class="text-right text-gray-light text-xs p-2" style="padding-right: 30px;">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="tx in paginatedTransactions" :key="tx.id" class="table-row-hover">
                    <td class="text-left text-gray-light text-xs">{{ formatDateTime(tx.createdAt) }}</td>
                    
                    <td class="text-left font-bold text-white">
                      <div class="player-cell" style="display: flex; align-items: center; gap: 10px;">
                        
                        <svg v-if="!tx.isPositive" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="icon-sm">
                          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                        <svg v-else viewBox="0 0 24 24" fill="none" stroke="#3ce48a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="icon-sm">
                          <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
                        </svg>

                        <div style="display: flex; flex-direction: column; gap: 2px;">
                          <span class="text-white">{{ tx.mainDesc }}</span>
                          <span style="font-size: 10px; color: #9ca3af; font-weight: normal; letter-spacing: 0.5px;">
                            {{ tx.rota }}
                          </span>
                        </div>
                        
                      </div>
                    </td>

                    <td class="text-right font-bold" :class="tx.isPositive ? 'text-neon-emerald' : 'text-neon-red'" style="padding-right: 30px;">
                      {{ tx.isPositive ? '+' : '-' }} {{ formatCurrency(tx.amount) }}
                    </td>
                  </tr>

                  <tr v-if="paginatedTransactions.length === 0">
                    <td colspan="3" class="text-center p-3 text-gray-light">Nenhuma movimentação encontrada no sistema.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="pagination-controls" v-if="totalPages > 1">
              <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">← Anterior</button>
              <span class="page-info">Página {{ currentPage }} de {{ totalPages }}</span>
              <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">Próxima →</button>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'mesas' && !isLoading" class="tab-content fade-in">
          <div class="dash-card glass-card table-card">
            <div class="table-header">
              <span class="font-bold text-neon-white text-md">Histórico de Rake por Mesa</span>
            </div>
            
            <div class="table-responsive mt-3">
              <table class="players-table">
                <thead>
                  <tr>
                    <th class="text-left text-gray-light text-xs p-2">Mesa / Data</th>
                    <th class="text-center text-gray-light text-xs p-2">Status</th>
                    <th class="text-right text-gray-light text-xs p-2">Rake Gerado</th>
                    <th class="text-right text-gray-light text-xs p-2" style="padding-right: 15px;">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="table in tablesReport" :key="table.tableId" class="table-row-hover">
                    <td class="text-left w-1/3">
                      <div class="font-bold text-white">{{ table.name }}</div>
                      <div class="text-xs text-gray-light">{{ new Date(table.createdAt).toLocaleDateString('pt-BR') }}</div>
                    </td>
                    <td class="text-center">
                      <span :class="table.isActive ? 'badge-count neon-badge-emerald' : 'badge-count neon-badge-red'">
                        {{ table.isActive ? 'ATIVA' : 'FECHADA' }}
                      </span>
                    </td>
                    <td class="text-right text-neon-gold font-bold">
                      🪙 {{ formatCurrency(table.rakeGerado) }}
                    </td>
                    <td class="text-right cell-actions">
                      <div class="action-buttons-wrapper">
                        <button class="btn-action-manage" @click="abrirModalDetalhesMesa(table)">
                          🔍 <span class="btn-text hidden-mobile" style="margin-left: 4px;">Detalhes</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="tablesReport.length === 0">
                    <td colspan="4" class="text-center p-3 text-gray-light">Nenhuma mesa encontrada no sistema.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'membros' && !isLoading" class="tab-content fade-in">
          
          <PendingAffiliates 
            :pendingList="pendingList"
            :isProcessing="isProcessingAction"
            @accept="aceitarJogador"
            @reject="rejeitarJogador"
          />

          <div class="dash-card glass-card table-card mb-4">
            <div class="table-header">
              <span class="font-bold text-neon-gold text-md">Painel de Agentes VIP</span>
              <span class="badge-count neon-badge-gold">{{ agentsList.length }} encontrados</span>
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
                        <div class="player-info-flex">
                          <span class="text-yellow font-bold">{{ user.username }}</span>
                          <span class="player-id-small" v-if="user.id || user.Id">ID: {{ formatShortId(user.id || user.Id) }}</span>
                          <span v-if="!user.isActive" class="status-banned-text">(BANIDO)</span>
                        </div>
                      </div>
                    </td>
                    <td class="text-right text-neon-gold font-bold w-1/3">
                      🪙 {{ formatCurrency(user.agentBalance) }}
                    </td>
                    <td class="text-right cell-actions w-1/3">
                      <div class="action-buttons-wrapper">
                        <button class="btn-action-rocket" @click="iniciarToggleAgente(user)" title="Remover Agente VIP">🚀</button>
                        <button class="btn-action-manage" @click="abrirModalTransferencia(user, 'agent')">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-transfer"><path d="m11 16-4 4-4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
                          <span class="btn-text hidden-mobile">Gerenciar Fichas</span>
                        </button>
                        <button :class="user.isActive ? 'btn-action-delete' : 'btn-action-reactivate'" @click="iniciarBanimento(user)" :title="user.isActive ? 'Banir Usuário' : 'Reativar Usuário'">
                          {{ user.isActive ? '🚫' : '🔄' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="agentsList.length === 0">
                    <td colspan="3" class="text-center p-3 text-gray-light">Nenhum agente encontrado.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="search-bar-wrapper mb-4">
            <div class="search-input-group glass-card" style="padding: 12px 15px; display: flex; align-items: center; border-radius: 12px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; margin-right: 12px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" v-model="searchQuery" placeholder="Buscar por nome do jogador ou agente..." class="search-input-transparent w-full" />
            </div>
          </div>

          <div class="dash-card glass-card table-card">
            <div class="table-header">
              <span class="font-bold text-neon-white text-md">Painel de Jogadores</span>
              <span class="badge-count neon-badge-blue">{{ allPlayersList.length }} encontrados</span>
            </div>
            
            <div class="table-responsive mt-3">
              <table class="players-table">
                <tbody>
                  <tr v-for="user in allPlayersList" :key="'player-' + user.id" class="table-row-hover">
                    <td class="text-left w-1/3">
                      <div class="player-cell">
                        <div class="avatar-image-container" :class="{ 'border-gold': user.isAgent }">
                          <img :src="getAvatarUrl(user?.avatar)" alt="Avatar" class="avatar-img" />
                        </div>
                        <div class="player-info-flex">
                          <div style="display: flex; align-items: center; gap: 6px;">
                             <span class="font-bold" :class="user.isAgent ? 'text-yellow' : 'text-white'">{{ user.username }}</span>
                             <span v-if="user.isAgent" class="badge-count neon-badge-gold" style="font-size: 8px; padding: 1px 4px; line-height: 1;">AGENTE</span>
                          </div>
                          <span class="player-id-small" v-if="user.id || user.Id">ID: {{ formatShortId(user.id || user.Id) }}</span>
                          <span v-if="!user.isActive" class="status-banned-text">(JOGADOR BANIDO)</span>
                        </div>
                      </div>
                    </td>
                    <td class="text-right text-neon-emerald font-bold w-1/3">
                      🪙 {{ formatCurrency(user.balance) }}
                    </td>
                    <td class="text-right cell-actions w-1/3">
                      <div class="action-buttons-wrapper">
                        <button class="btn-action-rocket" @click="iniciarToggleAgente(user)" :title="user.isAgent ? 'Remover Agente VIP' : 'Promover a Agente VIP'">🚀</button>
                        <button class="btn-action-manage" @click="abrirModalTransferencia(user, 'player')">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-transfer"><path d="m11 16-4 4-4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
                          <span class="btn-text hidden-mobile">Gerenciar Fichas</span>
                        </button>
                        <button :class="user.isActive ? 'btn-action-delete' : 'btn-action-reactivate'" @click="iniciarBanimento(user)" :title="user.isActive ? 'Banir Usuário' : 'Reativar Usuário'">
                          {{ user.isActive ? '🚫' : '🔄' }}
                        </button>
                      </div>
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
              <div class="action-toggle mb-3" style="padding: 0;">
                <button class="toggle-btn" :class="{ 'active-send': financeAction === 'emit' }" @click="financeAction = 'emit'">↑ Emitir Fichas</button>
                <button class="toggle-btn" :class="{ 'active-withdraw': financeAction === 'withdraw' }" @click="financeAction = 'withdraw'">↓ Recolher Fichas</button>
              </div>

              <h3 class="text-neon-white mb-3" v-if="financeAction === 'emit'">Gerar Novas Fichas</h3>
              <h3 class="text-neon-white mb-3" v-else>Recolher Fichas (Queimar)</h3>

              <p class="text-gray-light text-xs mb-3" v-if="financeAction === 'emit'">
                Gere novas fichas no clube e adicione diretamente ao <strong>SEU</strong> saldo de Banco de Fichas.
              </p>
              <p class="text-gray-light text-xs mb-3" v-else>
                Retire fichas de circulação da sua conta. Elas serão permanentemente removidas do clube.
              </p>
              
              <form @submit.prevent="confirmarTransferenciaAba" class="admin-form">
                <div class="input-group mt-2">
                  <label>Ação na Conta</label>
                  <input type="text" :value="`Meu Perfil (${currentOwnerName}) • Saldo: 🪙 ${formatCurrency(currentOwnerBalance)}`" class="glass-input locked-input text-neon-gold" disabled />
                </div>

                <div class="input-group mt-3">
                  <label>Quantidade (🪙)</label>
                  <input type="number" v-model="financeForm.amount" min="1" step="1" placeholder="0" :class="financeAction === 'emit' ? 'text-neon-emerald glass-input' : 'text-neon-red glass-input'" required />
                </div>
                
                <p v-if="transferError" class="error-msg mt-2">{{ transferError }}</p>

                <button type="submit" :class="financeAction === 'emit' ? 'btn-primary glow-btn-emerald mt-4' : 'btn-primary glow-btn-red mt-4'" :disabled="isProcessing">
                  <span v-if="isProcessing">Processando...</span>
                  <span v-else>{{ financeAction === 'emit' ? 'GERAR FICHAS' : 'RECOLHER FICHAS' }}</span>
                </button>
              </form>
            </div>

            <div class="dash-card glass-card card-hover-red">
              <h3 class="text-neon-white mb-3">Avisos do Sistema</h3>
              <ul class="activity-list">
                <li><span class="text-neon-gold">Emissão:</span> A emissão cria novas fichas virtuais no clube e as deposita no seu perfil de Diretor.</li>
                <li><span class="text-neon-red">Recolhimento:</span> O recolhimento retira as fichas permanentemente de circulação da sua conta do clube.</li>
                <li><span class="text-neon-blue">Rake:</span> A taxa arrecadada nas mesas deve ser compensada emitindo esse valor em fichas por aqui.</li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'clube'" class="tab-content fade-in">
          <div class="dash-card glass-card card-hover-gold max-w-md mx-auto mb-4">
            <h3 class="text-neon-white mb-3 text-center">Perfil do Clube</h3>
            <form class="admin-form" @submit.prevent>
              <div class="input-group">
                <label>Nome do Clube</label>
                <input type="text" value="Magic Casino Oficial" class="glass-input locked-input" readonly />
              </div>
            </form>
          </div>

          <div class="dash-card glass-card card-hover-blue max-w-md mx-auto">
            <h3 class="text-neon-white mb-3 text-center">Gestão de Jogos</h3>
            <p class="text-gray-light text-xs text-center mb-4">Ative ou desative os jogos que aparecerão no Lobby.</p>
            
            <div class="toggle-list">
              <div class="toggle-item">
                <span class="text-neon-purple font-bold">MEINHO</span>
                <label class="switch">
                  <input type="checkbox" v-model="activeGames.meinho">
                  <span class="slider round slider-purple"></span>
                </label>
              </div>

              <div class="toggle-item mt-3">
                <span class="text-neon-blue font-bold">CACHETA</span>
                <label class="switch">
                  <input type="checkbox" v-model="activeGames.cacheta">
                  <span class="slider round slider-blue"></span>
                </label>
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
          <h3 class="text-green-bright mt-3">Operação Concluída!</h3>
          <p class="success-details text-gray-light">
            <span v-if="transactionType === 'send'">Você transferiu <strong>🪙 {{ formatCurrency(Number(transferAmount)) }}</strong> do seu Banco de Fichas para o perfil de {{ targetWallet === 'agent' ? 'AGENTE' : 'JOGADOR' }} de <strong>{{ selectedPlayerObj?.username }}</strong>.</span>
            <span v-else>Você recolheu <strong>🪙 {{ formatCurrency(Number(transferAmount)) }}</strong> de <strong>{{ selectedPlayerObj?.username }}</strong> de volta para o seu Banco de Fichas.</span>
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
                Saldo: <strong :class="targetWallet === 'agent' ? 'text-neon-gold' : 'text-neon-emerald'">🪙 {{ formatCurrency(targetWallet === 'agent' ? (selectedPlayerObj?.agentBalance || 0) : (selectedPlayerObj?.balance || 0)) }}</strong>
              </span>
            </div>
          </div>

          <div class="action-toggle">
            <button class="toggle-btn" :class="{ 'active-send': transactionType === 'send' }" @click="transactionType = 'send'">↑ Enviar Fichas</button>
            <button class="toggle-btn" :class="{ 'active-withdraw': transactionType === 'withdraw' }" @click="transactionType = 'withdraw'">↓ Recolher Fichas</button>
          </div>
          
          <form @submit.prevent="confirmarTransferenciaModal" class="modal-form">
            <div class="input-group">
              <div class="input-header-flex">
                <label>Quantidade (🪙)</label>
                <span v-if="transactionType === 'send'" class="modal-desc text-right text-neon-gold font-bold">Seu Banco: 🪙 {{ formatCurrency(currentOwnerBalance) }}</span>
                <span v-else class="modal-desc text-right text-red-400">Limite: 🪙 {{ formatCurrency(targetWallet === 'agent' ? (selectedPlayerObj?.agentBalance || 0) : (selectedPlayerObj?.balance || 0)) }}</span>
              </div>
              <input type="number" v-model="transferAmount" min="1" step="1" :placeholder="transactionType === 'send' ? 'Fichas para enviar...' : 'Fichas para recolher...'" required />
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

    <div class="modal-overlay" v-if="customConfirmAgent.show" @click.self="customConfirmAgent.show = false">
      <div class="modal-box custom-alert-box">
        <div class="alert-icon bg-gold-light">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <h3 class="text-neon-gold">{{ customConfirmAgent.title }}</h3>
        <p class="text-gray-light mt-3" v-html="customConfirmAgent.message"></p>
        
        <div class="modal-actions mt-4" style="margin-top: 20px;">
          <button class="btn-cancel" @click="customConfirmAgent.show = false">Cancelar</button>
          <button class="btn-confirm-action bg-gold" @click="executarToggleAgente" :disabled="isProcessing">
            <span v-if="isProcessing">Aguarde...</span>
            <span v-else>Confirmar</span>
          </button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="customConfirm.show" @click.self="customConfirm.show = false">
      <div class="modal-box custom-alert-box">
        <div class="alert-icon bg-red-light" v-if="customConfirm.title.includes('Banir')">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="alert-icon bg-emerald-light" v-else>
          <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <polyline points="23 20 23 14 17 14"></polyline>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
          </svg>
        </div>
        <h3 :class="customConfirm.title.includes('Banir') ? 'text-neon-red' : 'text-neon-emerald'">{{ customConfirm.title }}</h3>
        <p class="text-gray-light mt-3" v-html="customConfirm.message"></p>
        
        <div class="modal-actions mt-4" style="margin-top: 20px;">
          <button class="btn-cancel" @click="customConfirm.show = false">Cancelar</button>
          <button class="btn-confirm-action" :class="customConfirm.title.includes('Banir') ? 'bg-withdraw' : 'bg-send'" @click="executarBanimento">
            Confirmar
          </button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showTableDetailsModal" @click.self="showTableDetailsModal = false">
      <div class="modal-box">
        <div class="modal-top-bar">
          <h3>Detalhes da Mesa: {{ selectedTable?.name }}</h3>
          <button class="close-btn" @click="showTableDetailsModal = false">✕</button>
        </div>
        <div style="padding: 20px;">
          <h4 class="text-neon-gold text-center" style="font-size: 24px; font-weight: 900; margin-bottom: 10px;">
            🪙 {{ formatCurrency(selectedTable?.rakeGerado || 0) }}
          </h4>
          <p class="text-gray-light text-center text-xs" style="text-transform: uppercase; font-weight: bold; margin-bottom: 20px;">
            Total Arrecadado pelo Clube
          </p>
          <div v-if="isLoadingTableDetails" class="text-center text-neon-blue my-4">Carregando detalhes...</div>
          <div v-else>
            <p class="text-white text-xs mb-2 font-bold uppercase">Contribuição por Jogador:</p>
            <ul class="activity-list" style="max-height: 250px; overflow-y: auto;">
              <li v-for="player in tablePlayersReport" :key="player.playerId" style="display: flex; justify-content: space-between; align-items: center;">
                <span class="text-white">{{ getPlayerName(player.playerId) }}</span>
                <span class="text-neon-gold font-bold">🪙 {{ formatCurrency(player.rakePago) }}</span>
              </li>
              <li v-if="tablePlayersReport.length === 0" class="text-center text-gray-light" style="border: none; background: transparent;">
                Nenhuma ficha gerada nesta mesa ainda.
              </li>
            </ul>
          </div>
          <button class="btn-primary glow-btn-blue mt-4 w-full" @click="showTableDetailsModal = false">Fechar Detalhes</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="customAlert.show" @click.self="customAlert.show = false">
      <div class="modal-box custom-alert-box">
        <div class="alert-icon bg-emerald-light" v-if="customAlert.title === 'Sucesso'">
          <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div class="alert-icon bg-red-light" v-else>
           <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 :class="customAlert.title === 'Sucesso' ? 'text-neon-emerald' : 'text-neon-red'">{{ customAlert.title }}</h3>
        <p class="text-gray-light mt-3" v-html="customAlert.message"></p>
        <button class="btn-confirm-full mt-4" style="margin-top: 20px;" @click="customAlert.show = false">OK</button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import Header from '../components/Header.vue';
import BottomNav from '../components/BottomNav.vue';
import PendingAffiliates from '../components/PendingAffiliates.vue'; 
import { adminService } from '../services/adminService';
import { activeGames } from '../services/gameSettings';

const router = useRouter();
const currentTab = ref('resumo');
const isLoading = ref(true);
const isProcessing = ref(false);
const isProcessingAction = ref(false);

const currentOwnerName = ref(localStorage.getItem('magic_username') || 'Diretor');
const transferError = ref('');
const financeAction = ref<'emit' | 'withdraw'>('emit');

const searchQuery = ref('');

const showTransferModal = ref(false);
const selectedPlayerObj = ref<any>(null);
const targetWallet = ref<'player' | 'agent'>('player'); 
const transferAmount = ref('');
const modalError = ref('');
const transactionType = ref<'send' | 'withdraw'>('send');
const transactionSuccess = ref(false);

const adminData = ref({ totalMembers: 0, totalChipsInMarket: 0, clubProfit: 0 });
const membersList = ref<any[]>([]);
const pendingList = ref<any[]>([]); 

const tablesReport = ref<any[]>([]);
const tablePlayersReport = ref<any[]>([]);
const transactionsList = ref<any[]>([]);
const showTableDetailsModal = ref(false);
const selectedTable = ref<any>(null);
const isLoadingTableDetails = ref(false);

const customAlert = reactive({ show: false, title: '', message: '' });
const customConfirm = reactive({ show: false, title: '', message: '', userObj: null as any });

const customConfirmAgent = reactive({ show: false, title: '', message: '', userObj: null as any });

const currentPage = ref(1);
const itemsPerPage = 20;

const formatShortId = (fullId: string | number) => {
  if (!fullId) return '';
  return String(fullId).split('-')[0].toUpperCase();
};

const paginatedTransactions = computed(() => {
  if (!transactionsList.value) return [];
  
  const formattedList = transactionsList.value.map((tx, index) => {
    const isEntrada = tx.amount > 0;
    const absAmount = Math.abs(tx.amount);
    
    const isMe = tx.username === currentOwnerName.value;
    const donoDaConta = isMe ? 'VOCÊ (Admin)' : (tx.username?.toUpperCase() || 'DESCONHECIDO');
    const contraparte = tx.description ? tx.description.toUpperCase() : donoDaConta;
    
    let mainDesc = '';
    let rota = '';
    let arrowColor = isEntrada ? 'text-neon-emerald' : 'text-neon-red';
    const op = tx.operation ? tx.operation.toUpperCase() : '';

    if (op === 'BUYIN') {
      mainDesc = 'Depósito na Mesa';
      rota = `${donoDaConta} ➔ MESA DE JOGO`;
    } else if (op === 'CASHOUT') {
      mainDesc = 'Saque da Mesa';
      rota = `MESA DE JOGO ➔ ${donoDaConta}`;
    } else if (op.includes('RAKE')) {
      mainDesc = 'Recolhimento de Rake';
      rota = `MESA DE JOGO ➔ COFRE DO CLUBE`;
    } else if (op.includes('ADMIN_DEPOSIT')) {
      mainDesc = 'Emissão de Fichas (Admin)';
      rota = `SISTEMA ➔ ${donoDaConta}`;
    } else if (op.includes('ADMIN_WITHDRAW')) {
      mainDesc = 'Queima de Fichas (Admin)';
      rota = `${donoDaConta} ➔ SISTEMA`;
    } else {
      if (donoDaConta === contraparte) {
         mainDesc = 'Transferência Interna';
         rota = `AGENTE (${donoDaConta}) ➔ JOGADOR (${donoDaConta})`;
      } else {
         mainDesc = isEntrada ? 'Transferência Recebida' : 'Transferência Enviada';
         rota = isEntrada ? `${contraparte} ➔ ${donoDaConta}` : `${donoDaConta} ➔ ${contraparte}`;
      }
    }

    return {
      id: tx.id || tx.Id || index,
      createdAt: tx.createdAt || tx.date,
      mainDesc,
      rota,
      arrowColor,
      amount: absAmount,
      isPositive: isEntrada
    };
  });

  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return formattedList.slice(start, end);
});

const totalPages = computed(() => {
  if (!transactionsList.value) return 1;
  return Math.ceil(transactionsList.value.length / itemsPerPage) || 1;
});

const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };
const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };

const mostrarAlerta = (title: string, message: string) => {
  customAlert.title = title;
  customAlert.message = message;
  customAlert.show = true;
};

const iniciarToggleAgente = (user: any) => {
  const isCurrentlyAgent = user.isAgent || agentsList.value.some(a => a.id === user.id);
  customConfirmAgent.title = isCurrentlyAgent ? 'Remover Agente VIP' : 'Promover a Agente VIP';
  customConfirmAgent.message = isCurrentlyAgent 
    ? `Tem certeza que deseja rebaixar <strong>${user.username}</strong> a jogador comum? Ele perderá o painel de afiliado.`
    : `Tem certeza que deseja promover <strong>${user.username}</strong> a Agente VIP? Ele ganhará um painel de afiliados e link de indicação.`;
  customConfirmAgent.userObj = user;
  customConfirmAgent.show = true;
};

const executarToggleAgente = async () => {
  customConfirmAgent.show = false;
  const user = customConfirmAgent.userObj;
  if (!user) return;

  isProcessing.value = true;
  try {
    const token = localStorage.getItem('magic_token');
    const baseUrl = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';
    
    const response = await fetch(`${baseUrl}/api/admin/users/${user.username}/toggle-agent`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Erro ao alterar permissão do utilizador.");
    }

    mostrarAlerta("Sucesso", data.message);
    await carregarDados(); 
  } catch (error: any) {
    mostrarAlerta("Erro", error.message);
  } finally {
    isProcessing.value = false;
  }
};

const iniciarBanimento = (user: any) => {
  const acao = user.isActive ? 'banir' : 'reativar';
  customConfirm.title = user.isActive ? 'Banir Usuário' : 'Reativar Usuário';
  customConfirm.message = `Tem certeza que deseja ${acao} o perfil de <strong>${user.username}</strong>? Ele perderá o acesso imediatamente.`;
  customConfirm.userObj = user;
  customConfirm.show = true; 
};

const executarBanimento = async () => {
  customConfirm.show = false; 
  const user = customConfirm.userObj;
  if (!user) return;

  isProcessing.value = true;
  try {
    await adminService.banUser(user.username);
    user.isActive = !user.isActive; 
    mostrarAlerta("Sucesso", `O utilizador <strong>${user.username}</strong> foi ${user.isActive ? 'reativado' : 'banido'} com sucesso!`);
  } catch (error: any) {
    console.error("Erro ao banir/reativar:", error);
    mostrarAlerta("Erro", error.message || "Não foi possível alterar o estado do utilizador.");
  } finally {
    isProcessing.value = false;
  }
};

const agentsList = computed(() => {
  return membersList.value
    .filter(u => u.isAgent && (!searchQuery.value || u.username.toLowerCase().includes(searchQuery.value.toLowerCase())))
    .sort((a, b) => a.username.localeCompare(b.username));
});

const allPlayersList = computed(() => {
  return membersList.value
    .filter(u => (!searchQuery.value || u.username.toLowerCase().includes(searchQuery.value.toLowerCase())))
    .sort((a, b) => a.username.localeCompare(b.username));
});

const currentOwnerBalance = computed(() => {
  const owner = membersList.value.find(a => a.username === currentOwnerName.value && a.isAgent);
  return owner ? owner.agentBalance : 0;
});

const formatCurrency = (val: number) => Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatDateTime = (isoDate: string) => {
  const d = new Date(isoDate);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const avatarImages: Record<string, string> = import.meta.glob('../assets/imagens/avatars/**/*.webp', { eager: true, import: 'default' });
const getAvatarUrl = (filename?: string) => {
  const path = `../assets/imagens/avatars/${filename || 'default.webp'}`;
  return avatarImages[path] || avatarImages['../assets/imagens/avatars/default.webp'];
};

watch(currentTab, (newVal) => {
  if (newVal === 'transacoes') carregarTransacoes();
});

const carregarTransacoes = async () => {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const token = localStorage.getItem('magic_token');
    
    const response = await fetch(`${baseUrl}/wallet/transactions`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      transactionsList.value = await response.json();
      currentPage.value = 1;
    }
  } catch (e) {
    console.error("Erro de rede ao buscar movimentações:", e);
  }
};

const carregarDados = async () => {
  isLoading.value = true;
  try {
    const dashData = await adminService.getDashboard();
    if (dashData) adminData.value = dashData;

    const membersData = await adminService.getMembers();
    if (membersData) membersList.value = membersData;

    try {
      const token = localStorage.getItem('magic_token');
      const baseUrl = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';
      const pendingResp = await fetch(`${baseUrl}/api/admin/pending-affiliates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (pendingResp.ok) {
        const pData = await pendingResp.json();
        pendingList.value = pData.map((req: any) => ({
           userId: req.userId,
           username: `${req.username} (Para: ${req.agentName})`
        }));
      }
    } catch(e) {
      console.error("Erro ao buscar pendentes globais:", e);
    }

    const baseUrlGame = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';
    try {
      const profitResponse = await fetch(`${baseUrlGame}/api/Table/report/dashboard`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('magic_token')}` } });
      if(profitResponse.ok) {
        const profitData = await profitResponse.json();
        adminData.value.clubProfit = profitData.clubProfit;
      }
      
      const tablesResponse = await fetch(`${baseUrlGame}/api/Table/report/tables`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('magic_token')}` } });
      if(tablesResponse.ok) {
        const allTables = await tablesResponse.json();
        
        tablesReport.value = allTables.filter((t: any) => {
          const nameUpper = (t.name || t.Name || '').toUpperCase();
          const isDemo = t.isDemo === true || t.IsDemo === true || t.is_demo === true || nameUpper.includes('TREINO') || nameUpper.includes('DEMO');
          return !isDemo; 
        });
      }
    } catch (e) {
      console.error("Erro no Fetch de Rake:", e);
    }
  } catch (error) {
    console.error("Erro ao buscar dados do painel admin", error);
  } finally {
    isLoading.value = false;
  }
};

const aceitarJogador = async (playerId: string) => {
  isProcessingAction.value = true;
  try {
    const token = localStorage.getItem('magic_token');
    const IDENTITY_API_URL = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';
    
    const response = await fetch(`${IDENTITY_API_URL}/api/admin/accept-player/${playerId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
        await carregarDados(); 
        mostrarAlerta("Sucesso", "Jogador aprovado e vinculado pelo Diretor com sucesso!"); 
    } else {
        const err = await response.json().catch(() => ({}));
        mostrarAlerta("Erro", err.message || "Erro ao aprovar jogador.");
    }
  } catch (error) {
    mostrarAlerta("Erro", "Erro na conexão com o servidor.");
  } finally {
    isProcessingAction.value = false;
  }
};

const rejeitarJogador = async (playerId: string) => {
  if (!confirm("Tem certeza que deseja rejeitar essa solicitação?")) return;
  
  isProcessingAction.value = true;
  try {
    const token = localStorage.getItem('magic_token');
    const IDENTITY_API_URL = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';
    
    const response = await fetch(`${IDENTITY_API_URL}/api/admin/reject-player/${playerId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
        await carregarDados(); 
        mostrarAlerta("Sucesso", "Solicitação rejeitada com sucesso.");
    } else {
        mostrarAlerta("Erro", "Erro ao rejeitar a solicitação.");
    }
  } catch (error) {
    console.error(error);
  } finally {
    isProcessingAction.value = false;
  }
};

const abrirModalDetalhesMesa = async (table: any) => {
  selectedTable.value = table;
  showTableDetailsModal.value = true;
  isLoadingTableDetails.value = true;
  tablePlayersReport.value = [];
  
  const baseUrl = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';
  try {
    const response = await fetch(`${baseUrl}/api/Table/report/tables/${table.tableId}/players`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('magic_token')}` } });
    if (response.ok) tablePlayersReport.value = await response.json();
  } catch (error) {
    console.error("Erro ao buscar detalhes", error);
  } finally {
    isLoadingTableDetails.value = false;
  }
};

const getPlayerName = (id: string) => {
  const user = membersList.value.find(u => u.id === id || u.userId === id);
  return user ? user.username : "ID: " + id.substring(0, 8);
};

const financeForm = reactive({ amount: '' });

const confirmarTransferenciaAba = async () => {
  transferError.value = '';
  const valorNum = parseFloat(financeForm.amount);
  if (valorNum <= 0 || isNaN(valorNum)) {
    transferError.value = "Preencha um valor válido.";
    return;
  }

  isProcessing.value = true;
  const ownerUsername = localStorage.getItem('magic_username') || '';

  try {
    if (financeAction.value === 'emit') {
      await adminService.globalTransfer(ownerUsername, valorNum, 'agent');
      mostrarAlerta("Sucesso", `<strong>🪙 ${formatCurrency(valorNum)}</strong> em fichas foram geradas com sucesso!`);
    } else {
      const ownerData = membersList.value.find(a => a.username === ownerUsername && a.isAgent);
      if (ownerData && ownerData.agentBalance < valorNum) {
         transferError.value = "Saldo insuficiente no Banco de Fichas para efetuar este recolhimento.";
         isProcessing.value = false; return;
      }
      await adminService.globalWithdraw(ownerUsername, valorNum, 'agent');
      mostrarAlerta("Sucesso", `<strong>🪙 ${formatCurrency(valorNum)}</strong> em fichas foram recolhidas (queimadas)!`);
    }
    
    financeForm.amount = '';
    await carregarDados(); 
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
  if (valorNum <= 0 || isNaN(valorNum)) { modalError.value = "Valor inválido."; return; }

  isProcessing.value = true;
  modalError.value = '';
  const pName = selectedPlayerObj.value.username;
  const ownerUsername = localStorage.getItem('magic_username') || '';

  try {
    const ownerData = membersList.value.find(a => a.username === ownerUsername && a.isAgent);

    if (transactionType.value === 'send') {
      if (!ownerData || ownerData.agentBalance < valorNum) {
         modalError.value = "Você não tem fichas suficientes no Banco do Clube.";
         isProcessing.value = false; return;
      }
      await adminService.globalWithdraw(ownerUsername, valorNum, 'agent');
      await adminService.globalTransfer(pName, valorNum, targetWallet.value);
      transactionSuccess.value = true;
    } else {
      const saldoAtual = targetWallet.value === 'agent' ? selectedPlayerObj.value.agentBalance : selectedPlayerObj.value.balance;
      if (valorNum > saldoAtual) {
        modalError.value = "O usuário não tem todo esse saldo para ser recolhido.";
        isProcessing.value = false; return;
      }
      await adminService.globalWithdraw(pName, valorNum, targetWallet.value);
      await adminService.globalTransfer(ownerUsername, valorNum, 'agent');
      transactionSuccess.value = true;
    }
    await carregarDados();
  } catch (error: any) {
    modalError.value = error.message;
  } finally {
    isProcessing.value = false;
  }
};

const voltar = () => router.push('/lobby');
onMounted(() => carregarDados());
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
.text-neon-purple { color: #a855f7; text-shadow: 0 0 10px rgba(168, 85, 247, 0.6); }

.neon-badge-emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); box-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }
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

.table-card { padding: 20px 0; }
.table-header { padding: 0 20px 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
.badge-count { padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; }
.table-responsive { overflow-x: auto; width: 100%; padding: 0 10px; }
.players-table { width: 100%; border-collapse: collapse; min-width: 400px; }
.players-table td { padding: 16px 10px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; vertical-align: middle; }
.table-row-hover:hover td { background: rgba(255,255,255,0.03); }
.player-cell { display: flex; align-items: center; gap: 12px; }

.player-info-flex { display: flex; flex-direction: column; gap: 2px; }
.status-banned-text { font-size: 10px; color: #ef4444; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
.player-id-small { font-size: 9px; color: #6b7280; line-height: 1; margin-top: 2px; font-family: monospace; text-transform: uppercase; }

.avatar-image-container { width: 36px; height: 36px; border-radius: 50%; display: flex; justify-content: center; align-items: center; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

.border-gold { border: 2px solid #fbbf24; }

.cell-actions { vertical-align: middle; padding-right: 15px; }
.action-buttons-wrapper { display: flex; justify-content: flex-end; align-items: center; gap: 8px; width: 100%; }

.btn-action-rocket { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b; padding: 8px 10px; border-radius: 8px; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-action-rocket:hover { background: rgba(245, 158, 11, 0.2); }

.btn-action-manage { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; padding: 8px 14px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s; text-transform: uppercase; }
.btn-action-manage:hover { background: rgba(59, 130, 246, 0.2); }

.btn-action-delete { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 8px 10px; border-radius: 8px; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-action-delete:hover { background: rgba(239, 68, 68, 0.2); }

.btn-action-reactivate { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; padding: 8px 10px; border-radius: 8px; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-action-reactivate:hover { background: rgba(16, 185, 129, 0.2); }

.icon-transfer { width: 16px; height: 16px; flex-shrink: 0; min-width: 16px; min-height: 16px; }
.icon-sm { width: 18px; height: 18px; flex-shrink: 0; }

.pagination-controls { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-top: 1px solid rgba(255,255,255,0.05); }
.page-btn { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; padding: 8px 16px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.2s; text-transform: uppercase; font-size: 11px;}
.page-btn:hover:not(:disabled) { background: rgba(59, 130, 246, 0.2); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; border-color: rgba(255,255,255,0.1); color: #94a3b8; }
.page-info { color: #94a3b8; font-size: 12px; font-weight: bold; }

.finance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 0 10px; }
.admin-form .input-group { display: flex; flex-direction: column; gap: 6px; }
.admin-form label { font-size: 10px; color: #cbd5e1; font-weight: 800; text-transform: uppercase; }
.glass-input { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 12px; border-radius: 8px; outline: none; transition: 0.3s; font-size: 14px;}
.glass-input:focus { border-color: #ef4444; }

.search-input-transparent { background: transparent; border: none; color: white; outline: none; font-size: 13px; font-family: inherit; font-weight: 600; }
.search-input-transparent::placeholder { color: #64748b; font-weight: normal; }

.locked-input { opacity: 0.6; cursor: not-allowed; border-color: transparent !important; }

.btn-primary { width: 100%; padding: 12px; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 13px; cursor: pointer; transition: 0.3s;}

.activity-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;}
.activity-list li { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; font-size: 12px; color: #cbd5e1; border-left: 2px solid #f59e0b;}

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; box-sizing: border-box; backdrop-filter: blur(5px); }
.modal-box { background: linear-gradient(to bottom, #1f2937, #111827); border: 1px solid #374151; border-radius: 16px; padding: 0; width: 100%; max-width: 380px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); overflow: hidden; animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

.custom-confirm-box, .custom-alert-box { padding: 24px; text-align: center; }

.alert-icon { width: 50px; height: 50px; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 15px auto; }
.alert-icon svg { width: 28px; height: 28px; }

.bg-emerald-light { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); }
.bg-gold-light { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); }
.bg-red-light { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); }

.bg-gold { background: linear-gradient(to bottom, #f59e0b, #b45309); box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3); color: white;}
.bg-gold:hover { filter: brightness(1.1); }

.btn-confirm-full { width: 100%; padding: 12px; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 13px; cursor: pointer; background: #374151; color: white; border: none; transition: background 0.2s; }
.btn-confirm-full:hover { background: #4b5563; }

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
.btn-cancel { flex: 1; background: transparent; border: 1px solid #666; color: #bbb; padding: 12px; border-radius: 8px; font-weight: 900; font-size: 13px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
.btn-cancel:hover { background: #333; color: #fff; }

.btn-confirm-action { flex: 1; border: none; color: white; padding: 14px; border-radius: 8px; font-weight: 900; font-size: 14px; text-transform: uppercase; cursor: pointer; transition: 0.2s;}
.bg-send { background: linear-gradient(to bottom, #10b981, #047857); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }
.bg-withdraw { background: linear-gradient(to bottom, #ef4444, #b91c1c); box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); }
.btn-confirm-action:disabled, .btn-confirm:disabled { background: #374151; color: #9ca3af; cursor: not-allowed; box-shadow: none; border-color: #374151;}

.error-msg { color: #ef4444; font-size: 12px; font-weight: bold; margin-bottom: 15px; text-align: center;}
.success-screen { padding: 40px 20px; text-align: center; }
.success-icon-wrapper { width: 80px; height: 80px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); display: flex; justify-content: center; align-items: center; margin: 0 auto; border: 2px solid #10b981; }
.success-check { width: 40px; height: 40px; color: #10b981; }
.success-details { color: #d1d5db; font-size: 14px; line-height: 1.5; margin-top: 15px; }

.toggle-list { display: flex; flex-direction: column; gap: 15px; }
.toggle-item { display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.05); }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; margin: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #374151; transition: .4s; border-radius: 24px; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }

input:checked + .slider.slider-purple { background-color: #a855f7; box-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }
input:checked + .slider.slider-purple:before { transform: translateX(20px); }

input:checked + .slider.slider-blue { background-color: #00f3ff; box-shadow: 0 0 10px rgba(0, 243, 255, 0.5); }
input:checked + .slider.slider-blue:before { transform: translateX(20px); }

@media (max-width: 480px) {
  .hidden-mobile { display: none !important; }
  .btn-action-manage { width: 34px; height: 34px; padding: 0; border-radius: 8px; }
  .btn-action-rocket { width: 34px; height: 34px; padding: 0; border-radius: 8px; }
  .btn-action-delete, .btn-action-reactivate { width: 34px; height: 34px; padding: 0; border-radius: 8px; }
  .players-table td { padding: 12px 6px; }
  .avatar-image-container { width: 28px; height: 28px; }
}
</style>