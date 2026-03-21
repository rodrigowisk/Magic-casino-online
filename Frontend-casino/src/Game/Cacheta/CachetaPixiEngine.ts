import * as PIXI from 'pixi.js';
import { Deck } from '../Deck';
import { PlayerSeat } from './PlayerSeat';
import { Animator } from '../Animator';
import { CachetaSorter } from './CachetaSorter';
import { gsap } from 'gsap'; 

export interface CachetaEngineCallbacks {
    setDealing: (val: boolean) => void;
    setAnimating: (val: boolean) => void;
    flushPendingState: () => void;
    sitDown: (seatIndex: number) => void;
    onCardSelected: (cardStr: string | null) => void; 
    onHandReordered?: (newOrder: string[]) => void; 
    onDrawCard?: (fromDiscard: boolean) => void;
    onDiscardCard?: (cardStr: string) => void;
}

export class CachetaPixiEngine {
    public app: PIXI.Application | null = null;
    public deckInstance: Deck | null = null;
    public tableInfoTextUI: PIXI.Text | null = null;
    
    private avatarTextureCache: Map<string, PIXI.Texture> = new Map();

    public backgroundLayer = new PIXI.Container();
    public baseDeckLayer = new PIXI.Container(); 
    public mainLayer = new PIXI.Container();
    public cardLayer = new PIXI.Container(); 
    public particleLayer = new PIXI.Container();

    public monteBtnOverlay = new PIXI.Graphics();
    public lixoBtnOverlay = new PIXI.Graphics();

    public readonly VIRA_X = 165;  
    public readonly MONTE_X = 215; 
    public readonly LIXO_X = 275;  
    
    public readonly VIRA_Y = 370;
    public readonly MONTE_Y = 370;
    public readonly LIXO_Y = 370;
    public readonly CENTER_CARDS_SCALE = 1.25; 

    public cardTargets: { x: number, y: number, seat: number }[] = [];
    public dealtCardsUI: PIXI.Container[] = [];
    public playerSeats: PlayerSeat[] = [];
    public seatCoords: { x: number, y: number }[] = [];
    public activeFireParticles: { mesh: PIXI.Graphics; life: number; vx: number; vy: number; }[] = [];

    public heroCardData: { str: string, sprite: PIXI.Container }[] = [];
    
    // 👇 CONTROLE CORRIGIDO PARA IDENTIFICAR A CARTA EXATA CLICADA (MEMÓRIA) 👇
    public selectedCardStr: string | null = null;
    public selectedCardContainer: PIXI.Container | null = null;

    public viraCardUI: PIXI.Container | null = null;
    public lixoCardsUI: PIXI.Container[] = [];
    public sortBtnUI: PIXI.Container | null = null; 
    public winnerCardsUI: PIXI.Container[] = []; 
    public furouCardsUI: PIXI.Container[] = []; 

    public activeTimerSeat = -1;
    public turnEndTime = 0;
    public readonly TIMER_DURATION_SEC = 60;
    public readonly MAGIC_COLORS = [0x00f3ff, 0xa855f7, 0xff6bfb, 0xffffff];

    private isDealingCardsAnimationRunning: boolean = false;
    private lastPhaseTracker: string = 'waiting';
    private sortMode: number = 0; 
    public currentHeroScale: number = 1; 

    private draggingCardSprite: PIXI.Container | null = null;
    private dragInitialVisualX: number = 0;
    private dragInitialPointerX: number = 0;
    private dragInitialPointerY: number = 0;
    private draggingLogicalIndex: number = -1;
    private dragHasMoved: boolean = false; 
    private dragSlotsX: number[] = []; 
    
    private deckDragSprite: PIXI.Container | null = null;
    private deckDragStartX: number = 0;
    private deckDragStartY: number = 0;
    private lastDropX: number = 0;
    private lastDropY: number = 0;
    private isPeeking: boolean = false;

    private warningCardSprite: PIXI.Container | null = null;
    private warningTime: number = 0;
    private hasFiredTimeout: boolean = false; // Controle de timeout fallback

    private previousHeroCards: string[] = [];
    private previousDiscardPile: string[] = [];
    private lastTurnSeat: number = -1;


    constructor(
        public gameState: any, 
        public callbacks: CachetaEngineCallbacks
    ) {}

    public async init(
        canvasContainer: HTMLElement, 
        width: number, 
        height: number, 
        defaultAvatarImg: string, 
        deckImg: string, 
        tableImg: string
    ) {
        this.app = new PIXI.Application();
        
        await this.app.init({ 
            width, height, backgroundAlpha: 0, antialias: true,
            resolution: window.devicePixelRatio || 2, autoDensity: true 
        });

        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, width, height);

        this.app.stage.addChild(this.backgroundLayer); 
        this.app.stage.addChild(this.baseDeckLayer); 
        this.app.stage.addChild(this.mainLayer);
        this.app.stage.addChild(this.cardLayer); 
        this.app.stage.addChild(this.particleLayer); 

