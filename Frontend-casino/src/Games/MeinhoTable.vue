<template>
  <div class="main-wrapper" ref="wrapperRef">
    <div class="game-container" :style="{ transform: `translate(-50%, -50%) scale(${gameScale})` }">
      
      <GameLoading :visible="isAppLoading" />

      <div class="table-content-fader" :class="{ 'fade-in-content': !isAppLoading }">
        <div ref="pixiContainer" class="pixi-canvas"></div>
        <div class="table-neon-aura"></div>

        <div class="leave-warning" v-if="isWaitingToLeave">
          <span>Você levantará ao fim da mão</span>
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
        
        <div class="ui-layer">
          <div class="controls-wrapper" v-if="gameState.phase === 'betting' && !isDealing && !isAnimating && gameState.players[gameState.currentTurn]?.isHero && gameState.players[gameState.currentTurn]?.status === 'playing'">
            <BettingControls 
              :minBet="Math.min(gameState.minBet, gameState.pot, gameState.players[gameState.currentTurn]?.chips || gameState.minBet)"
              :maxBet="Math.min(gameState.pot, gameState.players[gameState.currentTurn]?.chips || gameState.pot)"
              @pular="invokeSkipBet"
              @apostar="invokeConfirmBet"
            />
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

        <MeinhoMenu 
          v-if="showMenuModal"
          :soundEnabled="soundModeEnabled"
          :peekEnabled="peekModeEnabled"
          :isSeated="isHeroSeated"
          @close="showMenuModal = false"
          @leave="handleMenuLeave"
          @lobby="handleLobby"
          @rules="handleMenuRules"
          @settings="handleMenuSettings"
          @toggleSound="handleToggleSound"
          @togglePeek="handleTogglePeek"
          @rebuy="handleMenuRebuy"
        />

        <transition name="fade-peeker">
          <MeinhoPeeker 
            v-if="showPeekerModal"
            class="peeker-safe-hide"
            :class="{ 'peeker-hidden': showRebuyModal || appAlertMessage !== '' }"
            ref="peekerRef"
            :cards="heroCards"
            @close="fecharPeekerERevelar"
          />
        </transition>

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

        <RebuyModal 
          v-if="showRebuyModal"
          :minBuyIn="gameState.tableMinBuyIn"
          :maxBalance="userTotalBalance"
          :currentChips="gameState.players.find(p => p.isHero)?.chips || 0"
          @cancel="cancelRebuyAction"
          @confirm="confirmRebuyAction"
        />

        <transition name="fade-alert">
          <div class="custom-alert-overlay" v-if="appAlertMessage" @click.self="appAlertMessage = ''">
            <div class="custom-alert-box">
              <div class="alert-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#3ce48a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3>Aviso</h3>
              <p v-html="appAlertMessage"></p>
              <button class="btn-confirm-full" @click="appAlertMessage = ''">OK</button>
            </div>
          </div>
        </transition>

      </div>
    </div>

    <div class="table-id-footer">
      ID da Mesa: {{ tableId }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router'; 

import GameLoading from '../components/Meinho/GameLoading.vue';

import { MeinhoPixiEngine } from '../Game/Meinho/MeinhoPixiEngine';
import { useGameHub } from '../composables/useGameHub';

import BettingControls from './BettingControls.vue'; 
import BuyInModal from '../components/Meinho/BuyInModal.vue'; 
import RebuyModal from '../components/Meinho/RebuyModal.vue';
import MeinhoMenu from '../components/Meinho/MeinhoMenu.vue';
import MeinhoPeeker from '../components/Meinho/MeinhoPeeker.vue'; 
import HandHistoryModal from '../components/Meinho/HandHistoryModal.vue'; 
import TableStatsModal from '../components/Meinho/TableStatsModal.vue'; 

import singleChipImg from '../assets/imagens/chip1.webp';
import potChipsImg from '../assets/imagens/chips.webp'; 
import deckImg from '../assets/imagens/deck.webp';
import tableImgAsset from '../assets/imagens/table-decks1.webp';

const route = useRoute();
const router = useRouter(); 
const tableId = route.params.id as string;

const GAME_WIDTH = 430;
const GAME_HEIGHT = 900;
const gameScale = ref(1);
const wrapperRef = ref<HTMLElement | null>(null);

const isAppLoading = ref(true);

const peekerRef = ref<any>(null);
const isDiscarding3D = ref(false);

const isWaitingToLeave = ref(false);

const currentUserId = String(localStorage.getItem('magic_userid') || '').trim();
const currentUserName = String(localStorage.getItem('magic_username') || '').trim();
const currentAvatar = String(localStorage.getItem('magic_avatar') || 'default.webp').trim();

const sessionStartTime = ref<string | null>(null);

const userTotalBalance = ref(0); 

const myLastChips = ref(0);

const showBuyInModal = ref(false);
const pendingSitSeat = ref(-1);
const expectedHeroLogicalSeat = ref(-1); 

const showRebuyModal = ref(false);
const isManualRebuy = ref(false);

const showMenuModal = ref(false);
const showPeekerModal = ref(false);

const showStatsModal = ref(false);

const showHandHistoryModal = ref(false);
const sessionHandHistory = ref<any[]>([]); 

const soundModeEnabled = ref(localStorage.getItem('magic_sound_enabled') !== '0'); 
const peekModeEnabled = ref(localStorage.getItem('magic_peek_enabled') !== '0'); 

const appAlertMessage = ref('');

const hasPeekedCurrentHand = ref(false); 
const hasManuallyRevealedCards = ref(false); 
const lastProcessedHandCards = ref(''); 
let peekTimeoutId: ReturnType<typeof setTimeout> | null = null;

const isDealing = ref(false); 
const isAnimating = ref(false); 
let pendingState: any = null;

const pixiContainer = ref<HTMLElement | null>(null);

const avatarImages: Record<string, string> = import.meta.glob('../assets/imagens/avatars/**/*.webp', { eager: true, import: 'default' });

const getAvatarUrl = (filename: string | undefined) => {
  const safeFilename = filename || 'default.webp';
  const path = `../assets/imagens/avatars/${safeFilename}`;
  return avatarImages[path] || avatarImages['../assets/imagens/avatars/default.webp'];
};

interface CardData { rank: string; suit: string; value: number; }
interface Player {
  userId?: string;
  connectionId?: string;
  seat: number; name: string; chips: number; cards: CardData[];
  totalBuyIn: number; 
  totalCashOut: number; 
  lastChips: number; 
  isHero: boolean; status: 'waiting' | 'playing' | 'out' | 'done';
  isSeated: boolean; 
  avatar?: string; 
  uiCards?: any[]; x?: number; y?: number; 
  serverCards?: string[]; 
}
interface GameState {
  phase: 'waiting' | 'dealing' | 'betting' | 'resolving';
  pot: number; minBet: number; currentTurn: number; players: Player[];
  centerCardStr?: string; 
  turnTimeLeft: number; 
  maxPlayers: number; 
  rake: number; 
  tableMinBuyIn: number; 
  tableName: string; 
  expiresAt: string; 
}

const gameState = reactive<GameState>({
  phase: 'waiting', pot: 0, minBet: 10, currentTurn: -1, turnTimeLeft: 0, maxPlayers: 0, rake: 0, tableMinBuyIn: 100, tableName: '', expiresAt: '',
  players: []
});

const modalMaxBalance = computed(() => {
    if (myLastChips.value > 0 && myLastChips.value < gameState.tableMinBuyIn) {
        return gameState.tableMinBuyIn; 
    }
    return userTotalBalance.value;
});

const isHeroSeated = computed(() => {
  return gameState.players.some(p => p.isHero && p.isSeated);
});

const myLogicalSeatOffset = ref(0);

const heroCards = computed(() => {
  const hero = gameState.players.find(p => p.isHero && p.isSeated);
  return hero && hero.serverCards ? hero.serverCards : [];
});

watch(() => heroCards.value, (newCards) => {
  const currentCardsStr = newCards ? newCards.join(',') : '';
  
  if (currentCardsStr !== lastProcessedHandCards.value) {
    lastProcessedHandCards.value = currentCardsStr;
    
    if (newCards && newCards.length === 2) {
      hasPeekedCurrentHand.value = false;
      hasManuallyRevealedCards.value = !peekModeEnabled.value; 
      
      if (!isDiscarding3D.value) showPeekerModal.value = false; 
      if (peekTimeoutId) clearTimeout(peekTimeoutId);
      
      verificarAberturaFilar();
    } else if (!newCards || newCards.length === 0) {
      hasPeekedCurrentHand.value = false;
      hasManuallyRevealedCards.value = false;
      if (!isDiscarding3D.value) showPeekerModal.value = false; 
      if (peekTimeoutId) clearTimeout(peekTimeoutId);
    }
  }
}, { deep: true });

const verificarAberturaFilar = () => {
  const hero = gameState.players.find(p => p.isHero);
  const cards = heroCards.value;
  
  if (
    cards && cards.length === 2 && 
    hero && hero.status === 'playing' && 
    peekModeEnabled.value && 
    !hasPeekedCurrentHand.value &&
    !hasManuallyRevealedCards.value
  ) {
    hasPeekedCurrentHand.value = true;
    
    if (peekTimeoutId) clearTimeout(peekTimeoutId);

    const tryOpenPeeker = () => {
      if (!hasManuallyRevealedCards.value && hero && hero.status === 'playing') {
        showPeekerModal.value = true;
      }
    };

    if (isDealing.value || isAnimating.value) {
      const unwatch = watch([() => isDealing.value, () => isAnimating.value], ([dealing, animating]) => {
        if (!dealing && !animating) {
          peekTimeoutId = setTimeout(tryOpenPeeker, 800); 
          unwatch(); 
        }
      });
    } else {
      peekTimeoutId = setTimeout(tryOpenPeeker, 800);
    }
  }
};

watch(() => peekModeEnabled.value, (ligado) => {
  engine.setPeekMode(ligado);
  localStorage.setItem('magic_peek_enabled', ligado ? '1' : '0');
});

watch(() => gameState.phase, (newPhase, oldPhase) => {
  if (engine && typeof engine.updateDeckVisibility === 'function') {
        engine.updateDeckVisibility();
    }
    
    if (newPhase === 'waiting' && oldPhase !== 'waiting') {
        if (isWaitingToLeave.value) {
            invokeStandUp();
            isWaitingToLeave.value = false;
        }
    }
});

watch(() => {
    const hero = gameState.players.find(p => p.isHero);
    return hero ? hero.status : null;
}, (newStatus) => {
    if (newStatus === 'out' || newStatus === 'done') {
        if (!isDiscarding3D.value) showPeekerModal.value = false; 
        hasManuallyRevealedCards.value = true; 
    }
});

function fecharPeekerERevelar() {
  hasManuallyRevealedCards.value = true; 
  if (!isDiscarding3D.value) showPeekerModal.value = false;
  engine.revealHeroCards(); 
}

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

// 👇 DECLARAÇÃO COMPLETA DO USEGAMEHUB SEM RESUMOS 👇
const gameHub = useGameHub(tableId, currentUserId, currentUserName, currentAvatar, {
    onReceiveTableState: (serverState: any) => syncTable(serverState),
    
    onPlayerSkipped: async (logicalSeat: number) => {
        if(document.hidden) { flushPendingState(); return; }
        
        isAnimating.value = true;
        try {
            const visualSeat = (logicalSeat - myLogicalSeatOffset.value + gameState.maxPlayers) % gameState.maxPlayers;
            await engine.playSkipAnimation(visualSeat);
        } catch(err) {
            console.error(err);
        } finally {
            isAnimating.value = false;
            flushPendingState();
        }
    },
    
    onPlayerBetted: async (logicalSeat: number, betAmount: number, isWin: boolean, potBroken: boolean, playedCards: string[], centerCardRevealed: string) => {
        if(document.hidden) { flushPendingState(); return; }
        
        isAnimating.value = true;
        try {
            const visualSeat = (logicalSeat - myLogicalSeatOffset.value + gameState.maxPlayers) % gameState.maxPlayers;
            await engine.playBetAnimation(visualSeat, betAmount, isWin, playedCards, centerCardRevealed);
            if (potBroken) await engine.rechargePotAnim();
        } catch(err) {
            console.error(err);
        } finally {
            isAnimating.value = false;
            flushPendingState();
        }
    },
    
    onWalletBalanceUpdated: (newBalance: number) => {
        userTotalBalance.value = newBalance;
    },
    
    onPlayerSatDown: (logicalSeat: number) => {
        let offsetToUse = myLogicalSeatOffset.value;
        
        if (logicalSeat === expectedHeroLogicalSeat.value) {
            offsetToUse = logicalSeat;
            myLogicalSeatOffset.value = logicalSeat; 
            expectedHeroLogicalSeat.value = -1; 
        }

        const visualSeat = (logicalSeat - offsetToUse + gameState.maxPlayers) % gameState.maxPlayers;
        
        if (typeof (engine as any).playSitEffect === 'function') {
            (engine as any).playSitEffect(visualSeat);
        }
    },
    
    onPlayerStoodUp: (logicalSeat: number) => {
        const visualSeat = (logicalSeat - myLogicalSeatOffset.value + gameState.maxPlayers) % gameState.maxPlayers;
        if (typeof (engine as any).playStandEffect === 'function') {
            (engine as any).playStandEffect(visualSeat);
        }
    },
    
    onReceiveError: (msg: string) => {
        appAlertMessage.value = `<span style="color: #ff4757; font-weight: bold;">Aviso do Servidor:</span><br><br>${msg}`;
    }
});


const engine = new MeinhoPixiEngine(gameState, {
    setDealing: (v) => isDealing.value = v,
    setAnimating: (v) => isAnimating.value = v,
    flushPendingState: () => flushPendingState(),
    sitDown: async (visualSeatIndex: number) => {
        if (gameState.players.some(p => p.isHero && p.isSeated)) return;
        
        const logicalSeat = (visualSeatIndex + myLogicalSeatOffset.value) % (gameState.maxPlayers || 6);
        
        await fetchUserBalance();
        
        const minBuyIn = gameState.tableMinBuyIn;

        if (myLastChips.value >= minBuyIn) {
            expectedHeroLogicalSeat.value = logicalSeat; 
            gameHub.sitDown(logicalSeat, myLastChips.value).then(() => {
                fetchUserBalance();
                if (!sessionStartTime.value) {
                    sessionStartTime.value = new Date().toISOString(); 
                }
            }).catch(e => {
                console.error("Erro ao sentar automaticamente:", e);
                expectedHeroLogicalSeat.value = -1; 
                appAlertMessage.value = `<span style="color: #ff4757; font-weight: bold;">Erro do Servidor:</span><br><br>A conexão falhou ao tentar sentar. O seu backend C# recusou a requisição.`;
            });
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
        
        expectedHeroLogicalSeat.value = seatToSit; 

        gameHub.sitDown(seatToSit, amount).then(() => {
            fetchUserBalance();
            sessionStartTime.value = new Date().toISOString();
        }).catch(e => {
            console.error("Erro ao sentar:", e);
            expectedHeroLogicalSeat.value = -1; 
            appAlertMessage.value = `<span style="color: #ff4757; font-weight: bold;">Erro do Servidor:</span><br><br>O servidor C# abortou a ação de sentar. Verifique os logs da sua API.`;
        });
    }
}

function cancelBuyIn() {
    showBuyInModal.value = false;
    pendingSitSeat.value = -1;
}

function handleMenuRebuy() {
  showMenuModal.value = false;
  isManualRebuy.value = true;
  showRebuyModal.value = true;
}

function cancelRebuyAction() {
  showRebuyModal.value = false;
  if (!isManualRebuy.value) {
    invokeStandUp(); 
  }
  isManualRebuy.value = false;
}

function confirmRebuyAction(amount: number) {
  invokeRebuy(amount);
  isManualRebuy.value = false;
}

watch(() => showPeekerModal.value, (isOpen) => {
  if (engine) {
    engine.setHeroCardsVisibility(!isOpen);
  }
});

function applyState(serverState: any) {
  const oldPhase = gameState.phase;

  const serverMaxPlayers = Number(serverState.maxPlayers || serverState.MaxPlayers || 6);

  if (gameState.maxPlayers !== serverMaxPlayers) {
      gameState.maxPlayers = serverMaxPlayers;
      
      while (gameState.players.length > serverMaxPlayers) gameState.players.pop();
      while (gameState.players.length < serverMaxPlayers) {
          gameState.players.push({ seat: gameState.players.length, name: "Livre", chips: 0, cards: [], totalBuyIn: 0, totalCashOut: 0, lastChips: 0, isHero: false, status: 'waiting', isSeated: false });
      }
      
      engine.buildSeats(serverMaxPlayers);
  }

  const normPlayers = (serverState.players || serverState.Players || []).map((p: any) => {
      let tBuyIn = 0;
      if (p.totalBuyIn !== undefined) tBuyIn = Number(p.totalBuyIn);
      else if (p.TotalBuyIn !== undefined) tBuyIn = Number(p.TotalBuyIn);

      let tCashOut = 0;
      if (p.totalCashOut !== undefined) tCashOut = Number(p.totalCashOut);
      else if (p.TotalCashOut !== undefined) tCashOut = Number(p.TotalCashOut);

      let tLastChips = 0;
      if (p.lastChips !== undefined) tLastChips = Number(p.lastChips);
      else if (p.LastChips !== undefined) tLastChips = Number(p.LastChips);

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
          cards: p.cards || p.Cards || [],
          status: String(p.status || p.Status || 'waiting').toLowerCase(),
          avatar: String(p.avatar || p.Avatar || 'default.webp') 
      };
  });

  const rawTurnTimeLeft = serverState.turnTimeLeft ?? serverState.TurnTimeLeft ?? 0;
  
  const normState = {
      phase: String(serverState.phase || serverState.Phase || 'waiting').toLowerCase(),
      pot: Number(serverState.pot !== undefined ? serverState.pot : (serverState.Pot || 0)),
      minBet: Number(serverState.minBet !== undefined ? serverState.minBet : (serverState.MinBet || 10)),
      currentTurnSeat: Number(serverState.currentTurnSeat !== undefined ? serverState.currentTurnSeat : (serverState.CurrentTurnSeat ?? -1)),
      centerCard: String(serverState.centerCard || serverState.CenterCard || ''),
      turnTimeLeft: Number(rawTurnTimeLeft),
      players: normPlayers
  };

  let heroPlayer = null;

  if (currentUserId) {
      heroPlayer = normState.players.find((p: any) => p.isSeated && p.userId === currentUserId);
      
      const historicalMe = normState.players.find((p: any) => p.userId === currentUserId);
      if (historicalMe) {
          myLastChips.value = historicalMe.lastChips;
      }
  }

  if (!heroPlayer) {
      const myConnId = gameHub.getConnectionId();
      if (myConnId) {
          heroPlayer = normState.players.find((p: any) => p.isSeated && p.connectionId === myConnId);
      }
  }

  if (heroPlayer) {
      myLogicalSeatOffset.value = heroPlayer.seat;
      if (!sessionStartTime.value) {
          sessionStartTime.value = new Date().toISOString(); 
      }
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
        
        if (typeof (engine as any).clearPlayerCards === 'function') {
           (engine as any).clearPlayerCards(i);
        } else if (typeof engine.playSkipAnimation === 'function') {
           engine.playSkipAnimation(i).catch(() => {});
        }
      }

      player.isSeated = false;
      player.name = `Livre`;
      player.isHero = false;
      player.totalBuyIn = 0;
      player.totalCashOut = 0;
      player.lastChips = 0;
      player.userId = undefined;
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
      }
      
      const resolvedAvatarUrl = getAvatarUrl(p.avatar);
      engine.updatePlayerSeat(visualSeat, true, p.name, p.chips, p.status, resolvedAvatarUrl);
    }
  });

  gameState.pot = normState.pot;
  gameState.minBet = normState.minBet;
  gameState.centerCardStr = normState.centerCard;
  gameState.turnTimeLeft = normState.turnTimeLeft;
  gameState.rake = Number(serverState.rake !== undefined ? serverState.rake : (serverState.Rake || 0));
  gameState.tableMinBuyIn = Number(serverState.minBuyIn !== undefined ? serverState.minBuyIn : (serverState.MinBuyIn || 100));
  gameState.tableName = String(serverState.name || serverState.Name || 'MESA DE MEINHO');
  gameState.expiresAt = String(serverState.expiresAt || serverState.ExpiresAt || '');

  if (gameState.pot === 0) engine.clearPotChips();

  if (heroPlayer && heroPlayer.isSeated && heroPlayer.chips <= 0 && heroPlayer.status !== 'playing') {
      fetchUserBalance().then(() => {
          isManualRebuy.value = false;
          showRebuyModal.value = true;
      });
  } else if (!isManualRebuy.value) {
      showRebuyModal.value = false;
  }

  let newVisualTurn = -1;
  if (normState.currentTurnSeat !== -1) {
      newVisualTurn = (normState.currentTurnSeat - myLogicalSeatOffset.value + gameState.maxPlayers) % gameState.maxPlayers;
  }

  const needsDealing = gameState.players.some(p => 
      p.isSeated && p.status === 'playing' && p.serverCards && p.serverCards.length > 0 && (!p.uiCards || p.uiCards.length === 0)
  );

  if (needsDealing) {
    gameState.phase = normState.phase as any;
    engine.startGameAutomatically();
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
          const timeToStart = normState.turnTimeLeft > 0 ? normState.turnTimeLeft : 20;
          engine.startTimer(newVisualTurn, timeToStart);
      }
  } else if (gameState.phase !== 'betting') {
      gameState.currentTurn = -1;
      engine.stopTimer();
  }
}

