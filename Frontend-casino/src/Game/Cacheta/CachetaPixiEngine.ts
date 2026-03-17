import * as PIXI from 'pixi.js';
import { Deck } from '../Deck';
import { PlayerSeat } from '../PlayerSeat';
import { Animator } from '../Animator';

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
    
    // 👇 MANTIDO DO MEINHO: Cache robusto de texturas
    private avatarTextureCache: Map<string, PIXI.Texture> = new Map();

    public backgroundLayer = new PIXI.Container();
    public particleLayer = new PIXI.Container();
    public mainLayer = new PIXI.Container();

    // Coordenadas centrais exclusivas da Cacheta
    public readonly MONTE_X = 175;
    public readonly MONTE_Y = 420;
    public readonly LIXO_X = 255;
    public readonly LIXO_Y = 420;
    public readonly VIRA_X = 215;
    public readonly VIRA_Y = 330;

    public cardTargets: { x: number, y: number, seat: number }[] = [];
    public dealtCardsUI: PIXI.Container[] = [];
    public playerSeats: PlayerSeat[] = [];
    public seatCoords: { x: number, y: number }[] = [];
    public activeFireParticles: { mesh: PIXI.Graphics; life: number; vx: number; vy: number; }[] = [];

    // Controle da Mão do Jogador (Hero)
    public heroCardData: { str: string, sprite: PIXI.Container }[] = [];
    public selectedCardStr: string | null = null;

    // Elementos da mesa da Cacheta
    public viraCardUI: PIXI.Container | null = null;
    public lixoCardsUI: PIXI.Container[] = [];

    public activeTimerSeat = -1;
    public turnEndTime = 0;
    public readonly TIMER_DURATION_SEC = 20;

    public readonly MAGIC_COLORS = [0x00f3ff, 0xa855f7, 0xff6bfb, 0xffffff];

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
        this.app.stage.addChild(this.particleLayer);
        this.app.stage.addChild(this.mainLayer);

        canvasContainer.appendChild(this.app.canvas);

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            this.app.ticker.maxFPS = 50; 
        }

        let tableTexture = PIXI.Texture.EMPTY;
        let deckTexture = PIXI.Texture.EMPTY;

        // 👇 CORREÇÃO: Carregamento blindado igual ao Meinho, mas separado para não explodir a aura azul se uma imagem falhar
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
        blurFilter.blur = 60; 
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
    
    // 👇 MANTIDO DO MEINHO: Busca a textura de forma segura
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
            if (seat.container.parent) seat.container.parent.removeChild(seat.container);
            seat.container.destroy({ children: true });
        });
        
        this.playerSeats = [];
        this.cardTargets = [];
        this.seatCoords = []; 

        // Garante que vai renderizar mesmo que o servidor mande um número inesperado
        const safeNumSeats = Math.max(2, Math.min(6, numSeats || 6));

        for (let i = 0; i < safeNumSeats; i++) {
            let avatarX = 0, avatarY = 0, cx = 0, cy = 0;

            // Posições calculadas para 2 até 6 jogadores
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
            else { // Padrão 6 lugares
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

    // 👇 MANTIDO DO MEINHO: Função 100% igual que atualiza a cadeira sem quebrar
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
        this.dealtCardsUI.forEach(card => this.safeDestroy(card));
        this.dealtCardsUI.length = 0;
        this.heroCardData = []; 
        this.selectedCardStr = null;
        
        if (this.viraCardUI) this.safeDestroy(this.viraCardUI);
        this.lixoCardsUI.forEach(card => this.safeDestroy(card));
        this.lixoCardsUI.length = 0;
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

    public syncBoard() {
        if (!this.deckInstance || !this.app) return;

        if (this.gameState.viraCard) {
            if (!this.viraCardUI) {
                const rank = this.gameState.viraCard.slice(0, -1) || "A";
                const suit = this.gameState.viraCard.slice(-1) || "♠";
                this.viraCardUI = this.deckInstance.createCardToDeal(true, rank, suit);
                this.viraCardUI.scale.set(0.65);
                this.viraCardUI.x = this.VIRA_X;
                this.viraCardUI.y = this.VIRA_Y;
                this.mainLayer.addChild(this.viraCardUI);
            }
        }

        this.lixoCardsUI.forEach(c => this.safeDestroy(c));
        this.lixoCardsUI = [];
        if (this.gameState.discardPile && this.gameState.discardPile.length > 0) {
            const topCardStr = this.gameState.discardPile[this.gameState.discardPile.length - 1];
            const rank = topCardStr.slice(0, -1) || "A";
            const suit = topCardStr.slice(-1) || "♠";
            const lixoCard = this.deckInstance.createCardToDeal(true, rank, suit);
            lixoCard.scale.set(0.65);
            lixoCard.x = this.LIXO_X;
            lixoCard.y = this.LIXO_Y;
            this.mainLayer.addChild(lixoCard);
            this.lixoCardsUI.push(lixoCard);
        }

        const hero = this.gameState.players.find((p: any) => p.isHero);
        if (hero && hero.serverCards) {
            const currentServerCards = [...hero.serverCards];
            
            this.heroCardData.forEach(c => this.safeDestroy(c.sprite));
            this.heroCardData = [];
            
            const totalCards = currentServerCards.length;
            const spreadFactor = 30; 
            const startOffset = - ((totalCards - 1) * spreadFactor) / 2;
            const targetY = this.seatCoords[0].y - 95;

            currentServerCards.forEach((cardStr, index) => {
                const rank = cardStr.slice(0, -1) || "A";
                const suit = cardStr.slice(-1) || "♠";
                const cardSprite = this.deckInstance!.createCardToDeal(true, rank, suit);
                
                cardSprite.scale.set(0.9);
                cardSprite.x = this.seatCoords[0].x + startOffset + (index * spreadFactor);
                cardSprite.y = targetY;
                
                cardSprite.eventMode = 'static';
                cardSprite.cursor = 'pointer';
                cardSprite.on('pointerdown', () => this.onHeroCardClicked(cardStr, cardSprite));

                if (this.selectedCardStr === cardStr) {
                    cardSprite.y -= 15;
                }

                this.mainLayer.addChild(cardSprite);
                this.heroCardData.push({ str: cardStr, sprite: cardSprite });
            });
        }
    }

    private onHeroCardClicked(cardStr: string, clickedSprite: PIXI.Container) {
        const baseTargetY = this.seatCoords[0].y - 95;

        this.heroCardData.forEach(c => {
            c.sprite.y = baseTargetY;
        });

        if (this.selectedCardStr === cardStr) {
            this.selectedCardStr = null;
            this.callbacks.onCardSelected(null);
        } else {
            this.selectedCardStr = cardStr;
            clickedSprite.y = baseTargetY - 15;
            this.callbacks.onCardSelected(cardStr);
        }
    }

    public async startGameAutomatically() {
        this.callbacks.setDealing(true);
        this.callbacks.setAnimating(true); 
        
        try {
            this.resetAvatars();
            this.clearDealtCards();
            
            for (let i = 0; i < this.gameState.maxPlayers; i++) {
                const player = this.gameState.players[i];
                if (player && player.isSeated && player.status === 'playing' && !player.isHero) {
                    const target = this.cardTargets.find(c => c.seat === i);
                    if (target) {
                        const backCard = this.deckInstance!.createCardToDeal(false, "A", "♠");
                        backCard.scale.set(0.5);
                        this.mainLayer.addChild(backCard);
                        this.dealtCardsUI.push(backCard);
                        await this.performAnimation(backCard, target.x, target.y, 25);
                    }
                }
            }

            this.syncBoard();

        } finally {
            this.callbacks.setDealing(false);
            this.callbacks.setAnimating(false);
            this.callbacks.flushPendingState();
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
}