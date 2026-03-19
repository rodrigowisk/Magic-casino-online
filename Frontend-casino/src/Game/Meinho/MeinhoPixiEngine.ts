import * as PIXI from 'pixi.js';
import { Deck } from '../Deck';
import { PlayerSeat } from '../PlayerSeat';
import { Animator } from '../Animator';

export interface EngineCallbacks {
    setDealing: (val: boolean) => void;
    setAnimating: (val: boolean) => void;
    flushPendingState: () => void;
    sitDown: (seatIndex: number) => void;
}

export class MeinhoPixiEngine {
    public app: PIXI.Application | null = null;
    public deckInstance: Deck | null = null;
    public potTextUI: PIXI.Text | null = null;
    public tableInfoTextUI: PIXI.Text | null = null;
    
    public singleChipTexture: PIXI.Texture | null = null;
    public potChipsTexture: PIXI.Texture | null = null;
    public potStackSprite: PIXI.Sprite | null = null;
    
    // 👇 NOVO: Cache de texturas de avatares para evitar recarregamento
    private avatarTextureCache: Map<string, PIXI.Texture> = new Map();

    public backgroundLayer = new PIXI.Container();
    public particleLayer = new PIXI.Container();
    public mainLayer = new PIXI.Container();

    public cardTargets: { x: number, y: number, seat: number, isLeft: boolean }[] = [];
    public dealtCardsUI: PIXI.Container[] = [];
    public potChipsUI: PIXI.Container[] = []; 
    public playerSeats: PlayerSeat[] = [];
    
    // Guarda as coordenadas fixas da cadeira independentemente do estado do Vue
    public seatCoords: { x: number, y: number }[] = [];
    
    public activeFireParticles: { mesh: PIXI.Graphics; life: number; vx: number; vy: number; }[] = [];

    public heroPixiCards: PIXI.Container[] = [];
    
    public isHeroCardsHidden: boolean = false;
    public isDiscardingCards: boolean = false;

    public activeTimerSeat = -1;
    public turnEndTime = 0;
    public readonly TIMER_DURATION_SEC = 20;
    public readonly POT_X = 215;
    public readonly POT_Y = 320;

    public readonly MAGIC_COLORS = [0x00f3ff, 0xa855f7, 0xff6bfb, 0xffffff];
    
    public peekMode: boolean = false;

    constructor(
        public gameState: any, 
        public callbacks: EngineCallbacks
    ) {}

    public setPeekMode(enabled: boolean) {
        this.peekMode = enabled;
    }

    public async init(
        canvasContainer: HTMLElement, 
        width: number, 
        height: number, 
        defaultAvatarImg: string, // 👇 Agora recebe o default daqui
        deckImg: string, 
        singleChipImg: string,
        tableImg: string,
        potChipsImg: string
    ) {
        this.app = new PIXI.Application();
        
        await this.app.init({ 
            width, 
            height, 
            backgroundAlpha: 0, 
            antialias: true,
            resolution: window.devicePixelRatio || 2, 
            autoDensity: true 
        });

        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, width, height);

        this.app.stage.addChild(this.backgroundLayer); 
        this.app.stage.addChild(this.particleLayer);
        this.app.stage.addChild(this.mainLayer);