function syncTable(serverState: any) {
  if (isAnimating.value) { pendingState = serverState; return; }
  applyState(serverState);
}

function invokeRebuy(amount: number) {
    if (amount > 0) {
        gameHub.rebuy(amount).then(() => {
            showRebuyModal.value = false;
            fetchUserBalance(); 
            
            if (gameState.phase !== 'waiting') {
                appAlertMessage.value = "Recarga efetuada com sucesso!<br><br>Suas fichas estarão disponíveis na mesa na próxima rodada.";
            } else {
                appAlertMessage.value = "Recarga efetuada com sucesso!<br><br>Suas fichas já foram adicionadas à mesa.";
            }
        });
    }
}

function invokeStandUp() {
    isWaitingToLeave.value = false; 
    if (gameHub.setLeaveNextHand) gameHub.setLeaveNextHand(false); 
    
    gameHub.standUp().then(() => {
        showRebuyModal.value = false;
        fetchUserBalance();
        sessionStartTime.value = null; 
    }).catch(e => console.error("Erro ao levantar:", e));
}

function invokeSkipBet() {
    hasManuallyRevealedCards.value = true;
    if (showPeekerModal.value && peekerRef.value) {
        isDiscarding3D.value = true; 
        gameHub.skipBet(); 
        peekerRef.value.discard().then(() => {
            isDiscarding3D.value = false; 
            showPeekerModal.value = false; 
        });
    } else {
        showPeekerModal.value = false; 
        gameHub.skipBet(); 
    }
}

