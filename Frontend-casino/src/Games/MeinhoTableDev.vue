<template>
  <div class="main-wrapper" ref="wrapperRef">
    
    <div class="dev-top-bar">
      <span class="dev-label">Acessar Mesa (ID):</span>
      <input type="text" v-model="inputTableId" placeholder="Cole o ID da mesa (Ex: c22d71ef...)" @keyup.enter="abrirMesa" />
      <button @click="abrirMesa">ABRIR MESA</button>
    </div>

    <template v-if="tableId">
      
      <div class="desktop-wrapper" :style="{ transform: `translate(-50%, calc(-50% + 30px)) scale(${gameScale})` }">
        
        <div class="game-container">
          
          <GameLoading :visible="isAppLoading" />

          <div class="table-content-fader" :class="{ 'fade-in-content': !isAppLoading }">
            
            <div class="status-header">
              <h2>STATUS DA MESA</h2>
              <div class="pot-info">POTE: R$ {{ gameState.pot }} | FASE: {{ gameState.phase.toUpperCase() }}</div>
            </div>

            <div class="players-vertical-list">
              <div v-if="seatedPlayers.length === 0" class="no-players">
                Nenhum jogador sentado na mesa no momento.
              </div>

              <div v-for="(p, index) in seatedPlayers" :key="p.seat" 
                   class="player-row" 
                   :class="{ 'is-active-turn': p.logicalSeat === gameState.currentTurn }">
                
                <div class="player-name">
                  <div class="name-and-timer">
                    JOGADOR {{ index + 1 }} - {{ p.name.toUpperCase() }}
                    
                    <span v-if="p.logicalSeat === gameState.currentTurn && gameState.turnTimeLeft > 0" class="turn-timer">
                      ⏳ {{ Math.ceil(gameState.turnTimeLeft) }}s
                    </span>
                  </div>

                  <span class="player-status">({{ p.status }}) R$ {{ p.chips }}</span>
                </div>

                <div class="player-cards-line">
                  
                  <div class="cards-group">
                    <div v-for="(c, idx) in p.devCards" :key="idx" class="real-card-mini" :class="getCardClass(c)">
                      <span class="card-rank">{{ formatCardData(c).rank }}</span>
                      <span class="card-suit">{{ formatCardData(c).suit }}</span>
                    </div>
                    <span v-if="!p.devCards || p.devCards.length === 0" class="empty-text">Sem cartas</span>
                  </div>

                  <div class="vira-group" v-if="p.devCards && p.devCards.length > 0">
                    <span class="vira-label">AO LADO VIRA</span>
                    <div v-if="gameState.centerCardStr && gameState.centerCardStr !== 'Nenhuma'" class="real-card-mini vira-card" :class="getCardClass(gameState.centerCardStr)">
                      <span class="card-rank">{{ formatCardData(gameState.centerCardStr).rank }}</span>
                      <span class="card-suit">{{ formatCardData(gameState.centerCardStr).suit }}</span>
                    </div>
                    <span v-else class="empty-text">Nenhuma</span>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="dev-sidebar" v-if="!isAppLoading">
          <div class="dev-header">CONTROLE DO BARALHO</div>
          
          <div class="dev-section dev-deck-section">
            <h4>Baralho Restante ({{ gameState.remainingDeck?.length || 0 }})</h4>
            <p class="instruction-text">Clique numa carta para forçá-la como Vira atual.</p>
            
            <div class="deck-grid-container">
              <div v-for="(card, i) in gameState.remainingDeck" :key="i" 
                   class="deck-item" @click="trocarVira(i)" title="Definir como Vira">
                <span class="card-index">{{ i + 1 }}º</span> 
                <div class="real-card-mini" :class="getCardClass(card)">
                  <span class="card-rank">{{ formatCardData(card).rank }}</span>
                  <span class="card-suit">{{ formatCardData(card).suit }}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      <div class="table-id-footer">
        ID da Mesa DEV: {{ tableId }}
      </div>
    </template>

    <div class="empty-dev-state" v-else>
      <h2>AMBIENTE DE DESENVOLVIMENTO (RAIO-X)</h2>
      <p>Cole o ID da mesa na barra superior para iniciar o Raio-X do jogo.</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router'; 
