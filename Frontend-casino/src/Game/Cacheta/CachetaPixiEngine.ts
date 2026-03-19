import * as PIXI from 'pixi.js';
import { Deck } from '../Deck';
import { PlayerSeat } from './PlayerSeat';
import { Animator } from '../Animator';
import { CachetaSorter } from './CachetaSorter';

export interface CachetaEngineCallbacks {
    setDealing: (val: boolean) => void;
    setAnimating: (val: boolean) => void;
    flushPendingState: () => void;
    sitDown: (seatIndex: number) => void;
    onCardSelected: (cardStr: string | null) => void; 
}

export class CachetaPixiEngine {
    public app: PIXI.Application | null = null;
    public deckInstance: Deck | null = null;
    public tableInfoTextUI: PIXI.Text | null = null;
    
    private avatarTextureCache: Map<string, PIXI.Texture> = new Map();

    public backgroundLayer = new PIXI.Container();
    public mainLayer = new PIXI.Container();
    public cardLayer = new PIXI.Container(); 
    public particleLayer = new PIXI.Container();

    public readonly MONTE_X = 190;
    public readonly MONTE_Y = 420;
    public readonly LIXO_X = 270;
    public readonly LIXO_Y = 420;
    public readonly VIRA_X = 190 - 45; 
    public readonly VIRA_Y = 420;
    public readonly CENTER_CARDS_SCALE = 1.45; 

    public cardTargets: { x: number, y: number, seat: number }[] = [];
    public dealtCardsUI: PIXI.Container[] = [];
    public playerSeats: PlayerSeat[] = [];
    public seatCoords: { x: number, y: number }[] = [];
    public activeFireParticles: { mesh: PIXI.Graphics; life: number; vx: number; vy: number; }[] = [];

    public heroCardData: { str: string, sprite: PIXI.Container }[] = [];
    public selectedCardStr: string | null = null;

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
        this.mainLayer.addChild(this.deckInstance.view);
        
