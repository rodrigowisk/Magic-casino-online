import * as PIXI from 'pixi.js';
import { Deck } from '../Deck';
import { PlayerSeat } from '../PlayerSeat';
import { Animator } from '../Animator';
import { MeinhoHelper } from './MeinhoHelper';
import { MeinhoBoardUI } from './MeinhoBoardUI';
import { MeinhoAnimator } from './MeinhoAnimator';

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
    
    public singleChipTexture: PIXI.Texture | null = null;
    public potChipsTexture: PIXI.Texture | null = null;
    private avatarTextureCache: Map<string, PIXI.Texture> = new Map();

    public backgroundLayer = new PIXI.Container();
    public particleLayer = new PIXI.Container();
    public mainLayer = new PIXI.Container();

    public cardTargets: { x: number, y: number, seat: number, isLeft: boolean }[] = [];
    public dealtCardsUI: PIXI.Container[] = [];
    public potChipsUI: PIXI.Container[] = []; 
    public playerSeats: PlayerSeat[] = [];
    
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

    // --- SISTEMA DE ÁUDIO ---
    public somCarta: HTMLAudioElement | null = null;
    public somSentar: HTMLAudioElement | null = null;
    public somLevantar: HTMLAudioElement | null = null; 
    public somChip: HTMLAudioElement | null = null;
    public somChips: HTMLAudioElement | null = null;
    public somVitoria: HTMLAudioElement | null = null; 
    public somDerrota: HTMLAudioElement | null = null; 
    public somPular: HTMLAudioElement | null = null; 
    public somTimer: HTMLAudioElement | null = null; 
    public somAlarm: HTMLAudioElement | null = null; 
    private ultimoBlocoTempo: number = -1; 

    constructor(public gameState: any, public callbacks: EngineCallbacks) {}

    public tocarSom(audio: HTMLAudioElement | null) {
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.warn('Áudio bloqueado pelo navegador:', e));
        }
    }

    public pararSom(audio: HTMLAudioElement | null) {
        if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    }

    public setPeekMode(enabled: boolean) {
        this.peekMode = enabled;
    }

    public async init(canvasContainer: HTMLElement, width: number, height: number, defaultAvatarImg: string, deckImg: string, singleChipImg: string, tableImg: string, potChipsImg: string) {
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

        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            this.app.ticker.maxFPS = 50; 
        }

        // CARREGANDO ÁUDIOS
        try {
            this.somCarta = new Audio('/sons/1card.wav');
            this.somSentar = new Audio('/sons/rayseat.wav'); 
            this.somLevantar = new Audio('/sons/down.wav');  
            this.somChip = new Audio('/sons/chip.wav');      
            this.somChips = new Audio('/sons/chips.wav');    
            this.somVitoria = new Audio('/sons/victory.wav'); 
            this.somDerrota = new Audio('/sons/lose.mp3'); 
            this.somPular = new Audio('/sons/pular.mp3');
            this.somTimer = new Audio('/sons/timer.mp3');
            this.somAlarm = new Audio('/sons/alarm.mp3');
        } catch (e) {
            console.warn("Aviso: Falha ao carregar arquivos de áudio", e);
        }

        let tableTexture, deckTexture;

        try {
            tableTexture = await PIXI.Assets.load(tableImg);
            deckTexture = await PIXI.Assets.load(deckImg);
            this.singleChipTexture = await PIXI.Assets.load(singleChipImg);
            this.potChipsTexture = await PIXI.Assets.load(potChipsImg);
            
            const defaultTex = await PIXI.Assets.load(defaultAvatarImg);
            this.avatarTextureCache.set(defaultAvatarImg, defaultTex);
            this.avatarTextureCache.set('default', defaultTex); 
        } catch (e) {
            tableTexture = PIXI.Texture.EMPTY; deckTexture = PIXI.Texture.EMPTY; this.singleChipTexture = PIXI.Texture.EMPTY; this.potChipsTexture = PIXI.Texture.EMPTY; this.avatarTextureCache.set('default', PIXI.Texture.EMPTY);
        }

        this.boardUI = new MeinhoBoardUI(width, height, this.backgroundLayer, this.mainLayer, this.gameState, tableTexture, this.potChipsTexture, this.POT_X, this.POT_Y);
        
        this.app.ticker.add(() => this.updateFramePixi());

        this.cardTargets.length = 0; 
        this.buildSeats(this.gameState.maxPlayers);

        this.deckInstance = new Deck(265, 420, deckTexture, true); 
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
            if (seat.container.parent) seat.container.parent.removeChild(seat.container);
            seat.container.destroy({ children: true });
        });
        
        this.playerSeats = [];
        this.cardTargets = [];
        this.seatCoords = []; 

        for (let i = 0; i < numSeats; i++) {
            const coords = MeinhoHelper.getSeatCoords(numSeats, i);
            this.seatCoords[i] = { x: coords.avatarX, y: coords.avatarY };

            const player = this.gameState.players[i] || { name: 'Livre', chips: 0, isSeated: false };
            
            this.cardTargets.push({ x: coords.cx, y: coords.cy, seat: i, isLeft: true });
            this.cardTargets.push({ x: coords.cx, y: coords.cy, seat: i, isLeft: false });

            const seatUi = new PlayerSeat(
                coords.avatarX, coords.avatarY, this.getAvatarTexture(), player.name, player.chips, player.isSeated, () => this.callbacks.sitDown(i)
            );
            this.mainLayer.addChild(seatUi.container);
            this.playerSeats.push(seatUi);
        }
    }

    public updateDeckVisibility() {
        if (this.deckInstance && this.gameState && this.gameState.players) {
            const seatedCount = this.gameState.players.filter((p: any) => p.isSeated).length;
            const isGameActive = this.gameState.phase !== 'waiting';
            
            if (this.isDiscardingCards || isGameActive) {
                this.deckInstance.view.visible = true;
            } else {
                this.deckInstance.view.visible = seatedCount > 1;
            }
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
        if (this.boardUI && this.boardUI.potStackSprite) this.boardUI.potStackSprite.visible = false;
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
                if (card && !card.destroyed) card.visible = visible;
            });
        }
    }

    public startTimer(seatIndex: number, timeLeftSeconds: number) {
        this.stopTimer(); 
        this.activeTimerSeat = seatIndex;
        this.ultimoBlocoTempo = -1;
        const safeTime = Math.min(timeLeftSeconds || this.TIMER_DURATION_SEC, this.TIMER_DURATION_SEC);
        this.turnEndTime = Date.now() + (safeTime * 1000);
        
        if (this.playerSeats[seatIndex]) this.playerSeats[seatIndex].startTimer();
    }

    public stopTimer() {
        this.activeTimerSeat = -1;
        this.ultimoBlocoTempo = -1;
        this.pararSom(this.somTimer);
        this.pararSom(this.somAlarm);
        this.playerSeats.forEach(seat => seat.stopTimer());
    }

    public async performAnimation(obj: PIXI.Container, targetX: number, targetY: number, speed: number) {
        if (!obj || obj.destroyed || !this.app) return Promise.resolve();
        if (document.hidden) {
            obj.x = targetX;
            obj.y = targetY;
            return Promise.resolve();
        }
        return Animator.animateTo(this.app, obj, targetX, targetY, speed);
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
                        antePromises.push(MeinhoAnimator.throwCustomChip(this, coords?.x ?? 0, coords?.y ?? 0, this.POT_X - 35, this.POT_Y, undefined, false).then(chip => { 
                            if (chip) {
                                this.tocarSom(this.somChip);
                                if (this.boardUI) this.boardUI.playChipHitPotAnimation();
                                MeinhoHelper.spawnPotHitParticles(this.particleLayer, this.activeFireParticles, this.POT_X, this.POT_Y);
                                chip.visible = false; 
                                this.potChipsUI.push(chip);
                            }
                        }));
                    }
                }
                await Promise.all(antePromises);
            }

            const dealOrder: number[] = [];
            for (let i = 0; i < this.gameState.maxPlayers; i++) if (this.gameState.players[i] && this.gameState.players[i].isSeated && this.gameState.players[i].status === 'playing') dealOrder.push(i * 2);
            for (let i = 0; i < this.gameState.maxPlayers; i++) if (this.gameState.players[i] && this.gameState.players[i].isSeated && this.gameState.players[i].status === 'playing') dealOrder.push(i * 2 + 1);

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

                if (isTargetHero && this.isHeroCardsHidden) card.visible = false;

                this.mainLayer.addChild(card);
                this.dealtCardsUI.push(card); 
                
                if (isTargetHero) this.heroPixiCards.push(card); 
                
                if (!player.uiCards) player.uiCards = [];
                player.uiCards.push(card);
                
                this.tocarSom(this.somCarta);

                const trailAnim = () => {
                    const p = new PIXI.Graphics();
                    p.circle(0, 0, 3);
                    p.fill({ color: 0x00f3ff, alpha: 0.6 });
                    p.x = card.x;
                    p.y = card.y;
                    this.particleLayer.addChild(p);
                    this.activeFireParticles.push({ mesh: p, life: 0.6, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5 });
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

        if (this.activeTimerSeat === seatIndex) this.stopTimer(); 

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
            this.tocarSom(this.somPular);
            await MeinhoAnimator.discardCards(this, cardsToTrash);
        }
        currentPlayer.uiCards = []; 
    }

    public async playBetAnimation(seatIndex: number, betAmount: number, isWin: boolean, playedCards: string[], centerCardRevealed: string) {
        if (!this.app || !this.deckInstance) return;

        const currentPlayer = this.gameState.players[seatIndex];
        if (!currentPlayer) return;

        if (this.activeTimerSeat === seatIndex) this.stopTimer(); 

        let revealedCards = playedCards || [];
        let centerCard = centerCardRevealed || "2♥";

        const coords = this.seatCoords[seatIndex];
        const { betX, betY } = MeinhoHelper.getBetTarget(coords?.x ?? 0, coords?.y ?? 0, this.POT_X - 35, this.POT_Y);
      
        const betChip = await MeinhoAnimator.throwCustomChip(this, coords?.x ?? 0, coords?.y ?? 0, betX, betY, betAmount, false);
        this.tocarSom(this.somChip);
        
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
            const winMath = MeinhoHelper.calcWin(betAmount, this.gameState.rake);
            
            const wonText = currentPlayer.isHero ? `Parabéns!\nVocê ganhou R$ ${winMath.formatadoTexto}` : `${playerName} ganhou\nR$ ${winMath.formatadoTexto}`;
            resultTextObj = new PIXI.Text({
                text: wonText,
                style: { fontFamily: 'Arial', fontSize: 14, fill: 0xFFD700, fontWeight: 'bold', align: 'center', stroke: '#000000', strokeThickness: 3 }
            } as any);
            resultTextObj.anchor.set(0.5);
            resultTextObj.x = 215;
            resultTextObj.y = 510; 
            
            if (!document.hidden) {
                this.mainLayer.addChild(resultTextObj);
                if (currentPlayer.isHero) this.tocarSom(this.somVitoria);
            }

            const winChip = await MeinhoAnimator.throwCustomChip(this, this.POT_X - 35, this.POT_Y, betX + 15, betY, Number(winMath.totalCreditado.toFixed(2)), false);
            this.tocarSom(this.somChips);

            await this.pixiDelay(800);
            
            if (betChip) {
                this.performAnimation(betChip, coords?.x ?? 0, coords?.y ?? 0, 15).then(() => {
                    this.tocarSom(this.somChips);
                    this.safeDestroy(betChip);
                });
            }
            if (winChip) {
                this.performAnimation(winChip, coords?.x ?? 0, coords?.y ?? 0, 15).then(() => this.safeDestroy(winChip));
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
            
            if (!document.hidden) {
                this.mainLayer.addChild(resultTextObj);
                if (currentPlayer.isHero) this.tocarSom(this.somDerrota);
            }

            await this.pixiDelay(800);

            if (betChip) {
                while(betChip.children.length > 1) { betChip.removeChildAt(1); } 
                
                await this.performAnimation(betChip, this.POT_X - 35, this.POT_Y, 15);
                this.tocarSom(this.somChip);
                
                if (this.boardUI) this.boardUI.playChipHitPotAnimation(); 
                MeinhoHelper.spawnPotHitParticles(this.particleLayer, this.activeFireParticles, this.POT_X, this.POT_Y);
                
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

        await MeinhoAnimator.discardCards(this, cardsToTrash);
        
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
                
                antePromises.push(MeinhoAnimator.throwCustomChip(this, pX, pY, this.POT_X - 35, this.POT_Y, undefined, false).then(chip => { 
                    if (chip) {
                        this.tocarSom(this.somChip);
                        if (this.boardUI) this.boardUI.playChipHitPotAnimation(); 
                        MeinhoHelper.spawnPotHitParticles(this.particleLayer, this.activeFireParticles, this.POT_X, this.POT_Y);
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
        this.pararSom(this.somTimer);
        this.pararSom(this.somAlarm);
        
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

    public safeDestroy(obj: PIXI.Container | null) {
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

    public pixiDelay(ms: number): Promise<void> {
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

    private updateFramePixi() {
        if (!this.app) return;
        
        if (this.boardUI) {
            this.boardUI.updateTexts(this.gameState.tableName, this.gameState.tableMinBuyIn, this.gameState.minBet, this.gameState.pot);
        }

        if (this.gameState.pot > 0 && Math.random() > 0.8) {
            MeinhoHelper.spawnIdlePotParticles(this.particleLayer, this.activeFireParticles, this.POT_X, this.POT_Y, this.MAGIC_COLORS);
        }

        MeinhoHelper.updateParticles(this.activeFireParticles);

        if (this.activeTimerSeat === -1) return;
        const seatUi = this.playerSeats[this.activeTimerSeat];
        if (!seatUi) return;

        const timeLeft = this.turnEndTime - Date.now();
        const currentSec = Math.ceil(timeLeft / 1000);

        if (timeLeft <= 0) {
            this.pararSom(this.somTimer);
            this.pararSom(this.somAlarm);
            this.ultimoBlocoTempo = -1;
            seatUi.updateTimer(0, 0);
            return;
        }

        const activePlayer = this.gameState.players[this.activeTimerSeat];
        const isHeroTurn = activePlayer && activePlayer.isHero;

        if (isHeroTurn && !document.hidden) {
            const blocoAtual = Math.ceil(currentSec / 5);

            if (blocoAtual !== this.ultimoBlocoTempo) {
                this.ultimoBlocoTempo = blocoAtual; 

                if (currentSec > 5) {
                    this.pararSom(this.somAlarm);
                    this.tocarSom(this.somTimer);
                } else {
                    this.pararSom(this.somTimer);
                    this.tocarSom(this.somAlarm); 
                }
            }
        } else {
            this.pararSom(this.somTimer);
            this.pararSom(this.somAlarm);
            this.ultimoBlocoTempo = -1;
        }

        const progress = Math.min(1, Math.max(0, timeLeft / (this.TIMER_DURATION_SEC * 1000)));

        seatUi.updateTimer(progress, currentSec);

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

    public playSitEffect(visualSeatIndex: number) {
        this.tocarSom(this.somSentar);
        if (this.playerSeats && this.playerSeats[visualSeatIndex]) {
            this.playerSeats[visualSeatIndex].playSitAnimation();
        }
    }

    public playStandEffect(visualSeatIndex: number) {
        this.tocarSom(this.somLevantar);
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