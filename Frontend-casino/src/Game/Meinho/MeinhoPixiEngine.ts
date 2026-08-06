import * as PIXI from 'pixi.js';
import { Deck } from '../Deck';
import { PlayerSeat } from '../PlayerSeat';
import { Animator } from '../Animator';
import { MeinhoHelper } from './MeinhoHelper';
import { MeinhoBoardUI } from './MeinhoBoardUI';
import { MeinhoAudioService } from './services/MeinhoAudioService';
import { MeinhoBoardService } from './actions/MeinhoBoardService';
import { MeinhoDealService } from './actions/MeinhoDealService';
import { MeinhoSkipService } from './actions/MeinhoSkipService';
import { MeinhoBetService } from './actions/MeinhoBetService';

export interface EngineCallbacks {
    setDealing: (val: boolean) => void;
    setAnimating: (val: boolean) => void;
    flushPendingState: () => void;
    sitDown: (seatIndex: number) => void;
}

export class MeinhoPixiEngine {
    public app: PIXI.Application | null = null;
    public deckInstance: Deck | null = null;
    public boardUI: MeinhoBoardUI | null = null;
    
    public audioService: MeinhoAudioService;
    public boardService: MeinhoBoardService;
    public dealService: MeinhoDealService;
    public skipService: MeinhoSkipService;
    public betService: MeinhoBetService;
    
    public singleChipTexture: PIXI.Texture | null = null;
    public potChipsTexture: PIXI.Texture | null = null;
    public avatarTextureCache: Map<string, PIXI.Texture> = new Map();

    public backgroundLayer = new PIXI.Container();
    public particleLayer = new PIXI.Container();
    public mainLayer = new PIXI.Container();

    public cardTargets: { x: number, y: number, seat: number, isLeft: boolean }[] = [];
    public dealtCardsUI: PIXI.Container[] = [];
    public potChipsUI: PIXI.Container[] = []; 
    public playerSeats: PlayerSeat[] = [];
    public transientUI: PIXI.Container[] = [];
    
    public seatCoords: { x: number, y: number }[] = [];
    public activeFireParticles: { mesh: PIXI.Graphics; life: number; vx: number; vy: number; }[] = [];

    public heroPixiCards: PIXI.Container[] = [];
    
    public isHeroCardsHidden: boolean = false;
    public isDiscardingCards: boolean = false;
    public heroHasRevealedCurrentHand: boolean = false;
    
    public animGeneration: number = 0;

    public activeTimerSeat = -1;
    public turnEndTime = 0;
    public readonly TIMER_DURATION_SEC = 20;
    public readonly POT_X = 215;
    
    // Pote centralizado horizontalmente e posicionado logo acima do baralho
    public readonly POT_Y = 335;

    public readonly MAGIC_COLORS = [0x00f3ff, 0xa855f7, 0xff6bfb, 0xffffff];
    public peekMode: boolean = false;
    private ultimoBlocoTempo: number = -1; 
    
    private lastPotTextValue: number = -1;

    constructor(public gameState: any, public callbacks: EngineCallbacks) {
        this.audioService = new MeinhoAudioService();
        this.boardService = new MeinhoBoardService(this);
        this.dealService = new MeinhoDealService(this);
        this.skipService = new MeinhoSkipService(this);
        this.betService = new MeinhoBetService(this);
    }

    public setSoundEnabled(enabled: boolean) { this.audioService.setSoundEnabled(enabled); }
    public setPeekMode(enabled: boolean) { this.peekMode = enabled; }

    public async init(canvasContainer: HTMLElement, width: number, height: number, defaultAvatarImg: string, deckImg: string, singleChipImg: string, tableImg: string, potChipsImg: string) {
        this.app = new PIXI.Application();
        
        await this.app.init({ 
            width, 
            height, 
            backgroundAlpha: 0, 
            antialias: true, 
            resolution: Math.min(window.devicePixelRatio || 1, 2), 
            autoDensity: true,
            preference: 'webgl' 
        });

        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, width, height);