function invokeConfirmBet(payload: number | string | { amount: number }) {
    if (showPeekerModal.value) {
        fecharPeekerERevelar(); 
    } else {
        hasManuallyRevealedCards.value = true;
    }
    
    let betValue = gameState.minBet;
    if (typeof payload === 'number') betValue = payload;
    else if (typeof payload === 'string' && !isNaN(Number(payload))) betValue = Number(payload);
    else if (payload && typeof payload === 'object' && 'amount' in payload) betValue = Number(payload.amount);
    
    const hero = gameState.players.find(p => p.isHero);
    const heroChips = hero ? hero.chips : 0;
    const maxAllowed = Math.min(gameState.pot, heroChips);
    
    if (betValue > maxAllowed) {
        betValue = maxAllowed;
    }
    
    gameHub.confirmBet(betValue);
}

function clicouMenu() { showMenuModal.value = true; }

function clicouEstatisticas() { showStatsModal.value = true; }

async function clicouVerMaos() { 
  try {
      const GAME_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';
      
      const response = await fetch(`${GAME_API_URL}/api/handhistory/${tableId}`);
      if (response.ok) {
          const data = await response.json();
          
          const safeData = data.filter((h: any) => {
              if (sessionStartTime.value && new Date(h.playedAt) < new Date(sessionStartTime.value)) {
                  return false;
              }

              if (gameState.phase === 'waiting') return true; 
              
              const p = gameState.players.find(x => x.userId === h.playerId);
              if (p && p.serverCards && p.serverCards.length > 0) {
                  const dbCards = (h.holeCards || []).join(',');
                  const activeCards = p.serverCards.join(',');
                  
                  if (dbCards === activeCards) return false; 
              }
              return true;
          });
          
          sessionHandHistory.value = safeData.map((h: any) => {
              const p = gameState.players.find(x => x.userId === h.playerId);
              
              return {
                  id: h.id,
                  playerId: h.playerId,
                  playerName: p ? p.name : 'Jogador Desconectado',
                  playedAt: h.playedAt,
                  holeCards: h.holeCards || [],
                  communityCard: h.communityCard || '',
                  betAmount: h.betAmount
              };
          });
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
        if (gameHub.setLeaveNextHand) gameHub.setLeaveNextHand(true); 
    } else {
        invokeStandUp(); 
    }
}

function cancelLeaveNextHand() {
    isWaitingToLeave.value = false;
    if (gameHub.setLeaveNextHand) gameHub.setLeaveNextHand(false); 
}

function handleLobby() {
    showMenuModal.value = false;
    router.push('/lobby');
}
function handleMenuRules() { showMenuModal.value = false; }
function handleMenuSettings() { showMenuModal.value = false; }

function handleToggleSound(enabled: boolean) { 
  soundModeEnabled.value = enabled; 
  localStorage.setItem('magic_sound_enabled', enabled ? '1' : '0');
  if(engine && typeof (engine as any).setSoundEnabled === 'function') {
      (engine as any).setSoundEnabled(enabled);
  }
}

function handleTogglePeek(enabled: boolean) { 
  peekModeEnabled.value = enabled; 
  localStorage.setItem('magic_peek_enabled', enabled ? '1' : '0');
}

watch(() => gameState.pot, (newPot) => { engine.updatePotText(newPot); });

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    isAnimating.value = false;
    isDealing.value = false;
    isDiscarding3D.value = false;
    
    if (pendingState) {
      applyState(pendingState);
      pendingState = null;
    }
    if (engine) engine.updateDeckVisibility();
  }
};