        canvasContainer.appendChild(this.app.canvas);

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            this.app.ticker.maxFPS = 50; 
        }

        let tableTexture, deckTexture;

        try {
            tableTexture = await PIXI.Assets.load(tableImg);
            deckTexture = await PIXI.Assets.load(deckImg);
            this.singleChipTexture = await PIXI.Assets.load(singleChipImg);
            this.potChipsTexture = await PIXI.Assets.load(potChipsImg);
            
            // 👇 Carrega o default avatar e salva no cache
            const defaultTex = await PIXI.Assets.load(defaultAvatarImg);
            this.avatarTextureCache.set(defaultAvatarImg, defaultTex);
            this.avatarTextureCache.set('default', defaultTex); // Alias seguro

        } catch (e) {
            console.error("ERRO: Falha nas imagens do PixiJS", e);
            tableTexture = PIXI.Texture.EMPTY;
            deckTexture = PIXI.Texture.EMPTY;
            this.singleChipTexture = PIXI.Texture.EMPTY;
            this.potChipsTexture = PIXI.Texture.EMPTY;
            this.avatarTextureCache.set('default', PIXI.Texture.EMPTY);
        }

        const tableSprite = new PIXI.Sprite(tableTexture);
        tableSprite.anchor.set(0.5); 
        
        let scale = Math.min(width / (tableTexture.width || width), height / (tableTexture.height || height));
        const margemFator = 1.3; 
        tableSprite.scale.set(scale * margemFator);
        
        tableSprite.x = width / 2;
        tableSprite.y = height / 2.1;
        
        const neonGlow = new PIXI.Graphics();
        neonGlow.ellipse(0, 0, tableSprite.width * 0.48, tableSprite.height * 0.42);
        neonGlow.fill({ color: 0x00f3ff, alpha: 0.8 }); 
        
        const blurFilter = new PIXI.BlurFilter();
        blurFilter.blur = 60; 
        neonGlow.filters = [blurFilter];
        
        neonGlow.x = tableSprite.x;
        neonGlow.y = tableSprite.y;
        
        this.backgroundLayer.addChild(neonGlow); 
        this.backgroundLayer.addChild(tableSprite); 

        this.tableInfoTextUI = new PIXI.Text({
            text: `JOGO: MEINHO\nMESA: ${(this.gameState.tableName || 'CARREGANDO...').toUpperCase()}\nBUY-IN: R$ ${this.gameState.tableMinBuyIn}\nANTE: R$ ${this.gameState.minBet}`,
            style: {
                fontFamily: 'Montserrat, Arial, sans-serif', 
                fontSize: 13, 
                fill: 0xffffff, 
                align: 'center',
                fontWeight: '800',
                letterSpacing: 2, 
                lineHeight: 22 
            }
        } as any);
        this.tableInfoTextUI.anchor.set(0.5);
        this.tableInfoTextUI.x = this.POT_X;
        this.tableInfoTextUI.y = 580; 
        this.tableInfoTextUI.alpha = 0.25; 
        
        this.backgroundLayer.addChild(this.tableInfoTextUI);

        this.potStackSprite = new PIXI.Sprite(this.potChipsTexture || PIXI.Texture.EMPTY);
        this.potStackSprite.anchor.set(0.5);
        this.potStackSprite.width = 65; 
        this.potStackSprite.height = 65;
        this.potStackSprite.x = this.POT_X - 35; 
        this.potStackSprite.y = this.POT_Y; 
        this.potStackSprite.visible = this.gameState.pot > 0;
        this.mainLayer.addChild(this.potStackSprite);

        this.potTextUI = new PIXI.Text({
            text: `Pote\n${this.gameState.pot}`,
            style: {
                fontFamily: 'Arial', 
                fontSize: 16, 
                fill: 0x00f3ff, 
                fontWeight: 'bold',
                align: 'center', 
                dropShadow: true, 
                dropShadowColor: '#00f3ff', 
                dropShadowDistance: 0, 
                dropShadowBlur: 8 
            }
        } as any);
        this.potTextUI.anchor.set(0.5);
        this.potTextUI.x = this.POT_X + 25; 
        this.potTextUI.y = this.POT_Y; 
        
        this.potTextUI.visible = this.gameState.pot > 0;
        this.mainLayer.addChild(this.potTextUI);
        
        this.app.ticker.add(() => this.updateFramePixi());

        this.cardTargets.length = 0; 

        const numSeats = this.gameState.maxPlayers;
        this.buildSeats(numSeats);

        this.deckInstance = new Deck(265, 420, deckTexture, true); 
        this.mainLayer.addChild(this.deckInstance.view);
        
        this.updateDeckVisibility();
        this.updateAllBalances();
    }
    
    // 👇 NOVO MÉTODO AUXILIAR: Pega a textura do avatar sob demanda
    private getAvatarTexture(url?: string): PIXI.Texture {
        if (!url) return this.avatarTextureCache.get('default') || PIXI.Texture.EMPTY;
        
        if (this.avatarTextureCache.has(url)) {
            return this.avatarTextureCache.get(url)!;
        }

        try {
            const texture = PIXI.Texture.from(url);
            this.avatarTextureCache.set(url, texture);
            return texture;
        } catch (e) {
            console.error("Erro ao carregar textura do avatar:", url, e);
            return this.avatarTextureCache.get('default') || PIXI.Texture.EMPTY;
        }
    }

    public buildSeats(numSeats: number) {
        this.playerSeats.forEach(seat => {
            if (seat.container.parent) seat.container.parent.removeChild(seat.container);
            seat.container.destroy({ children: true });
        });
        
        this.playerSeats = [];
        this.cardTargets = [];
        this.seatCoords = []; 

        for (let i = 0; i < numSeats; i++) {
            let avatarX = 0, avatarY = 0, cx = 0, cy = 0;

            if (numSeats === 2) {
                if (i === 0) { avatarX = 220; avatarY = 738; cx = avatarX + 60; cy = avatarY - 10; } 
                else if (i === 1) { avatarX = 212; avatarY = 93; cx = avatarX + 50; cy = avatarY; }  
            }
            else if (numSeats === 3) {
                if (i === 0) { avatarX = 220; avatarY = 738; cx = avatarX + 60; cy = avatarY - 10; } 
                else if (i === 1) { avatarX = 46; avatarY = 385; cx = avatarX + 49; cy = avatarY; }  
                else if (i === 2) { avatarX = 372; avatarY = 385; cx = avatarX - 45; cy = avatarY; } 
            }
            else if (numSeats === 4) {
                if (i === 0) { avatarX = 220; avatarY = 738; cx = avatarX + 60; cy = avatarY - 10; } 
                else if (i === 1) { avatarX = 46; avatarY = 385; cx = avatarX + 49; cy = avatarY; }  
                else if (i === 2) { avatarX = 212; avatarY = 93; cx = avatarX + 50; cy = avatarY; }  
                else if (i === 3) { avatarX = 372; avatarY = 385; cx = avatarX - 45; cy = avatarY; } 
            }
            else if (numSeats === 5) {
                if (i === 0) { avatarX = 220; avatarY = 738; cx = avatarX + 60; cy = avatarY - 10; } 
                else if (i === 1) { avatarX = 45; avatarY = 530; cx = avatarX + 49; cy = avatarY; } 
                else if (i === 2) { avatarX = 47; avatarY = 240; cx = avatarX + 49; cy = avatarY; } 
                else if (i === 3) { avatarX = 372; avatarY = 240; cx = avatarX - 45; cy = avatarY; } 
                else if (i === 4) { avatarX = 372; avatarY = 530; cx = avatarX - 45; cy = avatarY; }
            }
            else {
                if (i === 0) { avatarX = 220; avatarY = 738; cx = avatarX + 60; cy = avatarY - 10; } 
                else if (i === 1) { avatarX = 45; avatarY = 530; cx = avatarX + 49; cy = avatarY; } 
                else if (i === 2) { avatarX = 47; avatarY = 240; cx = avatarX + 49; cy = avatarY; } 
                else if (i === 3) { avatarX = 212; avatarY = 93; cx = avatarX + 50; cy = avatarY; } 
                else if (i === 4) { avatarX = 372; avatarY = 240; cx = avatarX - 45; cy = avatarY; } 
                else if (i === 5) { avatarX = 372; avatarY = 530; cx = avatarX - 45; cy = avatarY; }
            }

            this.seatCoords[i] = { x: avatarX, y: avatarY };

            const player = this.gameState.players[i] || { name: 'Livre', chips: 0, isSeated: false };
            
            this.cardTargets.push({ x: cx, y: cy, seat: i, isLeft: true });
            this.cardTargets.push({ x: cx, y: cy, seat: i, isLeft: false });

            const seatUi = new PlayerSeat(
                avatarX, 
                avatarY, 
                this.getAvatarTexture(), // Inicia com o padrão
                player.name, 
                player.chips, 
                player.isSeated, 
                () => this.callbacks.sitDown(i)
            );
            this.mainLayer.addChild(seatUi.container);
            this.playerSeats.push(seatUi);
        }
    }

    public updateDeckVisibility() {
        if (this.deckInstance && this.gameState && this.gameState.players) {
            const seatedCount = this.gameState.players.filter((p: any) => p.isSeated).length;
            
            // Verifica se a mão ainda está rolando (dealing, betting, ou resolving)
            const isGameActive = this.gameState.phase !== 'waiting';
            
            // 👇 SE ESTIVER DESCARTANDO **OU** O JOGO AINDA ESTIVER ATIVO, MANTÉM O BARALHO
            if (this.isDiscardingCards || isGameActive) {
                this.deckInstance.view.visible = true;
            } else {
                this.deckInstance.view.visible = seatedCount > 1;
            }
        }
    }

    public updatePotText(newPot: number) {
        if (this.potTextUI) {
            this.potTextUI.text = `Pote\n${newPot}`; 
            this.potTextUI.visible = newPot > 0;
        }

        if (this.potStackSprite) {
            this.potStackSprite.visible = newPot > 0;
            
            if (newPot > 0) {
                const originalScaleX = Math.sign(this.potStackSprite.scale.x) * (65 / (this.potChipsTexture?.width || 65));
                const originalScaleY = Math.sign(this.potStackSprite.scale.y) * (65 / (this.potChipsTexture?.height || 65));
                
                this.potStackSprite.scale.set(originalScaleX * 1.3, originalScaleY * 1.3);
                setTimeout(() => {
                    if (this.potStackSprite && !this.potStackSprite.destroyed) {
                        this.potStackSprite.scale.set(originalScaleX, originalScaleY);
                    }
                }, 150);
            }
        }
    }

    private playChipHitPotAnimation() {
        if (this.potStackSprite && !this.potStackSprite.destroyed) {
            this.potStackSprite.width = 85; 
            this.potStackSprite.height = 85; 
            
            setTimeout(() => {
                if (this.potStackSprite && !this.potStackSprite.destroyed) {
                    this.potStackSprite.width = 65; 
                    this.potStackSprite.height = 65; 
                }
            }, 120);
        }

        for (let i = 0; i < 15; i++) {
            const p = new PIXI.Graphics();
            const size = Math.random() * 3 + 2;
            p.circle(0, 0, size);
            p.fill({ color: 0xFFD700, alpha: 1 }); 
            p.x = this.POT_X - 35; 
            p.y = this.POT_Y; 
            
            this.particleLayer.addChild(p);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            
            this.activeFireParticles.push({
                mesh: p,
                life: 1.0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            });
        }
    }