import GameLoading from '../components/Meinho/GameLoading.vue';
import { useGameHub } from '../composables/useGameHub';

const route = useRoute();
const tableId = (route.params.id as string) || '';
const inputTableId = ref(tableId);

const GAME_WIDTH = 430;
const SIDEBAR_WIDTH = 380; 
const GAP = 20; 
const TOTAL_WIDTH = GAME_WIDTH + GAP + SIDEBAR_WIDTH; 
const GAME_HEIGHT = 900;
const gameScale = ref(1);
const wrapperRef = ref<HTMLElement | null>(null);

const isAppLoading = ref(true);
let devPollTimer: ReturnType<typeof setInterval> | null = null;
let localTickTimer: ReturnType<typeof setInterval> | null = null;

interface Player {
  logicalSeat: number;
  seat: number; 
  name: string; 
  chips: number; 
  status: 'waiting' | 'playing' | 'out' | 'done';
  isSeated: boolean; 
  devCards?: string[]; 
}

interface GameState {
  phase: string;
  pot: number; 
  minBet: number; 
  currentTurn: number; 
  turnTimeLeft: number;
  players: Player[];
  centerCardStr?: string; 
  maxPlayers: number; 
  remainingDeck: string[]; 
}

const gameState = reactive<GameState>({
  phase: 'waiting', pot: 0, minBet: 10, currentTurn: -1, turnTimeLeft: 0, maxPlayers: 0,
  players: [], remainingDeck: []
});

const seatedPlayers = computed(() => gameState.players.filter(p => p.isSeated));

function calculateScale() {
  if (!wrapperRef.value) return;
  const winW = wrapperRef.value.clientWidth;
  const winH = wrapperRef.value.clientHeight;
  const safeW = winW - 12;
  const safeH = winH - 60; 
  const scaleW = safeW / TOTAL_WIDTH;
  const scaleH = safeH / GAME_HEIGHT;
  gameScale.value = Math.min(scaleW, scaleH); 
}

function abrirMesa() {
  const newId = inputTableId.value.trim();
  if (!newId || newId === tableId) return;

  let basePath = window.location.pathname;
  if (tableId && basePath.endsWith(tableId)) basePath = basePath.replace('/' + tableId, '');
  if (basePath.endsWith('/')) basePath = basePath.slice(0, -1);
  window.location.href = `${basePath}/${newId}`;
}

async function trocarVira(index: number) {
  if (!gameState.remainingDeck || gameState.remainingDeck.length <= index) return;

  const cardSelecionada = gameState.remainingDeck[index];
  const viraAntiga = gameState.centerCardStr;

  gameState.centerCardStr = cardSelecionada;
  gameState.remainingDeck.splice(index, 1); 
  if (viraAntiga && viraAntiga !== 'Nenhuma') {
    gameState.remainingDeck.push(viraAntiga); 
  }

  try {
    const GAME_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';
    await fetch(`${GAME_API_URL}/api/dev/table/${tableId}/set-vira`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        newCenterCard: cardSelecionada,
        oldCenterCard: viraAntiga,
        deckIndex: index
      })
    });
  } catch(e) {
    console.error("Erro ao alterar vira no servidor.", e);
  }
}