        this.updateDeckVisibility();
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
        this.selectedCardStr = null;
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
        const safeTime = Math.min(timeLeftSeconds || this.TIMER_DURATION_SEC, this.TIMER_DURATION_SEC);
        this.turnEndTime = Date.now() + (safeTime * 1000);
        if (this.playerSeats[seatIndex]) this.playerSeats[seatIndex].startTimer();
    }

    public stopTimer() {
        this.activeTimerSeat = -1;
        this.playerSeats.forEach(seat => seat.stopTimer());
    }

    private drawSortButton(x: number, y: number) {
        if (this.sortBtnUI) {
            this.sortBtnUI.x = x;
            this.sortBtnUI.y = y;
            this.updateSortButtonIcon();
            return;
        }
        
        this.sortBtnUI = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.circle(0, 0, 18);
        bg.fill({ color: 0x1a2639, alpha: 0.95 });
        bg.stroke({ width: 2, color: 0x00f3ff, alpha: 0.8 });
        
        const icon = new PIXI.Text({
            text: '⚡', 
            style: { fontSize: 16, fill: 0xffffff, align: 'center' }
        } as any);
        icon.anchor.set(0.5);
        
        this.sortBtnUI.addChild(bg);
        this.sortBtnUI.addChild(icon);
        this.sortBtnUI.x = x;
        this.sortBtnUI.y = y;
        this.sortBtnUI.eventMode = 'static';
        this.sortBtnUI.cursor = 'pointer';
        
        this.sortBtnUI.on('pointerdown', () => {
            this.sortBtnUI!.scale.set(0.85);
            setTimeout(() => { if(this.sortBtnUI) this.sortBtnUI.scale.set(1.0); }, 100);
            
            this.sortMode = (this.sortMode + 1) % 3; 
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

        if (this.sortMode === 0) iconNode.text = 'O';
        else if (this.sortMode === 1) iconNode.text = '⚡';
        else if (this.sortMode === 2) iconNode.text = '🌊';
    }

    private getHeroLayout(totalCards: number) {
        const screenWidth = this.app ? this.app.screen.width : window.innerWidth;
        const availableWidth = screenWidth * 0.90; 
        const scale = screenWidth < 600 ? 1.6 : 1.9; 
        const maxSpread = screenWidth < 600 ? 40 : 50; 
        const spreadFactor = Math.min(availableWidth / Math.max(1, totalCards), maxSpread);
        return { spreadFactor, scale };
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

        const spreadFactor = 32; 
        const totalCards = sortedArray.length;
        const startOffset = - ((totalCards - 1) * spreadFactor) / 2;
        const target = this.cardTargets.find(c => c.seat === hero.seat);
        if (!target) return;

        const newHeroCardData: any[] = [];
        const availableSprites = [...this.heroCardData]; 
        
        sortedArray.forEach((cardStr: string, index: number) => {
            const spriteIndex = availableSprites.findIndex(c => c.str === cardStr);
            if (spriteIndex !== -1) {
                const cardData = availableSprites[spriteIndex];
                availableSprites.splice(spriteIndex, 1); 

                newHeroCardData.push(cardData);
                const finalX = target.x + startOffset + (index * spreadFactor);
                this.performAnimation(cardData.sprite, finalX, cardData.sprite.y, 15);
            }
        });
        
        this.heroCardData = newHeroCardData;
        
        this.heroCardData.forEach(c => {
            this.cardLayer.setChildIndex(c.sprite, this.cardLayer.children.length - 1);
        });
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

        this.clearDealtCards();

        if (this.gameState.viraCard) {
            const rank = this.gameState.viraCard.slice(0, -1) || "A";
            const suit = this.gameState.viraCard.slice(-1) || "♠";
            this.viraCardUI = this.deckInstance.createCardToDeal(true, rank, suit);
            this.viraCardUI.scale.set(this.CENTER_CARDS_SCALE); 
            this.viraCardUI.x = this.VIRA_X;
            this.viraCardUI.y = this.VIRA_Y;
            this.viraCardUI.rotation = Math.PI / -2; 

            const deckIndex = this.mainLayer.getChildIndex(this.deckInstance.view);
            this.mainLayer.addChildAt(this.viraCardUI, Math.max(0, deckIndex));
        }

        if (this.gameState.discardPile && this.gameState.discardPile.length > 0) {
            const pile = this.gameState.discardPile;
            const maxShow = Math.min(3, pile.length);
            
            for (let i = maxShow - 1; i >= 0; i--) {
                const cardStr = pile[pile.length - 1 - i];
                const rank = cardStr.slice(0, -1) || "A";
                const suit = cardStr.slice(-1) || "♠";
                const lixoCard = this.deckInstance.createCardToDeal(true, rank, suit);
                
                lixoCard.scale.set(this.CENTER_CARDS_SCALE); 
                lixoCard.x = this.LIXO_X; 
                lixoCard.y = this.LIXO_Y; 
                
                this.cardLayer.addChild(lixoCard);
                this.lixoCardsUI.push(lixoCard);
            }
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
                if (this.sortMode === 1 && cardsToRender.length > 0) {
                    cardsToRender = CachetaSorter.getSortedCards(cardsToRender, this.gameState.viraCard);
                } else if (this.sortMode === 2 && cardsToRender.length > 0) {
                    cardsToRender = CachetaSorter.getSortedCardsSequences(cardsToRender, this.gameState.viraCard);
                }

                const totalCards = cardsToRender.length > 0 ? cardsToRender.length : 9;
                
                const layout = this.getHeroLayout(totalCards);
                const finalScale = layout.scale;
                const spreadFactor = layout.spreadFactor; 
                const startOffset = - ((totalCards - 1) * spreadFactor) / 2;
                
                const targetY = this.seatCoords[0].y - 112;

                for (let c = 0; c < totalCards; c++) {
                    const cardStr = cardsToRender.length > 0 ? cardsToRender[c] : "A♠";
                    const rank = cardStr ? (cardStr.slice(0, -1) || "A") : "A";
                    const suit = cardStr ? (cardStr.slice(-1) || "♠") : "♠";

                    const cardSprite = this.deckInstance.createCardToDeal(true, rank, suit);
                    cardSprite.scale.set(finalScale);

                    cardSprite.x = target.x + startOffset + (c * spreadFactor);
                    cardSprite.y = targetY;

                    cardSprite.eventMode = 'static';
                    cardSprite.cursor = 'pointer';
                    cardSprite.on('pointerdown', () => this.onHeroCardClicked(cardStr, cardSprite));
                    if (this.selectedCardStr === cardStr) cardSprite.y -= 25;
                    this.heroCardData.push({ str: cardStr, sprite: cardSprite });

                    this.cardLayer.addChild(cardSprite);
                    if (!player.uiCards) player.uiCards = [];
                    player.uiCards.push(cardSprite);
                }

                this.drawSortButton(target.x + startOffset - 10, targetY + 80);
            }
        }
    }

    private onHeroCardClicked(cardStr: string, clickedSprite: PIXI.Container) {
        const baseTargetY = this.seatCoords[0].y - 112;

        this.heroCardData.forEach(c => {
            c.sprite.y = baseTargetY;
        });

        if (this.selectedCardStr === cardStr) {
            this.selectedCardStr = null;
            this.callbacks.onCardSelected(null);
        } else {
            this.selectedCardStr = cardStr;
            clickedSprite.y = baseTargetY - 25;
            this.callbacks.onCardSelected(cardStr);
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
                    const finalScale = layout.scale;
                    const spreadFactor = layout.spreadFactor;
                    
                    const startOffset = - ((totalCards - 1) * spreadFactor) / 2;
                    const targetY = this.seatCoords[0].y - 112;

                    for (let c = 0; c < 3; c++) {
                        if (!this.isDealingCardsAnimationRunning) break; 

                        const cardIndex = (round * 3) + c;
                        const finalX = target.x + startOffset + (cardIndex * spreadFactor);

                        const cardStr = player.serverCards ? player.serverCards[cardIndex] : "A♠";
                        const rank = cardStr ? (cardStr.slice(0, -1) || "A") : "A";
                        const suit = cardStr ? (cardStr.slice(-1) || "♠") : "♠";

                        const card = this.deckInstance.createCardToDeal(true, rank, suit);
                        card.scale.set(finalScale);

                        card.x = this.MONTE_X;
                        card.y = this.MONTE_Y;

                        this.cardLayer.addChild(card);

                        card.eventMode = 'static';
                        card.cursor = 'pointer';
                        card.on('pointerdown', () => this.onHeroCardClicked(cardStr, card));
                        this.heroCardData.push({ str: cardStr, sprite: card });

                        if (!player.uiCards) player.uiCards = [];
                        player.uiCards.push(card);

                        this.launchCardAnimation(card, finalX, targetY, 0x00f3ff);
                        await this.pixiDelay(50);
                    }
                    
                    if (round === 2) {
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

                const deckIndex = this.mainLayer.getChildIndex(this.deckInstance!.view);
                this.mainLayer.addChildAt(viraCard, Math.max(0, deckIndex));

                this.cardLayer.addChild(viraCard);
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
        this.activeFireParticles.forEach(p => {
            if (p.mesh.parent) p.mesh.parent.removeChild(p.mesh);
            p.mesh.destroy();
        });
        this.activeFireParticles.length = 0;

        if (this.app) { 
            this.app.destroy({ removeView: true, children: true, texture: true, baseTexture: true }); 
            this.app = null;
        }
    }

    private safeDestroy(obj: PIXI.Container | null) {
        if (obj && !obj.destroyed) {
            obj.visible = false; 
            if (this.app && obj.parent) obj.parent.removeChild(obj);
            setTimeout(() => {
                if (obj && !obj.destroyed) {
                    try { obj.destroy({ children: true }); } catch (e) {}
                }
            }, 1000);
        }
    }

    private pixiDelay(ms: number): Promise<void> {
        return new Promise(resolve => {
            if (!this.app || !this.app.ticker) {
                resolve();
                return;
            }
            let elapsed = 0;
            const tick = (ticker: PIXI.Ticker) => {
                elapsed += ticker.deltaMS;
                if (elapsed >= ms) {
                    if (this.app && this.app.ticker) {
                        this.app.ticker.remove(tick);
                    }
                    resolve();
                }
            };
            this.app.ticker.add(tick);
        });
    }

    private async performAnimation(obj: PIXI.Container, targetX: number, targetY: number, speed: number) {
        if (!obj || obj.destroyed || !this.app) return Promise.resolve();
        if (document.hidden) {
            obj.x = targetX;
            obj.y = targetY;
            return Promise.resolve();
        }
        return Animator.animateTo(this.app, obj, targetX, targetY, speed);
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

        if (this.activeTimerSeat === -1) return;
        const seatUi = this.playerSeats[this.activeTimerSeat];
        if (!seatUi) return;

        const timeLeft = this.turnEndTime - Date.now();

        if (timeLeft <= 0) {
            seatUi.updateTimer(0, 0);
            return;
        }

        const progress = Math.min(1, Math.max(0, timeLeft / (this.TIMER_DURATION_SEC * 1000)));
        const secLeft = Math.ceil(timeLeft / 1000);

        seatUi.updateTimer(progress, secLeft);

        if (progress > 0 && timeLeft > 0) {
            const tipPos = seatUi.getTimerTipPosition(progress);

            for (let i = 0; i < 2; i++) {
                const p = new PIXI.Graphics();
                const size = Math.random() * 3 + 1.5;
                p.circle(0, 0, size);
                p.fill({ color: this.MAGIC_COLORS[Math.floor(Math.random() * this.MAGIC_COLORS.length)], alpha: 0.8 });
                p.x = tipPos.x + (Math.random() - 0.5) * 4;
                p.y = tipPos.y + (Math.random() - 0.5) * 4;
                
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
}