onMounted(async () => {
  calculateScale();
  window.addEventListener('resize', calculateScale);
  document.addEventListener('visibilitychange', handleVisibilityChange); 

  await fetchUserBalance();

  if (pixiContainer.value) {
    try {
        await engine.init(
            pixiContainer.value, GAME_WIDTH, GAME_HEIGHT, getAvatarUrl('default.webp'), deckImg, singleChipImg, tableImgAsset, potChipsImg
        );
        engine.setPeekMode(peekModeEnabled.value); 
        
        if(typeof (engine as any).setSoundEnabled === 'function') {
            (engine as any).setSoundEnabled(soundModeEnabled.value);
        }
    } catch(e) { console.error(e); }
  }
  await gameHub.connect();

  setTimeout(() => {
    isAppLoading.value = false;
  }, 500);
});

onUnmounted(() => {
  if (peekTimeoutId) clearTimeout(peekTimeoutId);
  window.removeEventListener('resize', calculateScale);
  document.removeEventListener('visibilitychange', handleVisibilityChange); 
  gameHub.disconnect();
  engine.destroy();
});
</script>

<style scoped>
.main-wrapper { position: relative; width: 100vw; min-height: 100vh; min-height: 100dvh; background-color: #000; box-sizing: border-box; background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%); overflow: hidden; }
.game-container { position: absolute; top: 50%; left: 50%; width: 430px; height: 900px; transform-origin: center center; border-radius: 20px; overflow: hidden; border: 2px solid #a855f7; box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.4); background-color: #1a2639; }

.table-content-fader {
  width: 100%;
  height: 100%;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 1s ease-out, transform 1.2s cubic-bezier(0.165, 0.84, 0.44, 1);
  pointer-events: none; 
}

.fade-in-content {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto; 
}

.fade-peeker-enter-active,
.fade-peeker-leave-active {
  transition: opacity 0.6s ease-in-out;
}
.fade-peeker-enter-from,
.fade-peeker-leave-to {
  opacity: 0;
}

.peeker-safe-hide {
  transition: opacity 0.3s ease;
}
.peeker-hidden {
  opacity: 0 !important;
  pointer-events: none !important;
}

.pixi-canvas { position: absolute; top: 0; left: 0; width: 430px; height: 900px; z-index: 2; pointer-events: auto !important; }
.table-neon-aura { position: absolute; top: 0; left: 0; width: 430px; height: 900px; background: radial-gradient(ellipse at 50% 45%, rgba(0, 243, 255, 0.15) 0%, rgba(168, 85, 247, 0.15) 35%, transparent 65%); pointer-events: none !important; z-index: 3; mix-blend-mode: screen; }
.ui-layer { position: absolute; top: 0; left: 0; width: 430px; height: 900px; z-index: 300; pointer-events: none !important; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding: 40px 0 15px 0; box-sizing: border-box; }
.ui-layer > * { pointer-events: auto !important; }
.controls-wrapper { width: 100%; margin-bottom: 16px; display: flex; justify-content: center; }
.hud-btn { position: absolute; width: 46px; height: 46px; background: linear-gradient(135deg, rgba(20, 28, 45, 0.85), rgba(10, 15, 25, 0.95)); border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 12px; display: flex; justify-content: center; align-items: center; cursor: pointer; z-index: 50; box-shadow: 0 4px 15px rgba(0,0,0,0.6), inset 0 0 10px rgba(0, 243, 255, 0.1); backdrop-filter: blur(8px); transition: all 0.2s ease-in-out; padding: 0; outline: none; pointer-events: auto !important; }
.hud-btn:hover, .hud-btn:active { transform: scale(1.08) translateY(-2px); border-color: rgba(0, 243, 255, 0.8); box-shadow: 0 6px 20px rgba(0, 243, 255, 0.4), inset 0 0 15px rgba(0, 243, 255, 0.3); }
.hud-btn svg { width: 22px; height: 22px; stroke: #00f3ff; filter: drop-shadow(0 0 4px rgba(0, 243, 255, 0.8)); }
.hud-top-left { top: 20px; left: 20px; }
.hud-top-right { top: 20px; right: 20px; }
.hud-bottom-left { bottom: 20px; left: 20px; }
.table-id-footer { position: absolute; bottom: 8px; left: 0; width: 100%; text-align: center; color: rgba(255, 255, 255, 0.3); font-family: Arial, sans-serif; font-size: 11px; white-space: nowrap; pointer-events: none; z-index: 50; }

.leave-warning {
  position: absolute;
  top: 26px; 
  left: 50%;
  transform: translateX(-50%);
  background: rgba(231, 76, 60, 0.95);
  border: 1px solid #ff7979;
  border-radius: 20px;
  padding: 6px 12px; 
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
  z-index: 500;
  animation: slideDownFade 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  width: max-content;
  max-width: 250px;
}

.leave-warning span {
  color: white;
  font-family: Arial, sans-serif;
  font-size: 11px; 
  font-weight: bold;
  white-space: nowrap;
}

.leave-warning button {
  background: white;
  color: #e74c3c;
  border: none;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 9px; 
  font-weight: 900;
  cursor: pointer;
  text-transform: uppercase;
  transition: transform 0.1s;
}

.leave-warning button:active {
  transform: scale(0.9);
}

@keyframes slideDownFade {
  0% { transform: translate(-50%, -20px); opacity: 0; }
  100% { transform: translate(-50%, 0); opacity: 1; }
}

.fade-alert-enter-active, .fade-alert-leave-active {
  transition: opacity 0.3s ease;
}
.fade-alert-enter-from, .fade-alert-leave-to {
  opacity: 0;
}

.custom-alert-overlay {
  position: absolute;
  top: 0; left: 0; width: 430px; height: 900px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(5px);
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
}

.custom-alert-box {
  background: linear-gradient(145deg, #1a2639, #111827);
  border: 2px solid #3ce48a;
  border-radius: 16px;
  padding: 24px;
  width: 80%;
  max-width: 320px;
  text-align: center;
  color: white;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(60, 228, 138, 0.1);
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.alert-icon {
  width: 50px;
  height: 50px;
  margin: 0 auto 15px auto;
  background: rgba(60, 228, 138, 0.1);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.alert-icon svg {
  width: 28px;
  height: 28px;
}

.custom-alert-box h3 {
  margin: 0 0 10px 0;
  color: #3ce48a;
  text-transform: uppercase;
  font-size: 18px;
  letter-spacing: 1px;
}

.custom-alert-box p {
  font-size: 13px;
  color: #8da1bc;
  margin-bottom: 25px;
  line-height: 1.4;
}

.btn-confirm-full {
  background: #3ce48a;
  color: #000;
  padding: 12px 15px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  width: 100%;
  text-transform: uppercase;
  font-size: 13px;
  transition: transform 0.1s ease;
}

.btn-confirm-full:active {
  transform: scale(0.95);
}
</style>