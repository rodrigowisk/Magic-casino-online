<template>
  <div class="main-wrapper" ref="wrapperRef">
    <div class="game-container" :style="{ transform: `translate(-50%, -50%) scale(${gameScale})` }">
      
      <div ref="pixiContainer" class="pixi-canvas"></div>
      <div class="table-neon-aura"></div>

      <div class="leave-warning" v-if="isWaitingToLeave">
        <span>Você levantará ao fim da rodada</span>
        <button @click="cancelLeaveNextHand">CANCELAR</button>
      </div>

      <button class="hud-btn hud-top-left" @click="clicouMenu" title="Menu">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <button class="hud-btn hud-top-right" @click="clicouEstatisticas" title="Estatísticas">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 20V10"></path>
          <path d="M12 20V4"></path>
          <path d="M6 20v-6"></path>
        </svg>
      </button>

      <button class="hud-btn hud-bottom-left" @click="clicouVerMaos" title="Histórico de Mãos">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="6" width="14" height="16" rx="2" ry="2"></rect>
          <path d="M22 18V4a2 2 0 0 0-2-2H8"></path>
        </svg>
      </button>
      
      <div class="winner-banner" v-if="winnerName">
        <h2>🏆 BATEU! 🏆</h2>
        <p>O jogador <strong>{{ winnerName }}</strong> venceu a rodada!</p>
      </div>

      <div class="furou-banner" v-if="furouData">
        <h2>❌ FUROU! ❌</h2>
        <p>O jogador <strong>{{ furouData.name }}</strong> bateu errado!</p>
      </div>

      <div class="ui-layer">
        <div class="controls-wrapper" v-if="gameState.phase === 'betting' && !isDealing && !isAnimating && gameState.players[gameState.currentTurn]?.isHero && gameState.players[gameState.currentTurn]?.status === 'playing'">
          <CachetaControls 
            :hasDrawnThisTurn="gameState.players[gameState.currentTurn].hasDrawnThisTurn"
            :canDrawFromDiscard="gameState.discardPile.length > 0"
            :selectedCard="selectedCardToDiscard"
            :hasFurou="gameState.players[gameState.currentTurn].hasFurou"
            @draw="(fromDiscard) => cachetaHub.drawCard(fromDiscard)"
            @discard="(cardStr) => {
              cachetaHub.discardCard(cardStr);
              selectedCardToDiscard = null;
            }"
            @declareWin="(cardStr) => {
              cachetaHub.declareWin(cardStr);
              selectedCardToDiscard = null;
            }"
          />
        </div>

        <div class="next-round-wrapper" v-if="gameState.phase === 'waiting' && heroPlayerInfo?.isSeated && heroPlayerInfo?.status === 'waiting' && !showRebuyModal && !showBuyInModal">
          <button class="btn-continuar" @click="prontaParaProxima">
            <span class="pulse-icon">✅</span> CONTINUAR JOGANDO
          </button>
        </div>
      </div>

      <BuyInModal 
        v-if="showBuyInModal"
        :minBet="gameState.minBet"
        :minBuyIn="gameState.tableMinBuyIn" 
        :rake="gameState.rake"
        :expiresAt="gameState.expiresAt"
        :maxBalance="modalMaxBalance"
        @cancel="cancelBuyIn"
        @confirm="invokeBuyIn"
      />

      <RebuyModal 
        v-if="showRebuyModal"
        :minBuyIn="gameState.tableMinBuyIn"
        :maxBalance="userTotalBalance"
        @cancel="handleRebuyCancel"
        @confirm="invokeRebuy"
      />

      <MeinhoMenu 
        v-if="showMenuModal"
        :animEnabled="animModeEnabled"
        @close="showMenuModal = false"
        @leave="handleMenuLeave"
        @lobby="handleLobby"
        @rules="handleMenuRules"
        @settings="handleMenuSettings"
        @toggleAnimation="handleToggleAnimation"
      />

      <HandHistoryModal 
        v-if="showHandHistoryModal"
        :isOpen="showHandHistoryModal"
        @update:isOpen="showHandHistoryModal = $event"
        :history="sessionHandHistory"
        :currentUserId="currentUserId"
      />

      <TableStatsModal 
        v-if="showStatsModal"
        :isOpen="showStatsModal"
        :players="gameState.players"
        @update:isOpen="showStatsModal = $event"
      />

    </div>

    <div class="table-id-footer">
      ID da Mesa: {{ tableId }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router'; 

import { CachetaPixiEngine } from '../../Game/Cacheta/CachetaPixiEngine';
import { useCachetaHub } from '../../composables/useCachetaHub';

import CachetaControls from './CachetaControls.vue'; 
import BuyInModal from '../../components/Meinho/BuyInModal.vue'; 
import RebuyModal from '../../components/Meinho/RebuyModal.vue';
import MeinhoMenu from '../../components/Meinho/MeinhoMenu.vue';
import HandHistoryModal from '../../components/Meinho/HandHistoryModal.vue'; 
import TableStatsModal from '../../components/Meinho/TableStatsModal.vue'; 

import deckImg from '../../assets/imagens/deck.webp';
import tableImgAsset from '../../assets/imagens/table-decks1.webp';

const route = useRoute();
const router = useRouter(); 
const tableId = route.params.id as string;

const GAME_WIDTH = 430;
const GAME_HEIGHT = 900;
const gameScale = ref(1);
const wrapperRef = ref<HTMLElement | null>(null);

const isWaitingToLeave = ref(false);

const currentUserId = String(localStorage.getItem('magic_userid') || '').trim();
const currentUserName = String(localStorage.getItem('magic_username') || '').trim();
const currentAvatar = String(localStorage.getItem('magic_avatar') || 'default.webp').trim();

const sessionStartTime = ref<string | null>(null);
const userTotalBalance = ref(0); 
const myLastChips = ref(0);

const showBuyInModal = ref(false);
const pendingSitSeat = ref(-1);

const showRebuyModal = ref(false);
const showMenuModal = ref(false);
const showStatsModal = ref(false);

const showHandHistoryModal = ref(false);
const sessionHandHistory = ref<any[]>([]); 

const animModeEnabled = ref(localStorage.getItem('magic_anim_enabled') !== '0'); 

const selectedCardToDiscard = ref<string | null>(null);
const winnerName = ref<string | null>(null);
const furouData = ref<{ seat: number, name: string, cards: string[] } | null>(null);

const isDealing = ref(false); 
const isAnimating = ref(false); 
let pendingState: any = null;

const pixiContainer = ref<HTMLElement | null>(null);

const avatarImages: Record<string, string> = import.meta.glob('../../assets/imagens/avatars/**/*.webp', { eager: true, import: 'default' });

const getAvatarUrl = (filename: string | undefined) => {
  const safeFilename = filename || 'default.webp';
  const path = `../../assets/imagens/avatars/${safeFilename}`;
  return avatarImages[path] || avatarImages['../../assets/imagens/avatars/default.webp'];
};

interface Player {
  userId?: string;
  connectionId?: string;
  seat: number; 
  name: string; 
  chips: number; 
  totalBuyIn: number; 
  totalCashOut: number; 
  lastChips: number; 
  isHero: boolean; 
  status: 'waiting' | 'playing' | 'out' | 'done' | 'ready';
  isSeated: boolean; 
  hasDrawnThisTurn: boolean; 
  hasFurou: boolean;
  avatar?: string; 
  uiCards?: any[]; 
  x?: number; y?: number; 
  serverCards?: string[]; 
}

interface GameState {
  phase: 'waiting' | 'dealing' | 'betting' | 'resolving';
  pot: number; 
  minBet: number; 
  currentTurn: number; 
  players: Player[];
  viraCard: string;       
  discardPile: string[];   
  stockPileCount: number;  
  turnTimeLeft: number; 
  maxPlayers: number; 
  rake: number; 
  tableMinBuyIn: number; 
  tableName: string; 
  expiresAt: string; 
}

const gameState = reactive<GameState>({
  phase: 'waiting', 
  pot: 0, 
  minBet: 10, 
  currentTurn: -1, 
  turnTimeLeft: 0, 
  maxPlayers: 0, 
  rake: 0, 
  tableMinBuyIn: 100, 
  tableName: '', 
  expiresAt: '',
  viraCard: '',
  discardPile: [],
  stockPileCount: 0,
  players: []
});

const modalMaxBalance = computed(() => {
    if (myLastChips.value > 0 && myLastChips.value < gameState.tableMinBuyIn) {
        return gameState.tableMinBuyIn; 
    }
    return userTotalBalance.value;
});

const heroPlayerInfo = computed(() => gameState.players.find(p => p.isHero));
const myLogicalSeatOffset = ref(0);

watch(() => gameState.phase, (newPhase, oldPhase) => {
    if (newPhase === 'resolving') {
        const possibleWinner = gameState.players.find(p => p.isSeated && p.status === 'playing' && p.serverCards && p.serverCards.length >= 9);
        if (possibleWinner) {
            winnerName.value = possibleWinner.name;
            setTimeout(() => { winnerName.value = null; }, 6000);
        }
    }
    if (newPhase === 'dealing') {
        winnerName.value = null;
        engine.resetBoardColors();
    }
    if (newPhase === 'waiting' && oldPhase !== 'waiting') {
        engine.resetBoardColors();
        winnerName.value = null;
        if (isWaitingToLeave.value) {
            invokeStandUp();
            isWaitingToLeave.value = false;
        }
    }
});

function calculateScale() {
  if (!wrapperRef.value) return;
  const winW = wrapperRef.value.clientWidth;
  const winH = wrapperRef.value.clientHeight;
  const safeW = winW - 12;
  const safeH = winH - 12;
  const scaleW = safeW / GAME_WIDTH;
  const scaleH = safeH / GAME_HEIGHT;
  gameScale.value = Math.min(scaleW, scaleH); 
}

function flushPendingState() {
  if (pendingState) {
      const state = pendingState;
      pendingState = null;
      applyState(state);
  }
}

async function fetchUserBalance() {
  if (!currentUserId) return;
  try {
      const IDENTITY_API_URL = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';
      const response = await fetch(`${IDENTITY_API_URL}/api/wallet/${currentUserId}/balance`);
      if (response.ok) {
          const data = await response.json();
          userTotalBalance.value = data.balance;
      }
  } catch(e) {
      console.error("Erro ao buscar saldo real na carteira:", e);
  }
}

const cachetaHub = useCachetaHub(tableId, currentUserId, currentUserName, currentAvatar, {
    onReceiveTableState: (serverState: any) => syncTable(serverState),
    onWalletBalanceUpdated: (newBalance: number) => {
        userTotalBalance.value = newBalance;
    },
    onPlayerFurou: (data: any) => {
        furouData.value = data;
        
        const visualSeat = (data.seat - myLogicalSeatOffset.value + gameState.maxPlayers) % gameState.maxPlayers;
        engine.showFurouCards(visualSeat, data.cards);
        
        setTimeout(() => {
            furouData.value = null;
            engine.clearFurouCards();
        }, 4000);
    }
});

function prontaParaProxima() {
  if (typeof cachetaHub.readyForNextRound === 'function') {
    cachetaHub.readyForNextRound();
  }
}

function handleRebuyCancel() {
    showRebuyModal.value = false;
    invokeStandUp(); 
}

const engine = new CachetaPixiEngine(gameState, {
    setDealing: (v) => isDealing.value = v,
    setAnimating: (v) => isAnimating.value = v,
    flushPendingState: () => flushPendingState(),
    onCardSelected: (cardStr: string | null) => {
        selectedCardToDiscard.value = cardStr;
    },

    onHandReordered: (newOrder) => {
        cachetaHub.reorderHand(newOrder);
    },

    sitDown: async (visualSeatIndex: number) => {
        if (gameState.players.some(p => p.isHero && p.isSeated)) return;
        
        const logicalSeat = (visualSeatIndex + myLogicalSeatOffset.value) % (gameState.maxPlayers || 6);
        
        await fetchUserBalance();
        
        const minBuyIn = gameState.tableMinBuyIn;

        if (myLastChips.value >= minBuyIn) {
            cachetaHub.sitDown(logicalSeat, myLastChips.value).then(() => {
                fetchUserBalance();
                if (!sessionStartTime.value) {
                    sessionStartTime.value = new Date().toISOString(); 
                }
            }).catch(e => console.error("Erro ao sentar automaticamente:", e));
            return;
        }

        pendingSitSeat.value = logicalSeat;
        showBuyInModal.value = true;
    }
});

function invokeBuyIn(amount: number) {
    if (pendingSitSeat.value !== -1 && amount > 0) {
        const seatToSit = pendingSitSeat.value; 
        showBuyInModal.value = false;
        pendingSitSeat.value = -1;
        cachetaHub.sitDown(seatToSit, amount).then(() => {
            fetchUserBalance();
            sessionStartTime.value = new Date().toISOString();
        }).catch(e => console.error("Erro ao sentar:", e));
    }
}

function cancelBuyIn() {
    showBuyInModal.value = false;
    pendingSitSeat.value = -1;
}

function applyState(serverState: any) {
  const oldPhase = gameState.phase;

  const serverMaxPlayers = Number(serverState.maxPlayers || serverState.MaxPlayers || 6);

  if (gameState.maxPlayers !== serverMaxPlayers) {
      gameState.maxPlayers = serverMaxPlayers;
      
      while (gameState.players.length > serverMaxPlayers) gameState.players.pop();
      while (gameState.players.length < serverMaxPlayers) {
          gameState.players.push({ 
            seat: gameState.players.length, 
            name: "Livre", chips: 0, totalBuyIn: 0, totalCashOut: 0, lastChips: 0, 
            isHero: false, status: 'waiting', isSeated: false, hasDrawnThisTurn: false, hasFurou: false 
          });
      }
      
      engine.buildSeats(serverMaxPlayers);
  }

  const normPlayers = (serverState.players || serverState.Players || []).map((p: any) => {
      let tBuyIn = Number(p.totalBuyIn ?? p.TotalBuyIn ?? 0);
      let tCashOut = Number(p.totalCashOut ?? p.TotalCashOut ?? 0);
      let tLastChips = Number(p.lastChips ?? p.LastChips ?? 0);

      // 👇 TRAVA DE MEMÓRIA VISUAL: Impede o backend de esmagar sua organização manual 👇
      let sCards = p.cards || p.Cards || [];
      if (currentUserId && (String(p.userId) === currentUserId || String(p.UserId) === currentUserId)) {
          const existingHero = gameState.players.find((ep: any) => ep.userId === currentUserId);
          if (existingHero && existingHero.serverCards) {
              const oldSorted = [...existingHero.serverCards].sort().join(',');
              const newSorted = [...sCards].sort().join(',');
              
              if (oldSorted === newSorted && oldSorted.length > 0) {
                  sCards = [...existingHero.serverCards]; // Copia do jeito exato que estava antes
              }
          }
      }

      return {
          userId: String(p.userId || p.UserId || ''),
          connectionId: String(p.connectionId || p.ConnectionId || ''),
          name: String(p.name || p.Name || 'Livre'),
          isSeated: !!(p.isSeated || p.IsSeated),
          seat: p.seat !== undefined ? p.seat : (p.Seat !== undefined ? p.Seat : -1),
          chips: p.chips !== undefined ? p.chips : (p.Chips !== undefined ? p.Chips : 0),
          totalBuyIn: tBuyIn,
          totalCashOut: tCashOut,
          lastChips: tLastChips,
          cards: sCards, // Usa as cartas arrumadas ou as que vieram mesmo
          status: String(p.status || p.Status || 'waiting').toLowerCase(),
          avatar: String(p.avatar || p.Avatar || 'default.webp'),
          hasDrawnThisTurn: !!(p.hasDrawnThisTurn || p.HasDrawnThisTurn),
          hasFurou: !!(p.hasFurou || p.HasFurou)
      };
  });

  const rawTurnTimeLeft = serverState.turnTimeLeft ?? serverState.TurnTimeLeft ?? 0;
  
  const normState = {
      phase: String(serverState.phase || serverState.Phase || 'waiting').toLowerCase(),
      pot: Number(serverState.pot !== undefined ? serverState.pot : (serverState.Pot || 0)),
      minBet: Number(serverState.minBet !== undefined ? serverState.minBet : (serverState.MinBet || 10)),
      currentTurnSeat: Number(serverState.currentTurnSeat !== undefined ? serverState.currentTurnSeat : (serverState.CurrentTurnSeat ?? -1)),
      viraCard: String(serverState.viraCard || serverState.ViraCard || ''), 
      discardPile: Array.isArray(serverState.discardPile || serverState.DiscardPile) ? (serverState.discardPile || serverState.DiscardPile) : [], 
      stockPileCount: Number(serverState.stockPileCount ?? serverState.StockPileCount ?? 0), 
      turnTimeLeft: Number(rawTurnTimeLeft),
      players: normPlayers
  };

  let heroPlayer = null;

  if (currentUserId) {
      heroPlayer = normState.players.find((p: any) => p.isSeated && p.userId === currentUserId);
      const historicalMe = normState.players.find((p: any) => p.userId === currentUserId);
      if (historicalMe) myLastChips.value = historicalMe.lastChips;
  }

  if (!heroPlayer) {
      const myConnId = cachetaHub.getConnectionId();
      if (myConnId) {
          heroPlayer = normState.players.find((p: any) => p.isSeated && p.connectionId === myConnId);
      }
  }

  if (heroPlayer) {
      myLogicalSeatOffset.value = heroPlayer.seat;
      if (!sessionStartTime.value) sessionStartTime.value = new Date().toISOString(); 
  } else {
      isWaitingToLeave.value = false;
  }

  engine.updateHeroSeatStatus(!!heroPlayer);

  const futureOccupied = new Set();
  normState.players.forEach((p: any) => {
    if (p.isSeated && p.seat >= 0 && p.seat < gameState.maxPlayers) {
      const visualSeat = (p.seat - myLogicalSeatOffset.value + gameState.maxPlayers) % gameState.maxPlayers;
      futureOccupied.add(visualSeat);
    }
  });

  for (let i = 0; i < gameState.maxPlayers; i++) {
    const player = gameState.players[i];
    
    if (player) {
      if (player.isSeated && !futureOccupied.has(i)) {
        player.serverCards = [];
        player.uiCards = [];
      }

      player.isSeated = false;
      player.name = `Livre`;
      player.isHero = false;
      player.totalBuyIn = 0;
      player.totalCashOut = 0;
      player.lastChips = 0;
      player.userId = undefined;
      player.hasDrawnThisTurn = false;
      player.hasFurou = false;
      player.avatar = 'default.webp'; 
    }
    engine.updatePlayerSeat(i, false, "Livre", 0, 'waiting', getAvatarUrl('default.webp'));
  }

  normState.players.forEach((p: any) => {
    if (p.isSeated && p.seat >= 0 && p.seat < gameState.maxPlayers) {
      const visualSeat = (p.seat - myLogicalSeatOffset.value + gameState.maxPlayers) % gameState.maxPlayers;
      const player = gameState.players[visualSeat];
      
      if (player) {
        player.isSeated = true;
        player.name = p.name;
        player.chips = p.chips;
        player.totalBuyIn = p.totalBuyIn; 
        player.totalCashOut = p.totalCashOut; 
        player.lastChips = p.lastChips;
        player.isHero = heroPlayer ? (p.seat === heroPlayer.seat) : false;
        player.serverCards = p.cards; 
        player.userId = p.userId;
        player.connectionId = p.connectionId;
        player.status = p.status as any;
        player.avatar = p.avatar;
        player.hasDrawnThisTurn = p.hasDrawnThisTurn; 
        player.hasFurou = p.hasFurou;
      }
      
      const resolvedAvatarUrl = getAvatarUrl(p.avatar);
      engine.updatePlayerSeat(visualSeat, true, p.name, p.chips, p.status, resolvedAvatarUrl);
    }
  });

  gameState.pot = normState.pot;
  gameState.minBet = normState.minBet;
  gameState.viraCard = normState.viraCard;
  gameState.discardPile = normState.discardPile;
  gameState.stockPileCount = normState.stockPileCount;
  gameState.turnTimeLeft = normState.turnTimeLeft;
  gameState.rake = Number(serverState.rake !== undefined ? serverState.rake : (serverState.Rake || 0));
  gameState.tableMinBuyIn = Number(serverState.minBuyIn !== undefined ? serverState.minBuyIn : (serverState.MinBuyIn || 100));
  gameState.tableName = String(serverState.name || serverState.Name || 'MESA DE CACHETA');
  gameState.expiresAt = String(serverState.expiresAt || serverState.ExpiresAt || '');

  if (heroPlayer && heroPlayer.isSeated && heroPlayer.chips <= 0 && heroPlayer.status !== 'playing') {
      fetchUserBalance().then(() => showRebuyModal.value = true);
  } else {
      showRebuyModal.value = false;
  }

  let newVisualTurn = -1;
  if (normState.currentTurnSeat !== -1) {
      newVisualTurn = (normState.currentTurnSeat - myLogicalSeatOffset.value + gameState.maxPlayers) % gameState.maxPlayers;
  }

  const needsDealing = gameState.players.some(p => 
      p.isHero && p.isSeated && p.status === 'playing' && p.serverCards && p.serverCards.length > 0 && (!p.uiCards || p.uiCards.length === 0)
  );

  if (needsDealing) {
    gameState.phase = normState.phase as any;
    if(animModeEnabled.value) engine.startGameAutomatically();
  } else if (normState.phase !== 'dealing') {
    gameState.phase = normState.phase as any;
  }

  if (normState.phase === 'waiting' && oldPhase !== 'waiting') {
    engine.clearDealtCards();
    gameState.players.forEach(p => p.uiCards = []);
  }

  if (gameState.phase === 'betting' && newVisualTurn !== -1) {
      if (newVisualTurn !== gameState.currentTurn || oldPhase !== 'betting') {
          gameState.currentTurn = newVisualTurn;
          const timeToStart = normState.turnTimeLeft > 0 ? normState.turnTimeLeft : 60;
          engine.startTimer(newVisualTurn, timeToStart);
      }
  } else{
      gameState.currentTurn = -1;
      engine.stopTimer();
  }

  if (gameState.phase !== 'waiting') {
      engine.syncBoard();
  }
}

function syncTable(serverState: any) {
  if (isAnimating.value) { pendingState = serverState; return; }
  applyState(serverState);
}

function invokeRebuy(amount: number) {
    if (amount > 0) {
        cachetaHub.rebuy(amount).then(() => {
            showRebuyModal.value = false;
            fetchUserBalance(); 
        });
    }
}

function invokeStandUp() {
    isWaitingToLeave.value = false; 
    if (cachetaHub.setLeaveNextHand) cachetaHub.setLeaveNextHand(false); 
    
    cachetaHub.standUp().then(() => {
        showRebuyModal.value = false;
        fetchUserBalance();
        sessionStartTime.value = null; 
    }).catch(e => console.error("Erro ao levantar:", e));
}

function clicouMenu() { showMenuModal.value = true; }
function clicouEstatisticas() { showStatsModal.value = true; }

async function clicouVerMaos() { 
  try {
      const CACHETA_API_URL = import.meta.env.VITE_CACHETA_API_URL || 'http://localhost:5003';
      const response = await fetch(`${CACHETA_API_URL}/api/handhistory/${tableId}`);
      if (response.ok) {
          const data = await response.json();
          sessionHandHistory.value = data;
      }
  } catch(e) {
      console.error("Erro ao buscar mãos:", e);
  }
  showHandHistoryModal.value = true; 
}

function handleMenuLeave() { 
    showMenuModal.value = false; 
    const hero = gameState.players.find(p => p.isHero && p.isSeated);
    if (hero && hero.status === 'playing' && gameState.phase !== 'waiting') {
        isWaitingToLeave.value = true; 
        if (cachetaHub.setLeaveNextHand) cachetaHub.setLeaveNextHand(true); 
    } else {
        invokeStandUp(); 
    }
}

function cancelLeaveNextHand() {
    isWaitingToLeave.value = false;
    if (cachetaHub.setLeaveNextHand) cachetaHub.setLeaveNextHand(false); 
}

function handleLobby() {
    showMenuModal.value = false;
    router.push('/lobby-cacheta');
}
function handleMenuRules() { showMenuModal.value = false; }
function handleMenuSettings() { showMenuModal.value = false; }

function handleToggleAnimation(enabled: boolean) { 
  animModeEnabled.value = enabled; 
  localStorage.setItem('magic_anim_enabled', enabled ? '1' : '0');
}

onMounted(async () => {
  calculateScale();
  window.addEventListener('resize', calculateScale);

  await fetchUserBalance();

  if (pixiContainer.value) {
    try {
        await engine.init(
            pixiContainer.value, GAME_WIDTH, GAME_HEIGHT, getAvatarUrl('default.webp'), deckImg, tableImgAsset
        );
    } catch(e) { console.error(e); }
  }
  await cachetaHub.connect();
});

onUnmounted(() => {
  window.removeEventListener('resize', calculateScale);
  cachetaHub.disconnect();
  engine.destroy();
});
</script>

<style scoped>
.main-wrapper { position: relative; width: 100vw; min-height: 100vh; min-height: 100dvh; background-color: #000; box-sizing: border-box; background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%); overflow: hidden; }
.game-container { position: absolute; top: 50%; left: 50%; width: 430px; height: 900px; transform-origin: center center; border-radius: 20px; overflow: hidden; border: 2px solid #a855f7; box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.4); background-color: #1a2639; }
.pixi-canvas { position: absolute; top: 0; left: 0; width: 430px; height: 900px; z-index: 2; pointer-events: auto !important; }
.table-neon-aura { position: absolute; top: 0; left: 0; width: 430px; height: 900px; background: radial-gradient(ellipse at 50% 45%, rgba(0, 243, 255, 0.15) 0%, rgba(168, 85, 247, 0.15) 35%, transparent 65%); pointer-events: none !important; z-index: 3; mix-blend-mode: screen; }
.ui-layer { position: absolute; top: 0; left: 0; width: 430px; height: 900px; z-index: 300; pointer-events: none !important; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding: 40px 0 15px 0; box-sizing: border-box; }
.ui-layer > * { pointer-events: auto !important; }
.controls-wrapper { width: 100%; margin-bottom: 16px; display: flex; justify-content: center; }
.next-round-wrapper { width: 100%; margin-bottom: 25px; display: flex; justify-content: center; animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.btn-continuar { background: linear-gradient(135deg, #2ecc71, #27ae60); border: 2px solid #1e8449; color: white; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 900; cursor: pointer; box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4), inset 0px 2px 2px rgba(255,255,255,0.4); text-transform: uppercase; text-shadow: 1px 1px 3px rgba(0,0,0,0.8); display: flex; align-items: center; gap: 10px; transition: all 0.1s ease; }
.btn-continuar:active { transform: translateY(4px); box-shadow: 0 2px 10px rgba(46, 204, 113, 0.4); }
.pulse-icon { font-size: 18px; animation: pulseBater 1.5s infinite; }
.hud-btn { position: absolute; width: 46px; height: 46px; background: linear-gradient(135deg, rgba(20, 28, 45, 0.85), rgba(10, 15, 25, 0.95)); border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 12px; display: flex; justify-content: center; align-items: center; cursor: pointer; z-index: 50; box-shadow: 0 4px 15px rgba(0,0,0,0.6), inset 0 0 10px rgba(0, 243, 255, 0.1); backdrop-filter: blur(8px); transition: all 0.2s ease-in-out; padding: 0; outline: none; pointer-events: auto !important; }
.hud-btn:hover, .hud-btn:active { transform: scale(1.08) translateY(-2px); border-color: rgba(0, 243, 255, 0.8); box-shadow: 0 6px 20px rgba(0, 243, 255, 0.4), inset 0 0 15px rgba(0, 243, 255, 0.3); }
.hud-btn svg { width: 22px; height: 22px; stroke: #00f3ff; filter: drop-shadow(0 0 4px rgba(0, 243, 255, 0.8)); }
.hud-top-left { top: 20px; left: 20px; }
.hud-top-right { top: 20px; right: 20px; }
.hud-bottom-left { bottom: 20px; left: 20px; }
.table-id-footer { position: absolute; bottom: 8px; left: 0; width: 100%; text-align: center; color: rgba(255, 255, 255, 0.3); font-family: Arial, sans-serif; font-size: 11px; white-space: nowrap; pointer-events: none; z-index: 50; }
.leave-warning { position: absolute; top: 26px; left: 50%; transform: translateX(-50%); background: rgba(231, 76, 60, 0.95); border: 1px solid #ff7979; border-radius: 20px; padding: 6px 12px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4); z-index: 500; animation: slideDownFade 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); width: max-content; max-width: 250px; }
.leave-warning span { color: white; font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; white-space: nowrap; }
.leave-warning button { background: white; color: #e74c3c; border: none; border-radius: 8px; padding: 4px 8px; font-size: 9px; font-weight: 900; cursor: pointer; text-transform: uppercase; transition: transform 0.1s; }
.leave-warning button:active { transform: scale(0.9); }

@keyframes slideDownFade { 0% { transform: translate(-50%, -20px); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }

.winner-banner { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); background: rgba(10, 15, 25, 0.95); border: 2px solid #00f3ff; border-radius: 16px; padding: 20px 40px; text-align: center; z-index: 1000; box-shadow: 0 0 30px rgba(0, 243, 255, 0.5), inset 0 0 20px rgba(0, 243, 255, 0.3); animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.winner-banner h2 { color: #ffaa00; margin: 0 0 10px 0; font-size: 26px; font-weight: 900; text-shadow: 0 0 15px rgba(255, 170, 0, 0.8); }
.winner-banner p { color: white; font-size: 15px; margin: 0; }

.furou-banner {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(200, 20, 20, 0.95);
  border: 2px solid #ff4444;
  border-radius: 16px;
  padding: 15px 30px;
  text-align: center;
  z-index: 1000;
  box-shadow: 0 0 30px rgba(255, 0, 0, 0.6), inset 0 0 15px rgba(255, 0, 0, 0.4);
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.furou-banner h2 { color: #ffffff; margin: 0 0 5px 0; font-size: 24px; font-weight: 900; text-shadow: 0 0 10px rgba(255, 255, 255, 0.8); }
.furou-banner p { color: white; font-size: 14px; margin: 0; }

@keyframes popIn { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
</style>