        this.app.stage.addChild(this.backgroundLayer); 
        this.app.stage.addChild(this.mainLayer);
        this.app.stage.addChild(this.particleLayer);

        canvasContainer.appendChild(this.app.canvas);

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) { 
            this.app.ticker.maxFPS = 50; 
        } else {
            this.app.ticker.maxFPS = 0; 
        }

        this.audioService.init();

        let tableTexture = PIXI.Texture.EMPTY;
        let deckTexture = PIXI.Texture.EMPTY;

        try {
            tableTexture = await PIXI.Assets.load(tableImg);
            deckTexture = await PIXI.Assets.load(deckImg);
            this.singleChipTexture = await PIXI.Assets.load(singleChipImg);
            this.potChipsTexture = await PIXI.Assets.load(potChipsImg);
            
            const defaultTex = await PIXI.Assets.load(defaultAvatarImg);
            this.avatarTextureCache.set(defaultAvatarImg, defaultTex);
            this.avatarTextureCache.set('default', defaultTex); 

            // 🔥 PRÉ-CARREGAMENTO DAS 52 CARTAS NA MEMÓRIA
            // Garante que o PixiJS já baixe as imagens da sua pasta public/decks
            const cardUrls = [];
            for (let i = 0; i < 52; i++) {
                cardUrls.push(`/decks/c_${i}.png`);
            }
            await PIXI.Assets.load(cardUrls);

        } catch (e) {
            console.error("Erro ao carregar assets básicos do PixiJS:", e);
        }

        this.boardUI = new MeinhoBoardUI(width, height, this.backgroundLayer, this.mainLayer, this.gameState, tableTexture, this.potChipsTexture, this.POT_X, this.POT_Y);
        
        this.app.ticker.add(() => this.updateFramePixi());

        this.cardTargets.length = 0; 
        this.buildSeats(this.gameState.maxPlayers);

        this.deckInstance = new Deck(270, 420, deckTexture, true); 
        this.mainLayer.addChild(this.deckInstance.view);
        
        this.boardService.updateDeckVisibility();
        this.updateAllBalances();
    }
    
    private getAvatarTexture(url?: string): PIXI.Texture {
        if (!url) return this.avatarTextureCache.get('default') || PIXI.Texture.EMPTY;
        if (this.avatarTextureCache.has(url)) return this.avatarTextureCache.get(url)!;

        try {
            const texture = PIXI.Texture.from(url);
            this.avatarTextureCache.set(url, texture);
            return texture;
        } catch (e) {
            return this.avatarTextureCache.get('default') || PIXI.Texture.EMPTY;
        }
    }

    public buildSeats(numSeats: number) {
        this.playerSeats.forEach(seat => {
            if (seat && typeof seat.destroy === 'function') { seat.destroy(); } 
            else if (seat && seat.container && !seat.container.destroyed) {
                if (seat.container.parent) seat.container.parent.removeChild(seat.container);
                seat.container.destroy({ children: true });
            }
        });
        
        this.playerSeats = []; this.cardTargets = []; this.seatCoords = []; 

        for (let i = 0; i < numSeats; i++) {
            const coords = MeinhoHelper.getSeatCoords(numSeats, i);
            this.seatCoords[i] = { x: coords.avatarX, y: coords.avatarY };

            const player = this.gameState.players[i] || { name: 'Livre', chips: 0, isSeated: false };
            
            this.cardTargets.push({ x: coords.cx, y: coords.cy, seat: i, isLeft: true });
            this.cardTargets.push({ x: coords.cx, y: coords.cy, seat: i, isLeft: false });

            const seatUi = new PlayerSeat(
                coords.avatarX, coords.avatarY, this.getAvatarTexture(), player.name, player.chips, player.isSeated, () => this.callbacks.sitDown(i)
            );
            
            seatUi.setAsHero(player.isHero);
            
            this.mainLayer.addChild(seatUi.container);
            this.playerSeats.push(seatUi);
        }
    }

    public updatePotText(newPot: number) {
        if (this.boardUI) {
            this.boardUI.updateTexts(this.gameState.tableName, this.gameState.tableMinBuyIn, this.gameState.minBet, newPot);
            this.boardUI.animatePotIncrease(newPot);
        }
    }

    public updatePlayerSeat(seatIndex: number, isSeated: boolean, name: string, chips: number, status: string, avatarUrl?: string) {
        const seatUi = this.playerSeats[seatIndex];
        if (seatUi) {
            seatUi.setSeated(isSeated);
            seatUi.updatePlayerInfo(name, chips);
            
            const player = this.gameState.players[seatIndex];
            seatUi.setAsHero(player ? player.isHero : false);
            
            if (!isSeated && this.activeTimerSeat === seatIndex) { this.stopTimer(); }
            
            if (avatarUrl) {
                if (this.avatarTextureCache.has(avatarUrl)) {
                    const cachedTex = this.avatarTextureCache.get(avatarUrl)!;
                    if (typeof (seatUi as any).setAvatarTexture === 'function') (seatUi as any).setAvatarTexture(cachedTex);
                } else {
                    const defaultTex = this.avatarTextureCache.get('default');
                    if (defaultTex && typeof (seatUi as any).setAvatarTexture === 'function') (seatUi as any).setAvatarTexture(defaultTex);

                    PIXI.Assets.load(avatarUrl).then((texture) => {
                        this.avatarTextureCache.set(avatarUrl, texture);
                        if (typeof (seatUi as any).setAvatarTexture === 'function') (seatUi as any).setAvatarTexture(texture);
                    }).catch(e => console.error("Erro ao carregar avatar", e));
                }
            }
            
            this.boardService.refreshAvatarFilter(seatIndex);
        }
        this.boardService.updateDeckVisibility();
    }

    public updateDeckVisibility() { return this.boardService.updateDeckVisibility(); }
    public hardResetBoard() { return this.boardService.hardResetBoard(); }
    public clearPotChips() { return this.boardService.clearPotChips(); }
    public clearDealtCards() { return this.boardService.clearDealtCards(); }
    public clearPlayerCards(seatIndex: number) { return this.boardService.clearPlayerCards(seatIndex); }
    public forceRevealAllCards() { return this.boardService.forceRevealAllCards(); }
    public sweepBoard() { return this.boardService.sweepBoard(); }
    public setHeroCardsVisibility(visible: boolean) {
        this.isHeroCardsHidden = !visible;
        this.heroPixiCards.forEach(c => {
            if (c && !c.destroyed) c.visible = visible;
        });
    }

    public startTimer(seatIndex: number, timeLeftSeconds: number) {
        this.stopTimer(); 
        this.activeTimerSeat = seatIndex;
        this.ultimoBlocoTempo = -1;
        const safeTime = Math.min(timeLeftSeconds ?? this.TIMER_DURATION_SEC, this.TIMER_DURATION_SEC);
        this.turnEndTime = Date.now() + (safeTime * 1000);
        
        if (this.playerSeats[seatIndex]) {
            this.boardService.refreshAvatarFilter(seatIndex);
            if (typeof this.playerSeats[seatIndex].startTimer === 'function') this.playerSeats[seatIndex].startTimer();
        }
    }

    public stopTimer() {
        this.activeTimerSeat = -1;
        this.ultimoBlocoTempo = -1;
        this.audioService.pararSom(this.audioService.somTimer);
        this.audioService.pararSom(this.audioService.somAlarm);
        this.playerSeats.forEach(seat => { if (seat && typeof seat.stopTimer === 'function') seat.stopTimer(); });
    }

    public async performAnimation(obj: PIXI.Container, targetX: number, targetY: number, speed: number, timeElapsedOffset: number = 0) {
        if (!obj || obj.destroyed || !this.app) return Promise.resolve();

        if (timeElapsedOffset > 500) { 
             obj.x = targetX;
             obj.y = targetY;
             return Promise.resolve();
        }

        return Animator.animateTo(this.app, obj, targetX, targetY, speed);
    }

    public startGameAutomatically(isInstant: boolean = false) { return this.dealService.startGameAutomatically(isInstant); }
    public revealHeroCards() { return this.dealService.revealHeroCards(); }
    public playSkipAnimation(seatIndex: number) { return this.skipService.playSkipAnimation(seatIndex); }
    public playBetAnimation(seatIndex: number, betAmount: number, isWin: boolean, playedCards: string[], centerCardRevealed: string, timeElapsedMs: number = 0) {
        return this.betService.playBetAnimation(seatIndex, betAmount, isWin, playedCards, centerCardRevealed, timeElapsedMs);
    }
    public rechargePotAnim() { return this.betService.rechargePotAnim(); }

    public destroy() {
        this.animGeneration++;
        this.audioService.destroy();
        
        this.activeFireParticles.forEach(p => { if (p.mesh.parent) p.mesh.parent.removeChild(p.mesh); p.mesh.destroy(); });
        this.activeFireParticles.length = 0;
        this.dealtCardsUI.forEach(c => { if(c && !c.destroyed) c.destroy({ children: true }); });
        this.dealtCardsUI.length = 0;
        this.potChipsUI.forEach(c => { if(c && !c.destroyed) c.destroy({ children: true }); });
        this.potChipsUI.length = 0;
        this.heroPixiCards.forEach(c => { if(c && !c.destroyed) c.destroy({ children: true }); });
        this.heroPixiCards.length = 0;
        this.transientUI.forEach(c => { if(c && !c.destroyed) c.destroy({ children: true }); });
        this.transientUI.length = 0;

        this.playerSeats.forEach(seat => {
            if (seat && typeof seat.destroy === 'function') { seat.destroy(); } 
            else if (seat && seat.container && !seat.container.destroyed) { seat.container.destroy({ children: true }); }
        });
        this.playerSeats.length = 0;

        this.cardTargets.length = 0;
        this.seatCoords.length = 0;

        if (this.deckInstance && this.deckInstance.view && !this.deckInstance.view.destroyed) {
            this.deckInstance.view.destroy({ children: true });
            this.deckInstance = null;
        }

        if (this.boardUI) { this.boardUI = null; }

        if (this.app) { 
            this.app.destroy({ removeView: true, children: true }); 
            this.app = null;
        }
    }

    public safeDestroy(obj: PIXI.Container | null) {
        if (obj && !obj.destroyed) {
            obj.visible = false; 
            if (this.app && obj.parent) obj.parent.removeChild(obj);
            if (this.app) {
                this.pixiDelay(2000).then(() => { if (obj && !obj.destroyed) { try { obj.destroy({ children: true }); } catch (e) {} } });
            } else {
                setTimeout(() => { if (obj && !obj.destroyed) { try { obj.destroy({ children: true }); } catch (e) {} } }, 2000);
            }
        }
    }

    public pixiDelay(ms: number, expectedGen?: number): Promise<void> {
        return new Promise(resolve => {
            const genToCheck = expectedGen !== undefined ? expectedGen : this.animGeneration;
            if (genToCheck !== this.animGeneration || !this.app || !this.app.ticker) { resolve(); return; }
            let elapsed = 0;
            const tick = (ticker: PIXI.Ticker) => {
                if (genToCheck !== this.animGeneration) {
                    if (this.app && this.app.ticker) this.app.ticker.remove(tick);
                    resolve(); return;
                }
                elapsed += ticker.deltaMS;
                if (elapsed >= ms) {
                    if (this.app && this.app.ticker) { this.app.ticker.remove(tick); }
                    resolve();
                }
            };
            this.app.ticker.add(tick);
        });
    }

    private updateFramePixi() {
        if (!this.app) return;
        
        if (this.boardUI && this.lastPotTextValue !== this.gameState.pot) {
            this.boardUI.updateTexts(this.gameState.tableName, this.gameState.tableMinBuyIn, this.gameState.minBet, this.gameState.pot);
            this.lastPotTextValue = this.gameState.pot;
        }

        MeinhoHelper.updateParticles(this.activeFireParticles);

        if (this.activeTimerSeat === -1) return;
        const seatUi = this.playerSeats[this.activeTimerSeat];
        if (!seatUi) return;

        const activePlayer = this.gameState.players[this.activeTimerSeat];
        if (!activePlayer || !activePlayer.isSeated) {
            this.stopTimer();
            return;
        }

        const timeLeft = this.turnEndTime - Date.now();
        const currentSec = Math.ceil(timeLeft / 1000);

        if (timeLeft <= 0) {
            this.audioService.pararSom(this.audioService.somTimer);
            this.audioService.pararSom(this.audioService.somAlarm);
            this.ultimoBlocoTempo = -1;
            seatUi.updateTimer(0, 0);
            return;
        }

        const isHeroTurn = activePlayer && activePlayer.isHero;

        if (isHeroTurn && !document.hidden) {
            const blocoAtual = Math.ceil(currentSec / 5);

            if (blocoAtual !== this.ultimoBlocoTempo) {
                this.ultimoBlocoTempo = blocoAtual; 

                if (currentSec > 5) {
                    this.audioService.pararSom(this.audioService.somAlarm);
                    this.audioService.tocarSom(this.audioService.somTimer, false); 
                } else {
                    this.audioService.pararSom(this.audioService.somTimer);
                    this.audioService.tocarSom(this.audioService.somAlarm, false); 
                }
            }
        } else {
            this.audioService.pararSom(this.audioService.somTimer);
            this.audioService.pararSom(this.audioService.somAlarm);
            this.ultimoBlocoTempo = -1;
        }

        const progress = Math.min(1, Math.max(0, timeLeft / (this.TIMER_DURATION_SEC * 1000)));

        seatUi.updateTimer(progress, currentSec);

        if (progress > 0 && progress < 1 && Math.random() > 0.1) { 
            const tipPos = seatUi.getTimerTipPosition(progress);
            const globalX = seatUi.container.x + tipPos.x;
            const globalY = seatUi.container.y + tipPos.y;

            let color = 0x2ecc71; 
            if (progress < 0.25) color = 0xe74c3c; 
            else if (progress < 0.5) color = 0xf1c40f; 

            const p = new PIXI.Graphics();
            p.circle(0, 0, Math.random() * 3 + 2); 
            
            p.fill({ color: Math.random() > 0.7 ? 0xffffff : color, alpha: 1 });
            p.blendMode = 'add'; 
            
            p.x = globalX + (Math.random() - 0.5) * 8;
            p.y = globalY + (Math.random() - 0.5) * 8;
            
            this.particleLayer.addChild(p);
            
            this.activeFireParticles.push({
                mesh: p,
                life: 0.8 + Math.random() * 0.4,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2 - 1 
            });
        }
    }

    public playSitEffect(visualSeatIndex: number) {
        this.audioService.tocarSom(this.audioService.somSentar);
        if (this.playerSeats && this.playerSeats[visualSeatIndex]) {
            if (typeof this.playerSeats[visualSeatIndex].playSitAnimation === 'function') this.playerSeats[visualSeatIndex].playSitAnimation();
        }
    }

    public playStandEffect(visualSeatIndex: number) {
        this.audioService.tocarSom(this.audioService.somLevantar);
        if (this.playerSeats && this.playerSeats[visualSeatIndex]) {
            if (typeof this.playerSeats[visualSeatIndex].playStandAnimation === 'function') this.playerSeats[visualSeatIndex].playStandAnimation();
        }
    }

    private updateAllBalances() {
        this.gameState.players.forEach((p: any, index: number) => {
            const seatUi = this.playerSeats[index];
            if (seatUi && typeof seatUi.updatePlayerInfo === 'function') seatUi.updatePlayerInfo(p.name, p.chips);
        });
    }

    public updateHeroSeatStatus(isHeroSeated: boolean) {
        this.playerSeats.forEach(seat => {
            if (seat && typeof seat.setEmptyState === 'function') {
                seat.setEmptyState(isHeroSeated);
            }
        });
    }
}