public updatePlayerSeat(seatIndex: number, isSeated: boolean, name: string, chips: number, status: string, avatarUrl?: string) {
        const seatUi = this.playerSeats[seatIndex];
        if (seatUi) {
            seatUi.setSeated(isSeated);
            seatUi.updatePlayerInfo(name, chips);
            
            // 👇 CORREÇÃO: Usando PIXI.Assets.load() para forçar o download da imagem
            if (avatarUrl) {
                // Se já baixou essa foto antes, usa do cache na hora
                if (this.avatarTextureCache.has(avatarUrl)) {
                    const cachedTex = this.avatarTextureCache.get(avatarUrl)!;
                    if (typeof (seatUi as any).setAvatarTexture === 'function') {
                        (seatUi as any).setAvatarTexture(cachedTex);
                    }
                } else {
                    // Coloca a foto default temporariamente enquanto carrega a nova
                    const defaultTex = this.avatarTextureCache.get('default');
                    if (defaultTex && typeof (seatUi as any).setAvatarTexture === 'function') {
                        (seatUi as any).setAvatarTexture(defaultTex);
                    }

                    // Manda o PixiJS baixar a nova imagem da rede
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
    

    public clearPotChips() {
        this.potChipsUI.forEach(chip => this.safeDestroy(chip));
        this.potChipsUI.length = 0;
        
        if (this.potStackSprite) {
            this.potStackSprite.visible = false;
        }
    }

    public clearDealtCards() {
        this.dealtCardsUI.forEach(card => this.safeDestroy(card));
        this.dealtCardsUI.length = 0;
        this.heroPixiCards = []; 
    }

    public setHeroCardsVisibility(visible: boolean) {
        this.isHeroCardsHidden = !visible;
        if (this.heroPixiCards) {
            this.heroPixiCards.forEach(card => {
                if (card && !card.destroyed) {
                    card.visible = visible;
                }
            });
        }
    }

    public startTimer(seatIndex: number, timeLeftSeconds: number) {
        this.stopTimer(); 
        
        this.activeTimerSeat = seatIndex;
        const safeTime = Math.min(timeLeftSeconds || this.TIMER_DURATION_SEC, this.TIMER_DURATION_SEC);
        this.turnEndTime = Date.now() + (safeTime * 1000);
        
        const seatUi = this.playerSeats[seatIndex];
        if (seatUi) {
            seatUi.startTimer();
        }
    }

    public stopTimer() {
        this.activeTimerSeat = -1;
        this.playerSeats.forEach(seat => seat.stopTimer());
    }

    public async startGameAutomatically() {
        this.callbacks.setDealing(true);
        this.callbacks.setAnimating(true); 

        const lockedPeekMode = this.peekMode;
        
        try {
            this.resetAvatars();
            this.clearDealtCards();
            
            for (let i = 0; i < this.gameState.maxPlayers; i++) {
                if (this.gameState.players[i]) this.gameState.players[i].uiCards = [];
            }

            if (this.potChipsUI.length === 0 && this.gameState.pot > 0) {
                const antePromises = [];
                for (let i = 0; i < this.gameState.maxPlayers; i++) {
                    if (this.gameState.players[i] && this.gameState.players[i].isSeated && this.gameState.players[i].status === 'playing') {
                        
                        const coords = this.seatCoords[i];
                        const pX = coords?.x ?? 0;
                        const pY = coords?.y ?? 0;
                        
                        const rX = this.POT_X - 35;
                        const rY = this.POT_Y; 
                        
                        antePromises.push(this.throwCustomChip(pX, pY, rX, rY, undefined, false).then(chip => { 
                            if (chip) {
                                this.playChipHitPotAnimation();
                                chip.visible = false; 
                                this.potChipsUI.push(chip);
                            }
                        }));
                    }
                }
                await Promise.all(antePromises);
            }

            const dealOrder: number[] = [];
            for (let i = 0; i < this.gameState.maxPlayers; i++) {
                if (this.gameState.players[i] && this.gameState.players[i].isSeated && this.gameState.players[i].status === 'playing') dealOrder.push(i * 2);
            }
            for (let i = 0; i < this.gameState.maxPlayers; i++) {
                if (this.gameState.players[i] && this.gameState.players[i].isSeated && this.gameState.players[i].status === 'playing') dealOrder.push(i * 2 + 1);
            }

            for (const targetIndex of dealOrder) {
                if (!this.app || !this.deckInstance) break;
                
                const visualSeat = Math.floor(targetIndex / 2);
                const isLeft = targetIndex % 2 === 0;
                const player = this.gameState.players[visualSeat];
                if (!player) continue;

                const target = this.cardTargets.find(c => c.seat === visualSeat && c.isLeft === isLeft);
                if (!target) continue;
                
                const isTargetHero = player.isHero;
                const finalScale = isTargetHero ? 1.05 : 0.65;
                const spacing = isTargetHero ? 16 : 10; 
                const finalX = isLeft ? target.x - spacing / 2 : target.x + spacing / 2;

                const cardIndex = isLeft ? 0 : 1;
                const cardStr = player.serverCards && player.serverCards.length > cardIndex ? player.serverCards[cardIndex] : "A♠";
                const rank = cardStr.slice(0, -1) || "A"; 
                const suit = cardStr.slice(-1) || "♠";
                
                const isFaceUp = isTargetHero && !lockedPeekMode;
                const card = this.deckInstance.createCardToDeal(isFaceUp, rank, suit);
                
                card.scale.set(finalScale);

                if (isTargetHero && this.isHeroCardsHidden) {
                    card.visible = false;
                }

                this.mainLayer.addChild(card);
                this.dealtCardsUI.push(card); 
                
                if (isTargetHero) {
                    this.heroPixiCards.push(card); 
                }
                
                if (!player.uiCards) player.uiCards = [];
                player.uiCards.push(card);
                
                const trailAnim = () => {
                    const p = new PIXI.Graphics();
                    p.circle(0, 0, 3);
                    p.fill({ color: 0x00f3ff, alpha: 0.6 });
                    p.x = card.x;
                    p.y = card.y;
                    this.particleLayer.addChild(p);
                    this.activeFireParticles.push({
                        mesh: p, life: 0.6, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5
                    });
                };
                this.app.ticker.add(trailAnim);
                
                await this.performAnimation(card, finalX, target.y, 15); 
                
                this.app.ticker.remove(trailAnim);
            }
        } finally {
            this.callbacks.setDealing(false);
            this.callbacks.setAnimating(false);
            this.callbacks.flushPendingState();
        }
    }

    public async revealHeroCards() {
        if (!this.app || !this.deckInstance) return;
        const hero = this.gameState.players.find((p: any) => p.isHero);
        if (!hero || !hero.serverCards) return;

        const uiCards = this.heroPixiCards;
        if (!uiCards || uiCards.length !== 2) return;

        const flipPromises = uiCards.map((oldCard: PIXI.Container, index: number) => {
            return new Promise<PIXI.Container>((resolve) => {
                const cardStr = hero.serverCards[index];
                const rank = cardStr.slice(0, -1) || "A";
                const suit = cardStr.slice(-1) || "♠";
                const originalScale = Math.abs(oldCard.scale.y); 
                
                if (document.hidden) {
                    const newCard = this.deckInstance!.createCardToDeal(true, rank, suit);
                    newCard.x = oldCard.x;
                    newCard.y = oldCard.y;
                    newCard.scale.set(originalScale);
                    this.safeDestroy(oldCard);
                    this.mainLayer.addChild(newCard);
                    const dealtIndex = this.dealtCardsUI.indexOf(oldCard);
                    if (dealtIndex !== -1) this.dealtCardsUI[dealtIndex] = newCard;
                    else this.dealtCardsUI.push(newCard);
                    
                    this.heroPixiCards[index] = newCard;
                    resolve(newCard);
                    return;
                }

                let isShrinking = true;
                const flipAnim = () => {
                    if (!oldCard || oldCard.destroyed || !this.app || !this.app.ticker) {
                        if (this.app && this.app.ticker) this.app.ticker.remove(flipAnim);
                        resolve(oldCard);
                        return;
                    }

                    if (isShrinking) {
                        oldCard.scale.x -= 0.15; 
                        if (oldCard.scale.x <= 0) {
                            isShrinking = false;
                            const newCard = this.deckInstance!.createCardToDeal(true, rank, suit);
                            newCard.x = oldCard.x;
                            newCard.y = oldCard.y;
                            newCard.scale.set(0, originalScale);
                            
                            this.safeDestroy(oldCard);
                            this.mainLayer.addChild(newCard);
                            
                            const dealtIndex = this.dealtCardsUI.indexOf(oldCard);
                            if (dealtIndex !== -1) this.dealtCardsUI[dealtIndex] = newCard;
                            else this.dealtCardsUI.push(newCard);
                            
                            this.heroPixiCards[index] = newCard;

                            const growAnim = () => {
                                if (!newCard || newCard.destroyed || !this.app || !this.app.ticker) {
                                    if (this.app && this.app.ticker) this.app.ticker.remove(growAnim);
                                    resolve(newCard);
                                    return;
                                }
                                newCard.scale.x += 0.15; 
                                if (newCard.scale.x >= originalScale) {
                                    newCard.scale.x = originalScale;
                                    if (this.app && this.app.ticker) this.app.ticker.remove(growAnim);
                                    resolve(newCard);
                                }
                            };
                            if (this.app && this.app.ticker) this.app.ticker.remove(flipAnim);
                            if (this.app && this.app.ticker) this.app.ticker.add(growAnim);
                        }
                    }
                };
                if (this.app && this.app.ticker) this.app.ticker.add(flipAnim);
            });
        });

        await Promise.all(flipPromises); 
    }

    public async playSkipAnimation(seatIndex: number) {
        const currentPlayer = this.gameState.players[seatIndex];
        if (!currentPlayer) return;

        if (this.activeTimerSeat === seatIndex) {
            this.stopTimer(); 
        }


        currentPlayer.status = 'out';
        this.darkenAvatar(seatIndex); 
        
        let cardsToTrash: PIXI.Container[] = [];
        
        if (currentPlayer.isHero && this.heroPixiCards.length > 0) {
            cardsToTrash = [...this.heroPixiCards];
            this.heroPixiCards = [];
        } else if (currentPlayer.uiCards && currentPlayer.uiCards.length > 0) {
            cardsToTrash = [...(currentPlayer.uiCards as PIXI.Container[])];
        }

        if (cardsToTrash.length > 0) {
            await this.discardCards(cardsToTrash);
        }
        currentPlayer.uiCards = []; 
    }

    public async playBetAnimation(seatIndex: number, betAmount: number, isWin: boolean, playedCards: string[], centerCardRevealed: string) {
        if (!this.app || !this.deckInstance) return;

        const currentPlayer = this.gameState.players[seatIndex];
        if (!currentPlayer) return;

        if (this.activeTimerSeat === seatIndex) {
            this.stopTimer(); 
        }

        let revealedCards = playedCards || [];
        let centerCard = centerCardRevealed || "2♥";

const coords = this.seatCoords[seatIndex];
        const pX = coords?.x ?? 0;
        const pY = coords?.y ?? 0;

        // 👇 SOLUÇÃO: Cálculo geométrico apontando sempre para o Pote
        const targetPotX = this.POT_X - 35; // O centro visual da pilha do pote
        const targetPotY = this.POT_Y;
        
        const dx = targetPotX - pX;
        const dy = targetPotY - pY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Distância que a ficha para na frente do avatar (ajuste se quiser mais perto/longe)
        const betDistance = 75; 
        
        let betX = pX;
        let betY = pY;
        
        if (dist > 0) {
            betX = pX + (dx / dist) * betDistance;
            betY = pY + (dy / dist) * betDistance;
        }
        // 👆 Fim do novo cálculo
      
        const betChip = await this.throwCustomChip(pX, pY, betX, betY, betAmount, false);
        this.gameState.phase = 'resolving';
        
        await this.pixiDelay(800);

        let uiCardsSeguros: PIXI.Container[] = [];
        if (currentPlayer.isHero && this.heroPixiCards.length === 2) {
            uiCardsSeguros = this.heroPixiCards;
        } else if (currentPlayer.uiCards && currentPlayer.uiCards.length === 2) {
            uiCardsSeguros = currentPlayer.uiCards as PIXI.Container[];
        }

        if (!currentPlayer.isHero && uiCardsSeguros.length === 2 && revealedCards.length >= 2) {
            const flipPromises = uiCardsSeguros.map((oldCard, index) => {
                return new Promise<PIXI.Container>((resolve) => {
                    const cardStr = revealedCards[index];
                    const rank = cardStr.slice(0, -1) || "A";
                    const suit = cardStr.slice(-1) || "♠";
                    const originalScale = Math.abs(oldCard.scale.y); 
                    
                    if (document.hidden) {
                        const newCard = this.deckInstance!.createCardToDeal(true, rank, suit);
                        newCard.x = oldCard.x;
                        newCard.y = oldCard.y;
                        newCard.scale.set(originalScale);
                        this.safeDestroy(oldCard);
                        this.mainLayer.addChild(newCard);
                        const dealtIndex = this.dealtCardsUI.indexOf(oldCard);
                        if (dealtIndex !== -1) this.dealtCardsUI[dealtIndex] = newCard;
                        else this.dealtCardsUI.push(newCard);
                        
                        uiCardsSeguros[index] = newCard;
                        resolve(newCard);
                        return;
                    }

                    let isShrinking = true;
                    const flipAnim = () => {
                        if (!oldCard || oldCard.destroyed || !this.app || !this.app.ticker) {
                            if (this.app && this.app.ticker) this.app.ticker.remove(flipAnim);
                            resolve(oldCard);
                            return;
                        }

                        if (isShrinking) {
                            oldCard.scale.x -= 0.15; 
                            if (oldCard.scale.x <= 0) {
                                isShrinking = false;
                                const newCard = this.deckInstance!.createCardToDeal(true, rank, suit);
                                newCard.x = oldCard.x;
                                newCard.y = oldCard.y;
                                newCard.scale.set(0, originalScale);
                                
                                this.safeDestroy(oldCard);
                                this.mainLayer.addChild(newCard);
                                
                                const dealtIndex = this.dealtCardsUI.indexOf(oldCard);
                                if (dealtIndex !== -1) this.dealtCardsUI[dealtIndex] = newCard;
                                else this.dealtCardsUI.push(newCard);
                                
                                uiCardsSeguros[index] = newCard;

                                const growAnim = () => {
                                    if (!newCard || newCard.destroyed || !this.app || !this.app.ticker) {
                                        if (this.app && this.app.ticker) this.app.ticker.remove(growAnim);
                                        resolve(newCard);
                                        return;
                                    }
                                    newCard.scale.x += 0.15; 
                                    if (newCard.scale.x >= originalScale) {
                                        newCard.scale.x = originalScale;
                                        if (this.app && this.app.ticker) this.app.ticker.remove(growAnim);
                                        resolve(newCard);
                                    }
                                };
                                if (this.app && this.app.ticker) this.app.ticker.remove(flipAnim);
                                if (this.app && this.app.ticker) this.app.ticker.add(growAnim);
                            }
                        }
                    };
                    if (this.app && this.app.ticker) this.app.ticker.add(flipAnim);
                });
            });

            await Promise.all(flipPromises); 
            await this.pixiDelay(1000);
        }

        const centerCardStr = centerCard || "2♥";
        const centerRank = centerCardStr.slice(0, -1) || "A";
        const centerSuit = centerCardStr.slice(-1) || "♠";
        const baseCenterScale = 1.7; 
        let finalCenterCard: PIXI.Container | null = null;

        await new Promise<void>((resolve) => {
            const centerFaceDown = this.deckInstance!.createCardToDeal(false, centerRank, centerSuit);
            centerFaceDown.scale.set(baseCenterScale);
            this.mainLayer.addChild(centerFaceDown);
            this.dealtCardsUI.push(centerFaceDown);

            const startX = centerFaceDown.x;
            const startY = centerFaceDown.y;
            const endX = 215; 
            const endY = 420;

            if (document.hidden) {
                this.safeDestroy(centerFaceDown);
                const centerFaceUp = this.deckInstance!.createCardToDeal(true, centerRank, centerSuit);
                centerFaceUp.scale.set(baseCenterScale);
                centerFaceUp.x = endX;
                centerFaceUp.y = endY;
                this.mainLayer.addChild(centerFaceUp);
                
                const idx = this.dealtCardsUI.indexOf(centerFaceDown);
                if (idx !== -1) this.dealtCardsUI[idx] = centerFaceUp;
                else this.dealtCardsUI.push(centerFaceUp);
                
                finalCenterCard = centerFaceUp;
                resolve();
                return;
            }

            let progress = 0;
            const speed = 0.02; 
            let isFlipped = false;
            let activeCard = centerFaceDown;

            const slideAndFlipAnim = () => {
                if (!activeCard || activeCard.destroyed || !this.app || !this.app.ticker) {
                    if (this.app && this.app.ticker) this.app.ticker.remove(slideAndFlipAnim);
                    resolve();
                    return;
                }

                progress += speed;
                if (progress >= 1) progress = 1;

                activeCard.x = startX + (endX - startX) * progress;
                activeCard.y = startY + (endY - startY) * progress;

                if (progress <= 0.5) {
                    activeCard.scale.x = baseCenterScale;
                } 
                else if (progress <= 0.75) {
                    let flipProg = (progress - 0.5) / 0.25; 
                    activeCard.scale.x = baseCenterScale * (1 - flipProg);
                } 
                else {
                    if (!isFlipped) {
                        isFlipped = true;
                        this.safeDestroy(centerFaceDown);
                        
                        const centerFaceUp = this.deckInstance!.createCardToDeal(true, centerRank, centerSuit);
                        centerFaceUp.scale.set(0, baseCenterScale);
                        centerFaceUp.x = activeCard.x;
                        centerFaceUp.y = activeCard.y;
                        this.mainLayer.addChild(centerFaceUp);
                        
                        const idx = this.dealtCardsUI.indexOf(centerFaceDown);
                        if (idx !== -1) this.dealtCardsUI[idx] = centerFaceUp;
                        else this.dealtCardsUI.push(centerFaceUp);
                        
                        activeCard = centerFaceUp;
                    }
                    let flipProg = (progress - 0.75) / 0.25;
                    activeCard.scale.x = baseCenterScale * flipProg;
                }

                if (progress === 1) {
                    if (this.app && this.app.ticker) this.app.ticker.remove(slideAndFlipAnim);
                    activeCard.scale.x = baseCenterScale;
                    activeCard.x = endX;
                    activeCard.y = endY;
                    finalCenterCard = activeCard; 
                    resolve();
                }
            };
            if (this.app && this.app.ticker) this.app.ticker.add(slideAndFlipAnim);
        });

        await this.pixiDelay(1500);

        let resultTextObj: PIXI.Text | null = null;
        const playerName = currentPlayer.isHero ? "Você" : currentPlayer.name;

        if (isWin) {
            // 1. Calcula o total bruto puxado da mesa
            const ganhoBruto = betAmount * 2;
            const rakeRate = this.gameState.rake ? (this.gameState.rake / 100) : 0;
            const rakeCut = ganhoBruto * rakeRate;
            
            // 2. Valor total que vai para a carteira (Aposta + Lucro - Rake)
            const totalCreditado = ganhoBruto - rakeCut;
            
            // 3. LUCRO LÍQUIDO: O total recebido menos a aposta original
            const lucroLiquido = totalCreditado - betAmount;
            
            const formatadoTexto = lucroLiquido.toFixed(2).replace('.', ',');

            // O texto agora mostra SÓ O LUCRO
            const wonText = currentPlayer.isHero ? `Parabéns!\nVocê ganhou R$ ${formatadoTexto}` : `${playerName} ganhou\nR$ ${formatadoTexto}`;
            resultTextObj = new PIXI.Text({
                text: wonText,
                style: { fontFamily: 'Arial', fontSize: 14, fill: 0xFFD700, fontWeight: 'bold', align: 'center', stroke: '#000000', strokeThickness: 3 }
            } as any);
            resultTextObj.anchor.set(0.5);
            resultTextObj.x = 215;
            resultTextObj.y = 510; 
            if (!document.hidden) this.mainLayer.addChild(resultTextObj);

            // A ficha animada continua mostrando o bolo total (Aposta + Lucro) voltando pra ele
            const valorParaFicha = Number(totalCreditado.toFixed(2));
            const winChip = await this.throwCustomChip(this.POT_X - 35, this.POT_Y, betX + 15, betY, valorParaFicha, false);
            
            await this.pixiDelay(800);
            
            if (betChip) {
                this.performAnimation(betChip, pX, pY, 15).then(() => this.safeDestroy(betChip));
            }
            if (winChip) {
                this.performAnimation(winChip, pX, pY, 15).then(() => this.safeDestroy(winChip));
            }
            await this.pixiDelay(2500);

        } else {
            const lostText = currentPlayer.isHero ? `Você perdeu!` : `${playerName} perdeu!`;
            resultTextObj = new PIXI.Text({
                text: lostText,
                style: { fontFamily: 'Arial', fontSize: 14, fill: 0xBDC3C7, fontWeight: 'bold', align: 'center', stroke: '#000000', strokeThickness: 3 }
            } as any);
            resultTextObj.anchor.set(0.5);
            resultTextObj.x = 215;
            resultTextObj.y = 510; 
            if (!document.hidden) this.mainLayer.addChild(resultTextObj);

            await this.pixiDelay(800);

            if (betChip) {
                while(betChip.children.length > 1) { betChip.removeChildAt(1); } 
                
                await this.performAnimation(betChip, this.POT_X - 35, this.POT_Y, 15);
                
                this.playChipHitPotAnimation(); 
                
                betChip.visible = false;
                this.potChipsUI.push(betChip); 
            }
            await this.pixiDelay(2500);
        }

        if (resultTextObj) {
            if (this.app && resultTextObj.parent) resultTextObj.parent.removeChild(resultTextObj);
            resultTextObj.destroy();
        }
        
        const cardsToTrash: PIXI.Container[] = [];
        if (uiCardsSeguros && uiCardsSeguros.length > 0) {
            cardsToTrash.push(...uiCardsSeguros);
        }
        if (finalCenterCard) cardsToTrash.push(finalCenterCard);

        await this.discardCards(cardsToTrash);
        
        if (currentPlayer.isHero) {
            this.heroPixiCards = [];
        }
        currentPlayer.uiCards = [];
        currentPlayer.status = 'done';
        this.darkenAvatar(seatIndex); 
    }

    public async rechargePotAnim() {
        const avisoText = new PIXI.Text({
            text: "Pote quebrado!\nCobrando nova Ante...",
            style: { fontFamily: 'Arial', fontSize: 14, fill: 0xBDC3C7, fontWeight: 'bold', align: 'center', stroke: '#000000', strokeThickness: 3 }
        } as any);
        avisoText.anchor.set(0.5);
        avisoText.x = 215;
        avisoText.y = 510;
        if (this.app && !document.hidden) this.mainLayer.addChild(avisoText);

        await this.pixiDelay(1000);

        const antePromises = [];
        for (let i = 0; i < this.gameState.maxPlayers; i++) {
            if (this.gameState.players[i] && this.gameState.players[i].isSeated && this.gameState.players[i].chips > 0) {
                
                const coords = this.seatCoords[i];
                const pX = coords?.x ?? 0;
                const pY = coords?.y ?? 0;
                
                antePromises.push(this.throwCustomChip(pX, pY, this.POT_X - 35, this.POT_Y, undefined, false).then(chip => { 
                    if (chip) {
                        this.playChipHitPotAnimation(); 
                        chip.visible = false;
                        this.potChipsUI.push(chip);
                    }
                }));
            }
        }

        await Promise.all(antePromises);
        await this.pixiDelay(800);

        if (this.app && avisoText.parent) avisoText.parent.removeChild(avisoText);
        avisoText.destroy();
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
            if (this.app) {
                this.pixiDelay(2000).then(() => {
                    if (obj && !obj.destroyed) {
                        try { obj.destroy({ children: true }); } catch (e) {}
                    }
                });
            } else {
                setTimeout(() => {
                    if (obj && !obj.destroyed) {
                        try { obj.destroy({ children: true }); } catch (e) {}
                    }
                }, 2000);
            }
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
            this.tableInfoTextUI.text = `JOGO: MEINHO\nMESA: ${(this.gameState.tableName || 'CARREGANDO...').toUpperCase()}\nBUY-IN: R$ ${this.gameState.tableMinBuyIn}\nANTE: R$ ${this.gameState.minBet}`;
        }

        if (this.gameState.pot > 0 && Math.random() > 0.8) {
            const p = new PIXI.Graphics();
            const size = Math.random() * 2 + 1;
            p.circle(0, 0, size);
            p.fill({ color: this.MAGIC_COLORS[Math.floor(Math.random() * this.MAGIC_COLORS.length)], alpha: 0.6 });
            p.x = (this.POT_X - 35) + (Math.random() - 0.5) * 40;
            p.y = this.POT_Y + (Math.random() - 0.5) * 20;
            this.particleLayer.addChild(p);
            this.activeFireParticles.push({ mesh: p, life: 1.0, vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * -1 - 0.5 });
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

    private async discardCards(cardsToDiscard: PIXI.Container[]) {
        if (!this.app || cardsToDiscard.length === 0) return;

        this.isDiscardingCards = true;
        this.updateDeckVisibility();

        const PORTAL_X = 265; 
        const PORTAL_Y = 420; 

        const CORE_RADIUS = 12; 
        const blackHoleCore = new PIXI.Graphics();
        blackHoleCore.circle(0, 0, CORE_RADIUS); 
        blackHoleCore.fill({ color: 0x000000, alpha: 1 });
        blackHoleCore.x = PORTAL_X;
        blackHoleCore.y = PORTAL_Y;
        this.mainLayer.addChild(blackHoleCore);

        let portalActive = true;
        let angleOffset = 0;
        let coreScale = 1.0; 

        const emitPlasmaAnim = () => {
            if (!portalActive || !this.app) return;
            
            angleOffset += 0.25; 

            const particlesPerFrame = 20; 
            for (let i = 0; i < particlesPerFrame; i++) {
                const p = new PIXI.Graphics();
                
                const size = Math.random() * 2 + 1;
                p.circle(0, 0, size);
                
                const color = this.MAGIC_COLORS[Math.floor(Math.random() * this.MAGIC_COLORS.length)];
                p.fill({ color: color, alpha: 0.8 });

                const spawnRadius = CORE_RADIUS * coreScale; 
                const angle = angleOffset + (i * (Math.PI * 2 / particlesPerFrame));
                
                p.x = PORTAL_X + Math.cos(angle) * spawnRadius;
                p.y = PORTAL_Y + Math.sin(angle) * spawnRadius;
                
                this.mainLayer.addChild(p);

                const radialSpeed = 1.0 + Math.random() * 2.0;
                const vrX = Math.cos(angle) * radialSpeed;
                const vrY = Math.sin(angle) * radialSpeed;

                const orbitalSpeed = 3.0; 
                const vtX = Math.cos(angle + Math.PI / 2) * orbitalSpeed;
                const vtY = Math.sin(angle + Math.PI / 2) * orbitalSpeed;

                const life = 0.6 + Math.random() * 0.4;

                this.activeFireParticles.push({ 
                    mesh: p, 
                    life: life, 
                    vx: vrX + vtX, 
                    vy: vrY + vtY 
                });
            }
        };
        this.app.ticker.add(emitPlasmaAnim);

        const collectPromises = cardsToDiscard.map((card, index) => {
            if (!card || card.destroyed) return Promise.resolve();
            
            card.filters = []; 
            
            if (card.parent === this.mainLayer) {
                this.mainLayer.setChildIndex(card, this.mainLayer.children.length - 1);
            }

            if (document.hidden) {
                const idx = this.dealtCardsUI.indexOf(card);
                if (idx > -1) this.dealtCardsUI.splice(idx, 1);
                this.safeDestroy(card);
                return Promise.resolve();
            }

            return new Promise<void>((resolve) => {
                this.pixiDelay(index * 100).then(() => {
                    if (!card || card.destroyed || !this.app || !this.app.ticker) return resolve();

                    const startX = card.x;
                    const startY = card.y;
                    const originalScaleX = Math.abs(card.scale.x);
                    const originalScaleY = Math.abs(card.scale.y);
                    
                    let progress = 0;
                    const speed = 0.012 + (Math.random() * 0.008); 

                    const suckAnim = () => {
                        if (!card || card.destroyed || !this.app || !this.app.ticker) {
                            if (this.app && this.app.ticker) this.app.ticker.remove(suckAnim);
                            resolve();
                            return;
                        }

                        progress += speed;
                        if (progress >= 1) progress = 1;

                        const gravityPull = progress * progress * progress * progress; 
                        
                        const orbitAngle = gravityPull * Math.PI * 1.5; 
                        const dx = startX - PORTAL_X;
                        const dy = startY - PORTAL_Y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        const initialAngle = Math.atan2(dy, dx);

                        const currentDist = dist * (1 - gravityPull);
                        card.x = PORTAL_X + Math.cos(initialAngle + orbitAngle) * currentDist;
                        card.y = PORTAL_Y + Math.sin(initialAngle + orbitAngle) * currentDist;

                        card.rotation += 0.2 + (gravityPull * 0.8);
                        
                        card.scale.set(
                            originalScaleX * (1 - gravityPull), 
                            originalScaleY * (1 - (gravityPull * 0.5)) 
                        );
                        card.alpha = 1 - gravityPull; 

                        if (progress === 1) {
                            if (this.app && this.app.ticker) this.app.ticker.remove(suckAnim);
                            
                            const idx = this.dealtCardsUI.indexOf(card);
                            if (idx > -1) this.dealtCardsUI.splice(idx, 1);
                            this.safeDestroy(card);
                            resolve();
                        }
                    };
                    this.app.ticker.add(suckAnim);
                });
            });
        });

        await Promise.all(collectPromises);
        
        await new Promise<void>((resolve) => {
            const collapseAnim = () => {
                if (!this.app || !this.app.ticker) {
                    resolve();
                    return;
                }
                
                coreScale -= 0.06; 
                
                if (coreScale <= 0) {
                    coreScale = 0;
                    if (this.app && this.app.ticker) this.app.ticker.remove(collapseAnim);
                    
                    for(let i = 0; i < 40; i++) {
                        const p = new PIXI.Graphics();
                        p.circle(0, 0, Math.random() * 3 + 1.5);
                        p.fill({ color: this.MAGIC_COLORS[Math.floor(Math.random() * this.MAGIC_COLORS.length)], alpha: 1 });
                        p.x = PORTAL_X;
                        p.y = PORTAL_Y;
                        this.mainLayer.addChild(p);
                        
                        this.activeFireParticles.push({ 
                            mesh: p, 
                            life: 1.0, 
                            vx: (Math.random() - 0.5) * 16, 
                            vy: (Math.random() - 0.5) * 16 
                        });
                    }
                    resolve();
                }
                
                if (blackHoleCore && !blackHoleCore.destroyed) {
                    blackHoleCore.scale.set(coreScale);
                }
            };
            
            if (this.app && this.app.ticker) {
                this.app.ticker.add(collapseAnim);
            } else {
                resolve();
            }
        });

        portalActive = false;
        if (this.app && this.app.ticker) {
            this.app.ticker.remove(emitPlasmaAnim);
        }
        
        if (blackHoleCore.parent) blackHoleCore.parent.removeChild(blackHoleCore);
        blackHoleCore.destroy();

        this.isDiscardingCards = false;
        this.updateDeckVisibility();
    }

    private async throwCustomChip(startX: number, startY: number, endX: number, endY: number, amount?: number, isPot: boolean = false) {
        if (!this.app) return null;
        const chipContainer = new PIXI.Container();
        
        const textureToUse = isPot ? this.potChipsTexture : this.singleChipTexture;

        if (textureToUse) {
            const sprite = new PIXI.Sprite(textureToUse);
            sprite.anchor.set(0.5);
            sprite.width = isPot ? 65 : 30; 
            sprite.height = isPot ? 65 : 30; 
            chipContainer.addChild(sprite);
        }

        if (amount !== undefined) {
            const valueText = new PIXI.Text({
                text: amount.toString(),
                style: { fontFamily: 'Arial', fontSize: 11, fill: 0xffffff, fontWeight: 'bold' }
            } as any);
            valueText.anchor.set(0.5);
            
            const pillWidth = valueText.width + 12; 
            const pillBg = new PIXI.Graphics();
            
            pillBg.roundRect(12, -14, pillWidth, 20, 10);
            pillBg.fill({ color: 0x000000, alpha: 0.75 });
            pillBg.stroke({ width: 1, color: 0x00f3ff, alpha: 0.8 }); 
            
            valueText.x = 12 + (pillWidth / 2);
            valueText.y = -4; 
            
            chipContainer.addChild(pillBg);
            chipContainer.addChild(valueText);
        }

        chipContainer.x = startX;
        chipContainer.y = startY;
        this.mainLayer.addChild(chipContainer);

        await this.performAnimation(chipContainer, endX, endY, 15); 
        return chipContainer;
    }

    public playSitEffect(visualSeatIndex: number) {
        if (this.playerSeats && this.playerSeats[visualSeatIndex]) {
            this.playerSeats[visualSeatIndex].playSitAnimation();
        }
    }

    public playStandEffect(visualSeatIndex: number) {
        if (this.playerSeats && this.playerSeats[visualSeatIndex]) {
            this.playerSeats[visualSeatIndex].playStandAnimation();
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
            if (seat) {
                seat.setEmptyState(isHeroSeated);
            }
        });
    }
}