async function fetchDevState() {
  if (!tableId) return;
  try {
    const GAME_API_URL = import.meta.env.VITE_GAME_API_URL || 'http://localhost:5002';
    const response = await fetch(`${GAME_API_URL}/api/dev/table/${tableId}`);
    
    if (response.ok) {
      const data = await response.json();
      gameState.remainingDeck = data.remainingDeck || data.RemainingDeck || [];
      const devPlayers = data.players || data.Players || [];
      
      if (data.currentTurnSeat !== undefined || data.CurrentTurnSeat !== undefined) {
        gameState.currentTurn = Number(data.currentTurnSeat ?? data.CurrentTurnSeat ?? -1);
      }
      if (data.turnTimeLeft !== undefined || data.TurnTimeLeft !== undefined) {
        gameState.turnTimeLeft = Number(data.turnTimeLeft ?? data.TurnTimeLeft ?? 0);
      }
      
      gameState.players.forEach(p => {
        if (p.isSeated) {
          const devP = devPlayers.find((dp: any) => {
            const serverSeat = dp.seat !== undefined ? dp.seat : dp.Seat;
            return serverSeat === p.logicalSeat;
          });
          p.devCards = devP ? (devP.cards || devP.Cards || []) : [];
        } else {
          p.devCards = [];
        }
      });
    }
  } catch(e) { }
}

const getCardClass = (cardString?: string) => {
  if (!cardString) return 'text-gray';
  const isRed = cardString.includes('♥') || cardString.includes('♦');
  return isRed ? 'text-red' : 'text-blue';
};

const formatCardData = (cardStr?: string) => {
  if (!cardStr) return { rank: '', suit: '' };
  const rank = cardStr.slice(0, -1);
  const suit = cardStr.slice(-1);
  return { rank, suit };
};

const gameHub = useGameHub(tableId, "DEV_XRAY", "Dev", "default.webp", {
    onReceiveTableState: (serverState: any) => applyState(serverState),
    onPlayerSkipped: () => {},
    onPlayerBetted: () => {},
    onWalletBalanceUpdated: () => {},
    onPlayerSatDown: () => {},
    onPlayerStoodUp: () => {}
});

function applyState(serverState: any) {
  const serverMaxPlayers = Number(serverState.maxPlayers || serverState.MaxPlayers || 6);

  if (gameState.maxPlayers !== serverMaxPlayers) {
      gameState.maxPlayers = serverMaxPlayers;
      while (gameState.players.length > serverMaxPlayers) gameState.players.pop();
      while (gameState.players.length < serverMaxPlayers) {
          gameState.players.push({ logicalSeat: -1, seat: gameState.players.length, name: "Livre", chips: 0, status: 'waiting', isSeated: false, devCards: [] });
      }
  }

  const rawPlayers = serverState.players || serverState.Players || [];

  for (let i = 0; i < gameState.maxPlayers; i++) {
    const player = gameState.players[i];
    if (player) {
      player.isSeated = false;
      player.logicalSeat = -1;
      player.name = `Livre`;
    }
  }

  rawPlayers.forEach((p: any) => {
    const logicalSeat = p.seat !== undefined ? p.seat : (p.Seat !== undefined ? p.Seat : -1);
    
    if ((p.isSeated || p.IsSeated) && logicalSeat >= 0 && logicalSeat < gameState.maxPlayers) {
      const player = gameState.players[logicalSeat];
      if (player) {
        player.isSeated = true;
        player.logicalSeat = logicalSeat;
        player.name = String(p.name || p.Name || 'Livre');
        player.chips = p.chips !== undefined ? p.chips : (p.Chips || 0);
        player.status = String(p.status || p.Status || 'waiting').toLowerCase() as any;
      }
    }
  });

  gameState.phase = String(serverState.phase || serverState.Phase || 'waiting').toLowerCase();
  gameState.pot = Number(serverState.pot !== undefined ? serverState.pot : (serverState.Pot || 0));
  gameState.centerCardStr = String(serverState.centerCard || serverState.CenterCard || '');
  
  gameState.currentTurn = Number(serverState.currentTurnSeat !== undefined ? serverState.currentTurnSeat : (serverState.CurrentTurnSeat ?? -1));
  gameState.turnTimeLeft = Number(serverState.turnTimeLeft !== undefined ? serverState.turnTimeLeft : (serverState.TurnTimeLeft ?? 0));
}