        canvasContainer.appendChild(this.app.canvas);

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            this.app.ticker.maxFPS = 50; 
        }

        let tableTexture = PIXI.Texture.EMPTY;
        let deckTexture = PIXI.Texture.EMPTY;

        try { if (tableImg) tableTexture = await PIXI.Assets.load(tableImg); } catch (e) { console.error("Mesa: ", e); }
        try { if (deckImg) deckTexture = await PIXI.Assets.load(deckImg); } catch (e) { console.error("Deck: ", e); }
        try { 
            if (defaultAvatarImg) {
                const defaultTex = await PIXI.Assets.load(defaultAvatarImg);
                this.avatarTextureCache.set(defaultAvatarImg, defaultTex);
                this.avatarTextureCache.set('default', defaultTex); 
            }
        } catch (e) { console.error("Avatar: ", e); }

        const tableSprite = new PIXI.Sprite(tableTexture);
        tableSprite.anchor.set(0.5); 
        
        let scale = Math.min(width / (tableTexture.width || width || 1), height / (tableTexture.height || height || 1));
        const margemFator = 1.3; 
        tableSprite.scale.set(scale * margemFator);
        tableSprite.x = width / 2;
        tableSprite.y = height / 2.1;
        
        const neonGlow = new PIXI.Graphics();
        neonGlow.ellipse(0, 0, (tableSprite.width || width) * 0.48, (tableSprite.height || height) * 0.42);
        neonGlow.fill({ color: 0x00f3ff, alpha: 0.8 }); 
        
        const blurFilter = new PIXI.BlurFilter();
        blurFilter.strength = 60; 
        neonGlow.filters = [blurFilter];
        neonGlow.x = tableSprite.x;
        neonGlow.y = tableSprite.y;
        
        this.backgroundLayer.addChild(neonGlow); 
        this.backgroundLayer.addChild(tableSprite); 

        this.tableInfoTextUI = new PIXI.Text({
            text: `JOGO: CACHETA\nMESA: ${(this.gameState.tableName || 'CARREGANDO...').toUpperCase()}\nBUY-IN: R$ ${this.gameState.tableMinBuyIn}`,
            style: { fontFamily: 'Montserrat, Arial, sans-serif', fontSize: 13, fill: 0xffffff, align: 'center', fontWeight: '800', letterSpacing: 2, lineHeight: 22 }
        } as any);
        this.tableInfoTextUI.anchor.set(0.5);
        this.tableInfoTextUI.x = 215;
        this.tableInfoTextUI.y = 580; 
        this.tableInfoTextUI.alpha = 0.25; 
        this.backgroundLayer.addChild(this.tableInfoTextUI);
        
        this.app.ticker.add(() => this.updateFramePixi());

        this.buildSeats(this.gameState.maxPlayers);

        this.deckInstance = new Deck(this.MONTE_X, this.MONTE_Y, deckTexture, true); 
        this.deckInstance.view.eventMode = 'none'; 
        this.baseDeckLayer.addChild(this.deckInstance.view);
        
        this.monteBtnOverlay.circle(0, 0, 45);
        this.monteBtnOverlay.fill({ color: 0x000000, alpha: 0.01 }); 
        this.monteBtnOverlay.x = this.MONTE_X;
        this.monteBtnOverlay.y = this.MONTE_Y;
        this.monteBtnOverlay.eventMode = 'static';
        this.monteBtnOverlay.cursor = 'pointer';


        this.monteBtnOverlay.circle(0, 0, 45);
        this.monteBtnOverlay.fill({ color: 0x000000, alpha: 0.01 }); 
        this.monteBtnOverlay.x = this.MONTE_X;
        this.monteBtnOverlay.y = this.MONTE_Y;
        this.monteBtnOverlay.eventMode = 'static';
        this.monteBtnOverlay.cursor = 'pointer';
        

        this.monteBtnOverlay.on('pointerdown', (e) => {
            if (this.activeTimerSeat === 0 && this.gameState.phase === 'betting') {
                const hero = this.gameState.players[0];
                if (hero && hero.hasDrawnThisTurn) return;

                // Salva a posição exata do clique
                this.deckDragStartX = e.global.x;
                this.deckDragStartY = e.global.y;
                
                // Cria a carta falsa para arrastar
                this.deckDragSprite = this.deckInstance!.createCardToDeal(false, "A", "♠");
                this.deckDragSprite.scale.set(1.75);
                this.deckDragSprite.x = this.MONTE_X;
                this.deckDragSprite.y = this.MONTE_Y;
                
                this.cardLayer.addChild(this.deckDragSprite);
            }
        });
        
        this.mainLayer.addChild(this.monteBtnOverlay);




        this.mainLayer.addChild(this.lixoBtnOverlay);
        
        this.updateDeckVisibility();
        this.updateAllBalances();

        this.setupGlobalDragListeners();
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
            if (typeof seat.destroy === 'function') {
                seat.destroy();
            } else {
                if (seat.container.parent) seat.container.parent.removeChild(seat.container);
                seat.container.destroy({ children: true });
            }
        });
        
        this.playerSeats = [];
        this.cardTargets = [];
        this.seatCoords = []; 

        const safeNumSeats = Math.max(2, Math.min(6, numSeats || 6));

        for (let i = 0; i < safeNumSeats; i++) {
            let avatarX = 0, avatarY = 0, cx = 0, cy = 0;

            if (safeNumSeats === 2) {
                if (i === 0) { avatarX = 220; avatarY = 738; cx = avatarX; cy = avatarY - 80; } 
                else if (i === 1) { avatarX = 212; avatarY = 93; cx = avatarX; cy = avatarY + 70; }  
            }
            else if (safeNumSeats === 3) {
                if (i === 0) { avatarX = 220; avatarY = 738; cx = avatarX; cy = avatarY - 80; } 
                else if (i === 1) { avatarX = 46; avatarY = 385; cx = avatarX + 60; cy = avatarY; }  
                else if (i === 2) { avatarX = 372; avatarY = 385; cx = avatarX - 60; cy = avatarY; } 
            }
            else if (safeNumSeats === 4) {
                if (i === 0) { avatarX = 220; avatarY = 738; cx = avatarX; cy = avatarY - 80; } 
                else if (i === 1) { avatarX = 46; avatarY = 385; cx = avatarX + 60; cy = avatarY; }  
                else if (i === 2) { avatarX = 212; avatarY = 93; cx = avatarX; cy = avatarY + 70; }  
                else if (i === 3) { avatarX = 372; avatarY = 385; cx = avatarX - 60; cy = avatarY; } 
            }
            else if (safeNumSeats === 5) {
                if (i === 0) { avatarX = 220; avatarY = 738; cx = avatarX; cy = avatarY - 80; } 
                else if (i === 1) { avatarX = 45; avatarY = 530; cx = avatarX + 60; cy = avatarY; } 
                else if (i === 2) { avatarX = 47; avatarY = 240; cx = avatarX + 60; cy = avatarY; } 
                else if (i === 3) { avatarX = 372; avatarY = 240; cx = avatarX - 60; cy = avatarY; } 
                else if (i === 4) { avatarX = 372; avatarY = 530; cx = avatarX - 60; cy = avatarY; }
            }
            else { 
                if (i === 0) { avatarX = 220; avatarY = 738; cx = avatarX; cy = avatarY - 80; } 
                else if (i === 1) { avatarX = 45; avatarY = 530; cx = avatarX + 60; cy = avatarY; } 
                else if (i === 2) { avatarX = 47; avatarY = 240; cx = avatarX + 60; cy = avatarY; } 
                else if (i === 3) { avatarX = 212; avatarY = 93; cx = avatarX; cy = avatarY + 70; } 
                else if (i === 4) { avatarX = 372; avatarY = 240; cx = avatarX - 60; cy = avatarY; } 
                else if (i === 5) { avatarX = 372; avatarY = 530; cx = avatarX - 60; cy = avatarY; }
            }

            this.seatCoords[i] = { x: avatarX, y: avatarY };
            const player = this.gameState.players[i] || { name: 'Livre', chips: 0, isSeated: false };
            this.cardTargets.push({ x: cx, y: cy, seat: i });

            const seatUi = new PlayerSeat(
                avatarX, avatarY, this.getAvatarTexture(), player.name, player.chips, player.isSeated, () => this.callbacks.sitDown(i)
            );
            this.mainLayer.addChild(seatUi.container);
            this.playerSeats.push(seatUi);
        }
    }
    
    private updateDeckVisibility() {
        if (this.deckInstance && this.gameState && this.gameState.players) {
            const seatedCount = this.gameState.players.filter((p: any) => p.isSeated).length;
            this.deckInstance.view.visible = seatedCount > 1;
            this.monteBtnOverlay.visible = seatedCount > 1;
            this.lixoBtnOverlay.visible = seatedCount > 1;
        }
    }

    public updatePlayerSeat(seatIndex: number, isSeated: boolean, name: string, chips: number, status: string, avatarUrl?: string) {
        const seatUi = this.playerSeats[seatIndex];
        if (seatUi) {
            seatUi.setSeated(isSeated);
            seatUi.updatePlayerInfo(name, chips);
            
            if (avatarUrl) {
                if (this.avatarTextureCache.has(avatarUrl)) {
                    const cachedTex = this.avatarTextureCache.get(avatarUrl)!;
                    if (typeof (seatUi as any).setAvatarTexture === 'function') {
                        (seatUi as any).setAvatarTexture(cachedTex);
                    }
                } else {
                    const defaultTex = this.avatarTextureCache.get('default');
                    if (defaultTex && typeof (seatUi as any).setAvatarTexture === 'function') {
                        (seatUi as any).setAvatarTexture(defaultTex);
                    }
                    PIXI.Assets.load(avatarUrl).then((texture) => {
                        this.avatarTextureCache.set(avatarUrl, texture);
                        if (typeof (seatUi as any).setAvatarTexture === 'function') {
                            (seatUi as any).setAvatarTexture(texture);
                        }
                    }).catch(e => console.error("Erro ao carregar avatar", e));
                }
            }
            if (isSeated && (status === 'out' || status === 'done')) {
                seatUi.darken();
            } else {
                seatUi.resetFilter(); 
            }
        }
        this.updateDeckVisibility();
    }

    public clearDealtCards() {
        this.isDealingCardsAnimationRunning = false; 
        this.resetWarningCard(); 
        this.previousHeroCards = [];
        this.previousDiscardPile = [];
        this.lastTurnSeat = -1;

        // Limpa seleção
        this.selectedCardContainer = null;
        this.selectedCardStr = null;

        const allCards = [...this.cardLayer.children];
        allCards.forEach(card => {
            this.safeDestroy(card as PIXI.Container);
        });

        if (this.viraCardUI && this.viraCardUI.parent) {
            this.safeDestroy(this.viraCardUI);
        }
        
        this.winnerCardsUI.forEach(c => this.safeDestroy(c));
        this.winnerCardsUI = [];
        this.clearFurouCards(); 

        this.heroCardData = []; 

        this.viraCardUI = null;
        this.sortBtnUI = null;

        if (this.gameState && this.gameState.players) {
            this.gameState.players.forEach((p: any) => {
                if (p) p.uiCards = []; 
            });
        }
    }

    public showFurouCards(seatIndex: number, rawCards: string[]) {
        this.clearFurouCards();
        if (!this.app || !this.deckInstance || !rawCards) return;

        const centerX = this.app.screen.width / 2;
        const centerY = this.app.screen.height / 2;
        const scale = this.CENTER_CARDS_SCALE * 0.8;

        const spread = 25;
        const startX = centerX - ((rawCards.length - 1) * spread) / 2;

        rawCards.forEach((cardStr, i) => {
            const rank = cardStr.slice(0, -1) || "A";
            const suit = cardStr.slice(-1) || "♠";
            const sprite = this.deckInstance!.createCardToDeal(true, rank, suit);
            sprite.scale.set(scale);
            
            sprite.x = this.seatCoords[seatIndex]?.x || centerX;
            sprite.y = this.seatCoords[seatIndex]?.y || centerY;
            
            sprite.tint = 0xffaaaa; 

            this.cardLayer.addChild(sprite);
            this.furouCardsUI.push(sprite);

            this.performAnimation(sprite, startX + (i * spread), centerY + 40, 15);
        });
    }

    public clearFurouCards() {
        this.furouCardsUI.forEach(c => this.safeDestroy(c));
        this.furouCardsUI = [];
    }

    public startTimer(seatIndex: number, timeLeftSeconds: number) {
        this.stopTimer(); 
        this.activeTimerSeat = seatIndex;
        this.hasFiredTimeout = false; 
        const safeTime = Math.min(timeLeftSeconds || this.TIMER_DURATION_SEC, this.TIMER_DURATION_SEC);
        this.turnEndTime = Date.now() + (safeTime * 1000);
        if (this.playerSeats[seatIndex]) this.playerSeats[seatIndex].startTimer();
    }

    public stopTimer() {
        this.activeTimerSeat = -1;
        this.playerSeats.forEach(seat => seat.stopTimer());
    }

    private drawSortButton(x: number, y: number) {
        if (this.sortBtnUI && !this.sortBtnUI.destroyed) {
            this.sortBtnUI.x = x;
            this.sortBtnUI.y = y;
            this.updateSortButtonIcon();
            return;
        }
        
        this.sortBtnUI = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.circle(0, 0, 22); 
        bg.fill({ color: 0x1a2639, alpha: 0.95 });
        bg.stroke({ width: 2, color: 0x00f3ff, alpha: 0.8 });
        
        const icon = new PIXI.Text({
            text: '⚡', 
            style: { fontSize: 18, fill: 0xffffff, align: 'center' }
        } as any);
        icon.anchor.set(0.5);
        
        this.sortBtnUI.addChild(bg);
        this.sortBtnUI.addChild(icon);
        this.sortBtnUI.x = x;
        this.sortBtnUI.y = y;
        
        this.sortBtnUI.eventMode = 'static';
        this.sortBtnUI.cursor = 'pointer';
        this.sortBtnUI.hitArea = new PIXI.Circle(0, 0, 50); 
        
        this.sortBtnUI.on('pointerdown', (e) => {
            e.stopPropagation(); 
            this.sortBtnUI!.scale.set(0.85);
            setTimeout(() => { if(this.sortBtnUI && !this.sortBtnUI.destroyed) this.sortBtnUI.scale.set(1.0); }, 100);
            
            if (this.sortMode === 0) this.sortMode = 1;
            else this.sortMode = this.sortMode === 1 ? 2 : 1;
            
            this.selectedCardContainer = null;
            this.selectedCardStr = null;
            if (this.callbacks.onCardSelected) this.callbacks.onCardSelected(null);

            this.updateSortButtonIcon();
            this.sortHeroHand();
        });
        
        this.cardLayer.addChild(this.sortBtnUI);
        this.updateSortButtonIcon();
    }

    private updateSortButtonIcon() {
        if (!this.sortBtnUI) return;
        const iconNode = this.sortBtnUI.children[1] as PIXI.Text;
        if (!iconNode) return;

        if (this.sortMode === 0 || this.sortMode === 1) iconNode.text = '⚡';
        else if (this.sortMode === 2) iconNode.text = '🌊';
    }

    private getHeroLayout(totalCards: number) {
        const screenWidth = this.app ? this.app.screen.width : window.innerWidth;
        const availableWidth = screenWidth * 0.96; 
        
        const scale = screenWidth < 600 ? 1.5 : 1.75; 
        this.currentHeroScale = scale; 
        
        return { scale, availableWidth };
    }

    private calculateHeroXPositions(cards: string[], scale: number, availableWidth: number, sortMode: number, viraCard: string): number[] {
        const positions: number[] = [];
        if (cards.length === 0) return positions;

        const baseCardWidth = 70 * scale;
        let normalStep = 23 * scale; 
        let gapExtra = 16 * scale; 

        const gaps: boolean[] = [false]; 
        
        if (sortMode === 0) {
            for (let i = 1; i < cards.length; i++) gaps.push(false);
        } else {
            let wRankVal = -1;
            let wSuit = '';
            if (viraCard) {
                wSuit = viraCard.slice(-1);
                const vRank = viraCard.slice(0, -1);
                const vVal = CachetaSorter.rankOrder[vRank] || 0;
                wRankVal = vVal === 13 ? 1 : vVal + 1;
            }

            const isWildcard = (c: string) => {
                if (!viraCard) return false;
                const r = c.slice(0, -1);
                const s = c.slice(-1);
                return (CachetaSorter.rankOrder[r] === wRankVal && s === wSuit);
            };

            const runs: { startIndex: number, length: number, isWildcard: boolean, type: string }[] = [];
            let currentRunStart = 0;

            for (let i = 1; i <= cards.length; i++) {
                let isGrouped = false;
                if (i < cards.length) {
                    const prev = cards[i - 1];
                    const curr = cards[i];
                    const pRank = prev.slice(0, -1);
                    const pSuit = prev.slice(-1);
                    const cRank = curr.slice(0, -1);
                    const cSuit = curr.slice(-1);

                    if (sortMode === 1) {
                        if (pRank === cRank) isGrouped = true;
                    } else if (sortMode === 2) {
                        if (pSuit === cSuit) {
                            const r1 = CachetaSorter.rankOrder[pRank] || 0;
                            const r2 = CachetaSorter.rankOrder[cRank] || 0;
                            if (r2 === r1 + 1 || r2 === r1) isGrouped = true;
                        }
                        if (pRank === cRank) isGrouped = true; 
                    }
                }

                if (!isGrouped || i === cards.length) {
                    const length = i - currentRunStart;
                    const wild = isWildcard(cards[currentRunStart]);
                    const type = (wild || length >= 3) ? 'VALID' : 'LIXO';
                    
                    runs.push({
                        startIndex: currentRunStart,
                        length: length,
                        isWildcard: wild,
                        type: type
                    });
                    currentRunStart = i;
                }
            }

            for (let i = 1; i < cards.length; i++) {
                const runIdx = runs.findIndex(r => r.startIndex === i);
                if (runIdx !== -1) {
                    const currentRun = runs[runIdx];
                    const prevRun = runs[runIdx - 1];
                    
                    if (prevRun && prevRun.type === 'LIXO' && currentRun.type === 'LIXO') {
                        gaps.push(false); 
                    } else {
                        gaps.push(true); 
                    }
                } else {
                    gaps.push(false);
                }
            }
        }

        const totalGaps = gaps.filter(g => g).length;
        const totalSteps = cards.length - 1;

        const expectedTotalWidth = baseCardWidth + (totalSteps * normalStep) + (totalGaps * gapExtra);
        if (expectedTotalWidth > availableWidth) {
            const reductionRatio = availableWidth / expectedTotalWidth;
            normalStep *= reductionRatio;
            gapExtra *= reductionRatio;
        }

        let currentX = 0;
        for (let i = 0; i < cards.length; i++) {
            if (gaps[i]) currentX += gapExtra;
            positions.push(currentX);
            if (i < cards.length - 1) currentX += normalStep;
        }

        return positions;
    }

    public sortHeroHand() {
        const hero = this.gameState.players.find((p: any) => p.isHero);
        if (!hero || !hero.serverCards || hero.serverCards.length === 0) return;

        let sortedArray: string[] = [];
        if (this.sortMode === 1) {
            sortedArray = CachetaSorter.getSortedCards([...hero.serverCards], this.gameState.viraCard);
        } else if (this.sortMode === 2) {
            sortedArray = CachetaSorter.getSortedCardsSequences([...hero.serverCards], this.gameState.viraCard);
        } else {
            sortedArray = [...hero.serverCards]; 
        }

        const totalCards = sortedArray.length;
        const layout = this.getHeroLayout(totalCards);
        
        const positions = this.calculateHeroXPositions(sortedArray, layout.scale, layout.availableWidth, this.sortMode, this.gameState.viraCard);
        const totalW = positions.length > 0 ? positions[positions.length - 1] : 0;
        const startOffset = -totalW / 2;

        const target = this.cardTargets.find(c => c.seat === hero.seat);
        if (!target) return;

        const targetY = (this.seatCoords[0]?.y || 0) - 115;

        const newHeroCardData: any[] = [];
        const availableSprites = [...this.heroCardData]; 

        sortedArray.forEach((cardStr: string, index: number) => {
            const spriteIndex = availableSprites.findIndex(c => c.str === cardStr);
            if (spriteIndex !== -1) {
                const cardData = availableSprites[spriteIndex];
                availableSprites.splice(spriteIndex, 1); 

                newHeroCardData.push(cardData);
                const finalX = target.x + startOffset + positions[index];
                
                // 👇 COMPARAÇÃO DIRETA PELO CONTAINER (Identifica duplicatas corretamente) 👇
                const isSelected = (this.selectedCardContainer === cardData.sprite);
                const finalY = isSelected ? targetY - 25 : targetY;

                gsap.to(cardData.sprite, { x: finalX, y: finalY, duration: 0.4, ease: "power2.out" });
            }
        });
        
        this.heroCardData = newHeroCardData;
        
        if (hero && hero.serverCards) {
            hero.serverCards = this.heroCardData.map(c => c.str);
            if (this.callbacks.onHandReordered) {
                this.callbacks.onHandReordered(hero.serverCards);
            }
        }

        this.heroCardData.forEach((c) => {
            this.cardLayer.addChild(c.sprite);
        });

        this.setupAllDragEvents();
    }

    public syncBoard() {
        if (!this.deckInstance || !this.app) return;

        const activePlayersCount = this.gameState.players.filter((p: any) => p.isSeated && p.status === 'playing').length;
        if (activePlayersCount === 0) {
            this.clearDealtCards();
            return;
        }

        if (this.gameState.phase === 'dealing' && this.lastPhaseTracker !== 'dealing') {
            this.lastPhaseTracker = 'dealing';
            this.startGameAutomatically();
            return;
        }
        
        if (this.gameState.phase === 'resolving') {
            this.clearDealtCards();
            const possibleWinner = this.gameState.players.find((p:any) => p.isSeated && p.status === 'playing' && p.serverCards && p.serverCards.length >= 9);
            if (possibleWinner) {
                const visualSeat = this.cardTargets.find(c => c.seat === possibleWinner.seat)?.seat;
                if (visualSeat !== undefined) {
                    this.darkenBoardForWinner(visualSeat);
                    this.showWinnerCards(visualSeat, possibleWinner.serverCards);
                }
            }
            return; 
        }

        this.lastPhaseTracker = this.gameState.phase;

        if (this.isDealingCardsAnimationRunning) return;
        
        // 👇 CORREÇÃO: Força a atualização se o tempo acabar enquanto estiver arrastando 👇
        if (this.draggingCardSprite) {
            const hero = this.gameState.players.find((p: any) => p.isHero);
            
            // Se o servidor passou a vez (não é mais o nosso turno), aborta o arrasto!
            if (this.gameState.currentTurnSeat !== hero?.seat) {
                this.draggingCardSprite = null;
                this.draggingLogicalIndex = -1;
            } else {
                return; // Se ainda é nossa vez, continua ignorando para o arrasto ser fluído
            }
        }

        const allCards = [...this.cardLayer.children];


        allCards.forEach(card => {
            this.safeDestroy(card as PIXI.Container);
        });
        
        this.selectedCardContainer = null;
        this.selectedCardStr = null;
        
        this.heroCardData = []; 
        this.lixoCardsUI = [];
        
        if (this.viraCardUI && this.viraCardUI.parent) this.safeDestroy(this.viraCardUI);
        this.viraCardUI = null;
        this.sortBtnUI = null;

        const hero = this.gameState.players.find((p: any) => p.isHero);
        const currentDiscardPile = this.gameState.discardPile || [];
        
        if (this.gameState.viraCard) {
            const rank = this.gameState.viraCard.slice(0, -1) || "A";
            const suit = this.gameState.viraCard.slice(-1) || "♠";
            this.viraCardUI = this.deckInstance.createCardToDeal(true, rank, suit);
            this.viraCardUI.scale.set(this.CENTER_CARDS_SCALE); 
            this.viraCardUI.x = this.VIRA_X;
            this.viraCardUI.y = this.VIRA_Y;
            this.viraCardUI.rotation = Math.PI / -2; 
            this.viraCardUI.eventMode = 'none';

            this.baseDeckLayer.addChildAt(this.viraCardUI, 0);
        }

        const maxShow = Math.min(3, currentDiscardPile.length);
        for (let i = maxShow - 1; i >= 0; i--) {
            const cardStr = currentDiscardPile[currentDiscardPile.length - 1 - i];
            const rank = cardStr.slice(0, -1) || "A";
            const suit = cardStr.slice(-1) || "♠";
            const lixoCard = this.deckInstance.createCardToDeal(true, rank, suit);
            
            lixoCard.scale.set(this.CENTER_CARDS_SCALE); 
            lixoCard.eventMode = 'none'; 

            const isNewDiscard = i === 0 && !this.previousDiscardPile.includes(cardStr) && this.previousDiscardPile.length > 0;
            const wasHeroTimeout = this.lastTurnSeat === hero?.seat && this.gameState.currentTurnSeat !== hero?.seat;

            if (isNewDiscard && this.lastPhaseTracker !== 'dealing') {
                if (wasHeroTimeout) {
                    lixoCard.x = this.MONTE_X;
                    lixoCard.y = this.MONTE_Y;
                    const heroFrontX = (this.seatCoords[0]?.x || 0);
                    const heroFrontY = (this.seatCoords[0]?.y || 0) - 80;
                    
                    const tl = gsap.timeline();
                    tl.to(lixoCard, { x: heroFrontX, y: heroFrontY, duration: 0.25, ease: "power2.out" })
                      .to(lixoCard, { y: heroFrontY - 35, duration: 0.15, ease: "power1.inOut" })
                      .to(lixoCard, { x: this.LIXO_X, y: this.LIXO_Y, duration: 0.25, ease: "power2.in" });
                } else {
                    const sourceSeat = this.cardTargets.find(c => c.seat === this.lastTurnSeat);
                    if (sourceSeat) {
                        lixoCard.x = sourceSeat.x;
                        lixoCard.y = sourceSeat.y;
                        gsap.to(lixoCard, { x: this.LIXO_X, y: this.LIXO_Y, duration: 0.3, ease: "power2.out" });
                    } else {
                        lixoCard.x = this.LIXO_X; 
                        lixoCard.y = this.LIXO_Y;
                    }
                }
            } else {
                lixoCard.x = this.LIXO_X; 
                lixoCard.y = this.LIXO_Y; 
            }
            
            this.cardLayer.addChild(lixoCard);
            this.lixoCardsUI.push(lixoCard);
        }

        for (let i = 0; i < this.gameState.maxPlayers; i++) {
            const player = this.gameState.players[i];
            if (player && player.isSeated && player.status === 'playing') {
                const target = this.cardTargets.find(c => c.seat === i);
                if (!target) continue;

                const isTargetHero = player.isHero;
                
                if (!isTargetHero) {
                    if (!player.uiCards) player.uiCards = []; 
                    continue; 
                }

                let cardsToRender = player.serverCards ? [...player.serverCards] : [];
                
                const isDrawing = (cardsToRender.length > this.previousHeroCards.length) && this.previousHeroCards.length > 0 && this.lastPhaseTracker !== 'dealing';
                if (isDrawing && this.sortMode !== 0) {
                    this.sortMode = 0;
                    this.updateSortButtonIcon();
                }

                if (this.sortMode === 1 && cardsToRender.length > 0) {
                    cardsToRender = CachetaSorter.getSortedCards(cardsToRender, this.gameState.viraCard);
                } else if (this.sortMode === 2 && cardsToRender.length > 0) {
                    cardsToRender = CachetaSorter.getSortedCardsSequences(cardsToRender, this.gameState.viraCard);
                }

                const totalCards = cardsToRender.length > 0 ? cardsToRender.length : 9;
                const layout = this.getHeroLayout(totalCards);
                const positions = this.calculateHeroXPositions(cardsToRender, layout.scale, layout.availableWidth, this.sortMode, this.gameState.viraCard);
                const totalW = positions.length > 0 ? positions[positions.length - 1] : 0;
                const startOffset = -totalW / 2;
                
                const targetY = (this.seatCoords[0]?.y || 0) - 115;

                for (let c = 0; c < totalCards; c++) {
                    const cardStr = cardsToRender.length > 0 ? cardsToRender[c] : "A♠";
                    const rank = cardStr ? (cardStr.slice(0, -1) || "A") : "A";
                    const suit = cardStr ? (cardStr.slice(-1) || "♠") : "♠";

                    const cardSprite = this.deckInstance.createCardToDeal(true, rank, suit);
                    
                    const finalX = target.x + startOffset + (positions[c] || 0);
                    const finalY = targetY;


                    const isNewCard = isDrawing && (c === cardsToRender.length - 1);

if (isNewCard) {
                    const cameFromLixo = this.previousDiscardPile.includes(cardStr);
                    
                    this.selectedCardContainer = cardSprite;
                    this.selectedCardStr = cardStr;
                    if (this.callbacks.onCardSelected) this.callbacks.onCardSelected(this.selectedCardStr);
                    
                    const liftedY = targetY - 25;
                    
                    if (!cameFromLixo && this.isPeeking) {
                        // 👇 MÁGICA DO FILAR 👇
                        this.isPeeking = false; 
                        cardSprite.visible = false; 
                        
                        const faceDownCard = this.deckInstance.createCardToDeal(false, "A", "♠");
                        faceDownCard.scale.set(this.CENTER_CARDS_SCALE);
                        faceDownCard.x = this.MONTE_X;
                        faceDownCard.y = this.MONTE_Y;
                        this.mainLayer.addChild(faceDownCard);

                        const peekY = this.MONTE_Y + 110; 
                        
                        gsap.to(faceDownCard, { y: peekY, duration: 0.25, ease: "power2.out", onComplete: () => {
                            let isShrinking = true;
                            const flipAnim = () => {
                                if (!this.app || !this.app.ticker) return;
                                if (isShrinking) {
                                    faceDownCard.scale.x -= 0.15;
                                    if (faceDownCard.scale.x <= 0) {
                                        isShrinking = false;
                                        cardSprite.x = faceDownCard.x;
                                        cardSprite.y = faceDownCard.y;
                                        cardSprite.scale.x = 0;
                                        cardSprite.scale.y = this.CENTER_CARDS_SCALE; // Mantém tamanho do monte
                                        cardSprite.visible = true; 
                                        this.safeDestroy(faceDownCard);

                                        const growAnim = () => {
                                            if (!this.app || !this.app.ticker) return;
                                            cardSprite.scale.x += 0.15;
                                            if (cardSprite.scale.x >= this.CENTER_CARDS_SCALE) {
                                                cardSprite.scale.x = this.CENTER_CARDS_SCALE;
                                                this.app.ticker.remove(growAnim);

                                                // Suspense e voa pro leque diminuindo a escala
                                                gsap.to(cardSprite, { x: finalX, y: liftedY, scale: layout.scale, duration: 0.35, ease: "back.out(1.2)", delay: 0.6 });
                                            }
                                        };
                                        this.app.ticker.remove(flipAnim);
                                        this.app.ticker.add(growAnim);
                                    }
                                }
                            };
                            if (this.app) this.app.ticker.add(flipAnim);
                        }});

                    } else {
                        // 👇 MÁGICA DA CONTINUAÇÃO DO ARRASTO OU SAQUE DO LIXO 👇
                        // Se não veio do lixo, a carta começa exatamente onde o dedo do usuário soltou!
                        cardSprite.x = cameFromLixo ? this.LIXO_X : (this.lastDropX || this.MONTE_X);
                        cardSprite.y = cameFromLixo ? this.LIXO_Y : (this.lastDropY || this.MONTE_Y);
                        cardSprite.scale.set(this.CENTER_CARDS_SCALE); // Mantém o tamanho do monte no inicio do voo
                        
                        // Mantém a inclinação realista que o drag gerou
                        cardSprite.rotation = cameFromLixo ? 0 : ((cardSprite.x - this.MONTE_X) * 0.03) * (Math.PI / 180);

                        this.lastDropX = 0;
                        this.lastDropY = 0;

                        const tl = gsap.timeline();
                        // Anima para o leque corrigindo escala e rotação perfeitamente!
                        tl.to(cardSprite, { x: finalX, y: targetY + 60, scale: layout.scale * 1.1, rotation: 0, duration: 0.25, ease: "power2.out" })
                          .to(cardSprite, { y: liftedY, scale: layout.scale, duration: 0.2, ease: "back.out(1.2)" });
                    }
                    
                } else {
                    cardSprite.scale.set(layout.scale);
                    cardSprite.x = finalX;
                    cardSprite.y = finalY;
                }

                    this.heroCardData.push({ str: cardStr, sprite: cardSprite });
                    this.cardLayer.addChild(cardSprite);
                    
                    if (!player.uiCards) player.uiCards = [];
                    player.uiCards.push(cardSprite);
                }

                this.heroCardData.forEach((c) => {
                    this.cardLayer.addChild(c.sprite);
                });

                this.setupAllDragEvents();
                
                this.drawSortButton(target.x + startOffset - 10, targetY + 80);
            }
        }

        this.previousHeroCards = hero && hero.serverCards ? [...hero.serverCards] : [];
        this.previousDiscardPile = this.gameState.discardPile ? [...this.gameState.discardPile] : [];
        this.lastTurnSeat = this.gameState.currentTurnSeat;
    }

    private setupAllDragEvents() {
        this.heroCardData.forEach((c, idx) => {
            c.sprite.removeAllListeners();
            c.sprite.eventMode = 'static';
            c.sprite.cursor = 'pointer';
            
            c.sprite.on('pointerdown', (e) => {
                e.stopPropagation(); 
                this.onHeroDragStart(e, c.sprite, idx);
            });
        });
    }

    private onHeroDragStart(event: PIXI.FederatedPointerEvent, cardContainer: PIXI.Container, index: number) {
        if (this.isDealingCardsAnimationRunning || this.draggingCardSprite) return;
        
        this.draggingCardSprite = cardContainer;
        this.draggingLogicalIndex = index;
        this.dragInitialPointerX = event.global.x;
        this.dragInitialPointerY = event.global.y;
        this.dragHasMoved = false; 

        this.dragSlotsX = this.heroCardData.map(c => c.sprite.x);
        this.dragInitialVisualX = cardContainer.x;

        this.cardLayer.setChildIndex(cardContainer, this.cardLayer.children.length - 1);

        gsap.to(cardContainer.scale, { x: this.currentHeroScale * 0.96, y: this.currentHeroScale * 0.96, duration: 0.15 });
        cardContainer.alpha = 1.0; 

        const sprite = cardContainer.children[0] as PIXI.Sprite;
        if(sprite) gsap.to(sprite, { angle: -6, duration: 0.15 });

        const targetY = (this.seatCoords[0]?.y || 0) - 115;
        gsap.to(cardContainer, { y: targetY + 23, duration: 0.15, ease: "power2.out" });
    }

    private onHeroDragMove(event: PIXI.FederatedPointerEvent) {

        if (this.deckDragSprite) {
            const dx = event.global.x - this.deckDragStartX;
            const dy = event.global.y - this.deckDragStartY;
            
            // Permite arrastar livremente (X e Y)
            this.deckDragSprite.x = this.MONTE_X + dx;
            this.deckDragSprite.y = this.MONTE_Y + dy;
            
            // Gira a carta levemente com base no X, dando um efeito super realista de estar "pendurada"
            this.deckDragSprite.rotation = (dx * 0.03) * (Math.PI / 180);
            return;
        }

        if (!this.draggingCardSprite) return;

        const dx = event.global.x - this.dragInitialPointerX;
        const dy = event.global.y - this.dragInitialPointerY;
        
        if (!this.dragHasMoved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
            this.dragHasMoved = true;
        }

        if (!this.dragHasMoved) return; 

        this.cardLayer.setChildIndex(this.draggingCardSprite, this.cardLayer.children.length - 1); 

        const draggedX = this.dragInitialVisualX + dx;
        const standardY = (this.seatCoords[0]?.y || 0) - 115;

        this.draggingCardSprite.x = draggedX;
        this.draggingCardSprite.y = standardY + 23; 

        let closestIndex = this.draggingLogicalIndex;
        let minDistance = Infinity;
        for (let i = 0; i < this.dragSlotsX.length; i++) {
            const dist = Math.abs(draggedX - this.dragSlotsX[i]);
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = i;
            }
        }

        if (closestIndex !== this.draggingLogicalIndex) {
            const draggedData = this.heroCardData.splice(this.draggingLogicalIndex, 1)[0];
            this.heroCardData.splice(closestIndex, 0, draggedData);

            if (this.selectedCardContainer === this.draggingCardSprite) {
                // Mantém selecionado em drag
            } else if (this.selectedCardContainer === this.heroCardData[this.draggingLogicalIndex].sprite) {
                // Ignora mudança de selection
            }

            this.heroCardData.forEach((c, idx) => {
                if (c.sprite !== this.draggingCardSprite) {
                    gsap.to(c.sprite, {
                        x: this.dragSlotsX[idx],
                        duration: 0.2,
                        ease: "power2.out",
                        overwrite: "auto" 
                    });
                }
            });
            this.draggingLogicalIndex = closestIndex;
        }
    }

    private onHeroDragEnd(event: PIXI.FederatedPointerEvent) {

        if (this.deckDragSprite) {
            const dropX = this.deckDragSprite.x;
            const dropY = this.deckDragSprite.y;
            
            // Calcula o quanto o dedo se moveu
            const dx = event.global.x - this.deckDragStartX;
            const dy = event.global.y - this.deckDragStartY;
            const dist = Math.sqrt(dx*dx + dy*dy);

            const targetY = (this.seatCoords[0]?.y || 0) - 115;
            const THRESHOLD_Y = targetY - 80; // Linha de aproximação do leque

            if (dist < 10) {
                // CLIQUE SIMPLES: Distância do dedo foi muito curta -> Filar!
                this.safeDestroy(this.deckDragSprite);
                this.deckDragSprite = null;
                this.isPeeking = true;
                if (this.callbacks.onDrawCard) this.callbacks.onDrawCard(false);

            } else if (dropY >= THRESHOLD_Y) {
                // ARRASTOU COM SUCESSO: Passou da linha imaginária -> Compra direta!
                this.lastDropX = dropX;
                this.lastDropY = dropY;
                
                this.safeDestroy(this.deckDragSprite);
                this.deckDragSprite = null;
                this.isPeeking = false;
                if (this.callbacks.onDrawCard) this.callbacks.onDrawCard(false);

            } else {
                // DESISTIU: Arrastou mas soltou antes de chegar na mão -> Retorna ao monte
                const sprite = this.deckDragSprite;
                this.deckDragSprite = null;
                gsap.to(sprite, {
                    x: this.MONTE_X,
                    y: this.MONTE_Y,
                    rotation: 0,
                    duration: 0.3,
                    ease: "back.out(1.2)",
                    onComplete: () => this.safeDestroy(sprite)
                });
            }
            return;
        }

        if (!this.draggingCardSprite) return;

        const card = this.draggingCardSprite;
        const logicalIndex = this.draggingLogicalIndex;
        this.draggingCardSprite = null; 

        gsap.to(card.scale, { x: this.currentHeroScale, y: this.currentHeroScale, duration: 0.2 });
        card.alpha = 1.0;
        
        const sprite = card.children[0] as PIXI.Sprite;
        if(sprite) gsap.to(sprite, { angle: 0, duration: 0.2 });

        const standardY = (this.seatCoords[0]?.y || 0) - 115;

        if (this.dragHasMoved && event.global.y < standardY - 50) {
            const cardStr = this.heroCardData[logicalIndex].str;
            
            if (this.callbacks.onDiscardCard) {
                this.callbacks.onDiscardCard(cardStr);
            }
            
            gsap.to(card, { x: this.dragSlotsX[logicalIndex], y: standardY, duration: 0.2, ease: "power2.out" });
            this.draggingLogicalIndex = -1;
            this.heroCardData.forEach((c) => { this.cardLayer.addChild(c.sprite); });
            this.setupAllDragEvents();
            return;
        }

        if (!this.dragHasMoved) {
            this.onHeroCardClicked(this.heroCardData[logicalIndex].str, card);
            card.x = this.dragSlotsX[logicalIndex]; 
            card.y = standardY; 
            
            this.draggingLogicalIndex = -1;
            this.heroCardData.forEach((c) => {
                this.cardLayer.addChild(c.sprite);
            });
            this.setupAllDragEvents(); 
        } else {
            this.selectedCardContainer = null;
            this.selectedCardStr = null;
            if (this.callbacks.onCardSelected) this.callbacks.onCardSelected(null);

            gsap.to(card, {
                x: this.dragSlotsX[logicalIndex],
                y: standardY, 
                duration: 0.2,
                ease: "power2.out",
                onComplete: () => {
                    this.draggingLogicalIndex = -1;
                    this.heroCardData.forEach((c) => {
                        this.cardLayer.addChild(c.sprite);
                    });
                    this.setupAllDragEvents(); 
                }
            });

            const hero = this.gameState.players.find((p: any) => p.isHero);
            if (hero && hero.serverCards) {
                hero.serverCards = this.heroCardData.map(c => c.str);
                if (this.callbacks.onHandReordered) {
                    this.callbacks.onHandReordered(hero.serverCards);
                }
            }
        }
    }

    private launchCardAnimation(card: PIXI.Container, targetX: number, targetY: number, trailColor: number) {
        const trailAnim = () => {
            if (!this.app || card.destroyed) return;
            const p = new PIXI.Graphics();
            p.circle(0, 0, 3);
            p.fill({ color: trailColor, alpha: 0.6 });
            p.x = card.x;
            p.y = card.y;
            this.particleLayer.addChild(p);
            this.activeFireParticles.push({
                mesh: p, life: 0.6, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5
            });
        };
        if (this.app) this.app.ticker.add(trailAnim);

        this.performAnimation(card, targetX, targetY, 25).then(() => {
            if (this.app) this.app.ticker.remove(trailAnim);
        }).catch(() => {
            if (this.app) this.app.ticker.remove(trailAnim);
        });
    }

    private async performAnimation(obj: PIXI.Container, targetX: number, targetY: number, speed: number) {
        if (!obj || obj.destroyed || !this.app) return Promise.resolve();
        if (document.hidden) {
            obj.x = targetX;
            obj.y = targetY;
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
            gsap.to(obj, {
                x: targetX,
                y: targetY,
                duration: 0.35, 
                ease: "power2.out",
                onComplete: () => resolve()
            });
        });
    }

    private pixiDelay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async startGameAutomatically() {
        if (this.isDealingCardsAnimationRunning) return;
        this.callbacks.setDealing(true);
        this.callbacks.setAnimating(true); 
        this.sortMode = 0; 
        if(this.sortBtnUI) this.updateSortButtonIcon();
        
        try {
            this.resetAvatars();
            this.clearDealtCards();

            this.isDealingCardsAnimationRunning = true; 
            
            const dealOrder: number[] = [];
            for (let i = 0; i < this.gameState.maxPlayers; i++) {
                if (this.gameState.players[i] && this.gameState.players[i].isSeated && this.gameState.players[i].status === 'playing') {
                    dealOrder.push(i);
                }
            }

            for (let round = 0; round < 3; round++) {
                if (!this.isDealingCardsAnimationRunning) break; 

                for (const seatIndex of dealOrder) {
                    if (!this.isDealingCardsAnimationRunning) break; 

                    const player = this.gameState.players[seatIndex];
                    const isTargetHero = player.isHero;
                    
                    if (!isTargetHero) continue;

                    const target = this.cardTargets.find(c => c.seat === seatIndex);
                    if (!target || !this.app || !this.deckInstance) continue;

                    const totalCards = 9;
                    const layout = this.getHeroLayout(totalCards);
                    const positions = this.calculateHeroXPositions(player.serverCards || [], layout.scale, layout.availableWidth, this.sortMode, this.gameState.viraCard);
                    const totalW = positions.length > 0 ? positions[positions.length - 1] : 0;
                    const startOffset = -totalW / 2;
                    const targetY = (this.seatCoords[0]?.y || 0) - 115;

                    for (let c = 0; c < 3; c++) {
                        if (!this.isDealingCardsAnimationRunning) break; 

                        const cardIndex = (round * 3) + c;
                        const finalX = target.x + startOffset + positions[cardIndex];

                        const cardStr = player.serverCards ? player.serverCards[cardIndex] : "A♠";
                        const rank = cardStr ? (cardStr.slice(0, -1) || "A") : "A";
                        const suit = cardStr ? (cardStr.slice(-1) || "♠") : "♠";

                        const card = this.deckInstance.createCardToDeal(true, rank, suit);
                        card.scale.set(layout.scale);

                        card.x = this.MONTE_X;
                        card.y = this.MONTE_Y;

                        this.cardLayer.addChild(card);
                        this.heroCardData.push({ str: cardStr, sprite: card });

                        if (!player.uiCards) player.uiCards = [];
                        player.uiCards.push(card);

                        this.launchCardAnimation(card, finalX, targetY, 0x00f3ff);
                        await this.pixiDelay(50);
                    }
                    
                    if (round === 2) {
                        this.heroCardData.forEach((c) => {
                            this.cardLayer.addChild(c.sprite);
                        });
                        this.setupAllDragEvents();
                        this.drawSortButton(target.x + startOffset - 10, targetY + 80);
                    }

                    await this.pixiDelay(150); 
                }
            }

            if (this.isDealingCardsAnimationRunning && this.gameState.viraCard) {
                const vRank = this.gameState.viraCard.slice(0, -1) || "A";
                const vSuit = this.gameState.viraCard.slice(-1) || "♠";
                const viraCard = this.deckInstance!.createCardToDeal(true, vRank, vSuit);
                
                viraCard.scale.set(this.CENTER_CARDS_SCALE);
                viraCard.x = this.MONTE_X;
                viraCard.y = this.MONTE_Y;
                viraCard.rotation = Math.PI / -2; 
                viraCard.eventMode = 'none';

                this.baseDeckLayer.addChildAt(viraCard, 0);

                this.launchCardAnimation(viraCard, this.VIRA_X, this.VIRA_Y, 0xff6bfb);

                await this.pixiDelay(200);
                this.viraCardUI = viraCard;
            }

        } catch (err) {
            console.error("Erro seguro ignorado na animação: ", err);
        } finally {
            const wasAborted = !this.isDealingCardsAnimationRunning;
            this.isDealingCardsAnimationRunning = false;
            this.callbacks.setDealing(false);
            this.callbacks.setAnimating(false);
            this.callbacks.flushPendingState();

            if (!wasAborted) {
                this.syncBoard(); 
            }
        }
    }

    public destroy() {
        this.resetWarningCard();
        
        this.activeFireParticles.forEach(p => {
            if (p.mesh.parent) p.mesh.parent.removeChild(p.mesh);
            p.mesh.destroy();
        });
        this.activeFireParticles.length = 0;
        
        gsap.killTweensOf(this.heroCardData.map(c => c.sprite));

        if (this.app) { 
            this.app.destroy({ removeView: true, children: true, texture: true, baseTexture: true }); 
            this.app = null;
        }
    }

    private applyWarningToLastCard(seatIndex: number) {
        const player = this.gameState.players.find((p: any) => p.seat === seatIndex);
        if (!player) return;

        let targetContainer: PIXI.Container | null = null;

        if (player.isHero && this.heroCardData.length > 0) {
            targetContainer = this.heroCardData[this.heroCardData.length - 1].sprite;
        } else if (player.uiCards && player.uiCards.length > 0) {
            targetContainer = player.uiCards[player.uiCards.length - 1];
        }

        if (!targetContainer) return;

        if (this.warningCardSprite !== targetContainer) {
            this.resetWarningCard();
            this.warningCardSprite = targetContainer;
        }

        this.warningTime += 0.15;
        const pulse = 0.6 + Math.abs(Math.sin(this.warningTime)) * 0.4;

        const sprite = this.warningCardSprite.children[0] as PIXI.Sprite;
        if (sprite && !sprite.destroyed) {
            sprite.tint = 0xff6666; 
            sprite.alpha = pulse;
        }
    }

    public resetWarningCard() {
        if (this.warningCardSprite) {
            const sprite = this.warningCardSprite.children[0] as PIXI.Sprite;
            if (sprite && !sprite.destroyed) {
                sprite.tint = 0xffffff;
                sprite.alpha = 1.0;
            }
            this.warningCardSprite = null;
        }
    }

private updateFramePixi() {
        if (!this.app) return;
        
        if (this.tableInfoTextUI) {
            this.tableInfoTextUI.text = `JOGO: CACHETA\nMESA: ${(this.gameState.tableName || 'CARREGANDO...').toUpperCase()}\nBUY-IN: R$ ${this.gameState.tableMinBuyIn}`;
        }

        for (let i = this.activeFireParticles.length - 1; i >= 0; i--) {
            const p = this.activeFireParticles[i];
            p.life -= 0.05; 
            p.mesh.alpha = Math.max(0, p.life);
            p.mesh.x += p.vx;
            p.mesh.y += p.vy;
            p.mesh.scale.set(Math.max(0, p.life));

            if (p.life <= 0) {
                if (p.mesh.parent) p.mesh.parent.removeChild(p.mesh);
                p.mesh.destroy();
                this.activeFireParticles.splice(i, 1);
            }
        }

        if (this.activeTimerSeat === -1) {
            this.resetWarningCard();
            return;
        }
        
        const seatUi = this.playerSeats[this.activeTimerSeat];
        if (!seatUi) return;

        const timeLeft = this.turnEndTime - Date.now();

        if (timeLeft <= 0) {
            seatUi.updateTimer(0, 0);
            this.resetWarningCard();

            // 👇 SISTEMA ANTI-ZOMBIE (Auto Descarte no Frontend se o Backend falhar) 👇
            if (timeLeft < -1500 && !this.hasFiredTimeout) {
                this.hasFiredTimeout = true;
                const hero = this.gameState.players.find((p: any) => p.isHero);
                if (hero && hero.seat === this.activeTimerSeat && this.gameState.phase === 'betting') {
                    
                    // Aborta o arrasto para liberar a carta para o descarte automático
                    if (this.draggingCardSprite) {
                        this.draggingCardSprite = null;
                        this.draggingLogicalIndex = -1;
                    }
                    
                    if (!hero.hasDrawnThisTurn && this.callbacks.onDrawCard) {
                        this.callbacks.onDrawCard(false); // Puxa do monte
                        setTimeout(() => {
                            if (this.callbacks.onDiscardCard && this.heroCardData.length > 0) {
                                this.callbacks.onDiscardCard(this.heroCardData[this.heroCardData.length - 1].str); // Descarta a última
                            }
                        }, 800);
                    } else if (this.callbacks.onDiscardCard && this.heroCardData.length > 0) {
                        this.callbacks.onDiscardCard(this.heroCardData[this.heroCardData.length - 1].str);
                    }
                }
            }
            return;
        }

        const progress = Math.min(1, Math.max(0, timeLeft / (this.TIMER_DURATION_SEC * 1000)));
        const secLeft = Math.ceil(timeLeft / 1000);

        seatUi.updateTimer(progress, secLeft);

        // 👇 NOVO: Limite dinâmico (25%) e folga de 500ms para a animação estabilizar antes de piscar
        const thresholdMs = (this.TIMER_DURATION_SEC * 1000) * 0.25;
        const blinkMs = thresholdMs - 500;

        if (timeLeft <= blinkMs && timeLeft > 0) {
            this.applyWarningToLastCard(this.activeTimerSeat);
        } else {
            this.resetWarningCard();
        }

        if (progress > 0 && timeLeft > 0) {
            const tipPos = seatUi.getTimerTipPosition(progress);

            for (let i = 0; i < 2; i++) {
                const color = this.MAGIC_COLORS[Math.floor(Math.random() * this.MAGIC_COLORS.length)];
                const pX = tipPos.x + (Math.random() - 0.5) * 4;
                const pY = tipPos.y + (Math.random() - 0.5) * 4;
                
                const p = new PIXI.Graphics();
                const size = Math.random() * 3 + 1.5;
                p.circle(0, 0, size);
                p.fill({ color, alpha: 0.8 });
                p.x = pX;
                p.y = pY;
                
                seatUi.container.addChild(p);
                this.activeFireParticles.push({ mesh: p, life: 1.0, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * -2 - 0.5 });
            }
        }
    }

    private darkenAvatar(seatIndex: number) {
        const seatUi = this.playerSeats[seatIndex];
        if (seatUi) seatUi.darken();
    }

    private resetAvatars() {
        this.playerSeats.forEach(seat => seat.resetFilter());
    }

    private updateAllBalances() {
        this.gameState.players.forEach((p: any, index: number) => {
            const seatUi = this.playerSeats[index];
            if (seatUi) seatUi.updatePlayerInfo(p.name, p.chips);
        });
    }

    public updateHeroSeatStatus(isHeroSeated: boolean) {
        this.playerSeats.forEach(seat => {
            if (seat) seat.setEmptyState(isHeroSeated);
        });
    }

    public darkenBoardForWinner(winnerSeat: number) {
        const darkAlpha = 0.35; 
        this.playerSeats.forEach((seat, index) => {
            if (index !== winnerSeat) seat.container.alpha = darkAlpha;
            else seat.container.scale.set(1.1);
        });

        if (this.deckInstance) this.deckInstance.view.alpha = darkAlpha;
        if (this.viraCardUI) this.viraCardUI.alpha = darkAlpha;
        this.lixoCardsUI.forEach(c => c.alpha = darkAlpha);

        this.gameState.players.forEach((p: any, index: number) => {
            if (index !== winnerSeat && p.uiCards) {
                p.uiCards.forEach((c: any) => c.alpha = darkAlpha);
            }
        });
    }

    public resetBoardColors() {
        this.playerSeats.forEach(seat => {
            seat.container.alpha = 1.0;
            seat.container.scale.set(1.0);
        });

        if (this.deckInstance) this.deckInstance.view.alpha = 1.0;
        if (this.viraCardUI) this.viraCardUI.alpha = 1.0;
        this.lixoCardsUI.forEach(c => c.alpha = 1.0);

        this.gameState.players.forEach((p: any) => {
            if (p.uiCards) p.uiCards.forEach((c: any) => c.alpha = 1.0);
        });
        
        this.winnerCardsUI.forEach(c => this.safeDestroy(c));
        this.winnerCardsUI = [];
    }

    public showWinnerCards(winnerSeat: number, rawCards: string[]) {
        if (!this.app || !this.deckInstance || !rawCards) return;

        const groups = CachetaSorter.getWinningGroups([...rawCards], this.gameState.viraCard);

        const centerX = this.app.screen.width / 2;
        const centerY = this.app.screen.height / 2;
        const scale = this.CENTER_CARDS_SCALE * 0.9; 

        const overlap = 25; 
        const groupGap = 40; 
        const cardW = 55; 

        let totalWidth = 0;
        groups.forEach((g, i) => {
            totalWidth += (g.length - 1) * overlap;
            if (i < groups.length - 1) totalWidth += groupGap;
        });
        totalWidth += cardW;

        let currentX = centerX - (totalWidth / 2) + (cardW / 2);
        let startY = centerY - 20; 

        groups.forEach(g => {
            g.forEach((cardStr) => {
                const rank = cardStr.slice(0, -1) || "A";
                const suit = cardStr.slice(-1) || "♠";
                const cardSprite = this.deckInstance!.createCardToDeal(true, rank, suit);
                
                cardSprite.scale.set(scale);
                cardSprite.x = this.seatCoords[winnerSeat]?.x || centerX;
                cardSprite.y = this.seatCoords[winnerSeat]?.y || centerY;

                this.cardLayer.addChild(cardSprite);
                this.winnerCardsUI.push(cardSprite);

                this.performAnimation(cardSprite, currentX, startY, 15);
                
                currentX += overlap;
            });
            currentX += groupGap - overlap;
        });
    }

    private setupGlobalDragListeners() {
        if (this.app && this.app.stage) {
            this.app.stage.on('pointermove', (e) => this.onHeroDragMove(e));
            this.app.stage.on('pointerup', (e) => this.onHeroDragEnd(e));
            this.app.stage.on('pointerupoutside', (e) => this.onHeroDragEnd(e));
            this.app.stage.on('pointercancel', (e) => this.onHeroDragEnd(e));
        }
    }

    private onHeroCardClicked(cardStr: string, card: PIXI.Container) {
        if (this.selectedCardContainer === card) {
            this.selectedCardContainer = null; 
            this.selectedCardStr = null;
        } else {
            this.selectedCardContainer = card; 
            this.selectedCardStr = cardStr;
        }
        if (this.callbacks.onCardSelected) {
            this.callbacks.onCardSelected(this.selectedCardStr);
        }
        this.sortHeroHand(); 
    }
    
    private safeDestroy(container: PIXI.Container | null) {
        if (!container) return;
        if (container.parent) container.parent.removeChild(container);
        container.destroy({ children: true });
    }
}