onMounted(async () => {
  calculateScale();
  window.addEventListener('resize', calculateScale);

  if (!tableId) {
    isAppLoading.value = false;
    return;
  }
  
  await gameHub.connect();
  devPollTimer = setInterval(fetchDevState, 1000);
  
  localTickTimer = setInterval(() => {
    if (gameState.turnTimeLeft > 0) {
      gameState.turnTimeLeft -= 1;
    }
  }, 1000);

  fetchDevState();

  setTimeout(() => { isAppLoading.value = false; }, 500);
});

onUnmounted(() => {
  if (devPollTimer) clearInterval(devPollTimer);
  if (localTickTimer) clearInterval(localTickTimer);
  window.removeEventListener('resize', calculateScale);
  if (tableId) gameHub.disconnect();
});
</script>

<style scoped>
.main-wrapper { position: relative; width: 100vw; min-height: 100vh; background-color: #000; background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%); overflow: hidden; box-sizing: border-box; }

.dev-top-bar { position: absolute; top: 0; left: 0; width: 100%; height: 60px; background: rgba(10, 15, 25, 0.95); border-bottom: 2px solid #00f3ff; display: flex; justify-content: center; align-items: center; gap: 15px; z-index: 9999; box-shadow: 0 5px 20px rgba(0, 243, 255, 0.2); }
.dev-label { color: #00f3ff; font-weight: 900; font-size: 14px; font-family: Arial, sans-serif; text-transform: uppercase; }
.dev-top-bar input { width: 320px; padding: 10px 15px; background: #000; border: 1px solid #00f3ff; color: #fff; border-radius: 6px; font-family: monospace; font-size: 14px; outline: none; }
.dev-top-bar button { padding: 10px 20px; background: #00f3ff; color: #000; font-weight: 900; border: none; border-radius: 6px; cursor: pointer; text-transform: uppercase; transition: transform 0.1s; }
.dev-top-bar button:active { transform: scale(0.95); }

.desktop-wrapper { position: absolute; top: 50%; left: 50%; display: flex; gap: 20px; transform-origin: center center; z-index: 10; }

.game-container { position: relative; width: 430px; height: 900px; border-radius: 20px; border: 2px solid #a855f7; box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(168, 85, 247, 0.6); background-color: #1a2639; overflow: hidden; font-family: 'Courier New', Courier, monospace; }

.table-content-fader { padding: 20px; width: 100%; height: 100%; box-sizing: border-box; opacity: 0; transform: scale(0.95); transition: opacity 0.5s, transform 0.5s; }
.fade-in-content { opacity: 1; transform: scale(1); }

/* CABEÇALHO */
.status-header { border-bottom: 2px dashed rgba(0, 243, 255, 0.4); padding-bottom: 15px; margin-bottom: 15px; text-align: center; }
.status-header h2 { color: #00f3ff; margin: 0 0 10px 0; font-size: 22px; text-shadow: 0 0 10px rgba(0, 243, 255, 0.5); }
.pot-info { background: rgba(0, 0, 0, 0.4); display: inline-block; padding: 6px 12px; border-radius: 6px; color: #fff; font-size: 14px; }

/* LISTA DE JOGADORES */
.players-vertical-list { display: flex; flex-direction: column; gap: 15px; }
.player-row { background: rgba(0, 0, 0, 0.3); border-left: 4px solid #a855f7; border-radius: 8px; padding: 12px 15px; transition: all 0.3s; }

.is-active-turn { background: rgba(0, 243, 255, 0.1) !important; border-left: 4px solid #00f3ff !important; box-shadow: 0 0 15px rgba(0, 243, 255, 0.4), inset 0 0 10px rgba(0, 243, 255, 0.2); animation: pulse-turn 1.5s infinite alternate; }
@keyframes pulse-turn { 0% { box-shadow: 0 0 10px rgba(0, 243, 255, 0.3), inset 0 0 5px rgba(0, 243, 255, 0.1); } 100% { box-shadow: 0 0 25px rgba(0, 243, 255, 0.7), inset 0 0 15px rgba(0, 243, 255, 0.4); } }

.player-name { color: #fff; font-size: 15px; font-weight: bold; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; }
.name-and-timer { display: flex; align-items: center; }

.turn-timer { background: #ffcc00; color: #000; padding: 2px 8px; border-radius: 12px; font-size: 13px; font-weight: 900; margin-left: 10px; box-shadow: 0 0 10px rgba(255, 204, 0, 0.8); animation: alert-pulse 1s infinite alternate; }
@keyframes alert-pulse { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }

.player-status { font-size: 12px; color: #aaa; font-weight: normal; }
.player-cards-line { display: flex; align-items: center; justify-content: space-between; }
.cards-group { display: flex; gap: 8px; align-items: center; }
.empty-text { font-size: 12px; color: #666; font-style: italic; }
.vira-group { display: flex; align-items: center; gap: 10px; }
.vira-label { color: #00f3ff; font-size: 12px; font-weight: bold; }
.vira-card { border-color: #00f3ff !important; box-shadow: 0 0 10px rgba(0, 243, 255, 0.4); }

/* SIDEBAR E BARALHO */
.dev-sidebar { position: relative; width: 380px; height: 900px; background: rgba(10, 15, 25, 0.95); border: 2px solid #00f3ff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; font-family: 'Courier New', Courier, monospace; overflow-y: auto; }
.dev-sidebar::-webkit-scrollbar { width: 6px; }
.dev-sidebar::-webkit-scrollbar-thumb { background: #00f3ff; border-radius: 4px; }
.dev-header { color: #00f3ff; font-weight: 900; font-size: 16px; text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px dashed rgba(0, 243, 255, 0.3); }
.instruction-text { font-size: 11px; color: #aaa; text-align: center; margin-bottom: 15px; }

/* GRELHA DO BARALHO (4 COLUNAS, COMPACTO) */
.deck-grid-container { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 6px; 
}

.deck-item { 
  display: flex; 
  align-items: center; 
  justify-content: center;
  gap: 2px; 
  cursor: pointer; 
  padding: 2px; 
  border-radius: 6px; 
  background: rgba(255, 255, 255, 0.03); 
  border: 1px solid transparent; 
  transition: all 0.2s; 
}
.deck-item:hover { background: rgba(0, 243, 255, 0.1); border-color: rgba(0, 243, 255, 0.3); }

.card-index { 
  font-size: 10px; 
  color: #888; 
  min-width: 14px; 
  text-align: right; 
}
.deck-item:hover .card-index { color: #fff; font-weight: bold; }

/* CARTAS QUADRADAS COM NAIPE SEPARADO E MENOR */
.real-card-mini { 
  width: 36px; 
  height: 36px; 
  background: #fff; 
  border: 1px solid #333; 
  border-radius: 6px; 
  display: flex; 
  justify-content: center; 
  align-items: baseline; 
  gap: 1px; 
  box-shadow: 1px 1px 4px rgba(0,0,0,0.5); 
}

.card-rank {
  font-size: 28px; 
  font-weight: 900; 
  letter-spacing: -2px; 
  line-height: 28px; 
}

.card-suit {
  font-size: 15px; 
  line-height: 15px; 
}

.deck-item:hover .real-card-mini { 
  transform: scale(1.15) translateY(-2px); 
  border-color: #00f3ff; 
  box-shadow: 0 4px 10px rgba(0, 243, 255, 0.4); 
}

.text-red { color: #e74c3c; }
.text-blue { color: #000000; } 
.text-gray { color: #888; }

.table-id-footer { position: absolute; bottom: 8px; left: 0; width: 100%; text-align: center; color: rgba(255, 255, 255, 0.3); font-family: Arial, sans-serif; font-size: 11px; pointer-events: none; z-index: 50; }
.empty-dev-state { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #fff; font-family: Arial, sans-serif; }
</style>