import * as PIXI from 'pixi.js';
import { MeinhoPixiEngine } from '../MeinhoPixiEngine';
import { MeinhoAnimator } from '../MeinhoAnimator';
import { MeinhoHelper } from '../MeinhoHelper';

export class MeinhoDealService {
    // 🔥 TRAVA ABSOLUTA: Impede que o Vue recarregue as cartas enquanto estão sendo dadas
    public isDealing: boolean = false;

    constructor(private engine: MeinhoPixiEngine) {}

    public async startGameAutomatically(isInstant: boolean = false) {
        // Se já está dando as cartas, ignora qualquer tentativa do servidor de recarregar a mesa
        if (this.isDealing) return; 
        
        // 🔥 CORREÇÃO: "Kill Switch"
        // Incrementa a geração ANTES de pegar o currentGen. Isso anula imediatamente 
        // qualquer animação, pixiDelay ou loop da mão anterior que estivesse rodando.
        this.engine.animGeneration++;

        this.isDealing = true;
        const currentGen = this.engine.animGeneration; 

        if (!isInstant) {
            this.engine.heroHasRevealedCurrentHand = false;
            this.engine.callbacks.setDealing(true);
            this.engine.callbacks.setAnimating(true); 
        }

        const lockedPeekMode = this.engine.peekMode;
        
        try {
            this.engine.boardService.clearDealtCards();
            
            for (let i = 0; i < this.engine.gameState.maxPlayers; i++) {
                if (this.engine.gameState.players[i]) this.engine.gameState.players[i].uiCards = [];
            }

            if (this.engine.potChipsUI.length === 0 && this.engine.gameState.pot > 0) {
                if (isInstant) {
                    const dummyChip = new PIXI.Container();
                    dummyChip.visible = false;
                    this.engine.potChipsUI.push(dummyChip);
                    if (this.engine.boardUI && this.engine.boardUI.potStackSprite) {
                        this.engine.boardUI.potStackSprite.visible = true; 
                    }
                } else {
                    const antePromises = [];
                    for (let i = 0; i < this.engine.gameState.maxPlayers; i++) {
                        if (this.engine.gameState.players[i] && this.engine.gameState.players[i].isSeated && this.engine.gameState.players[i].status === 'playing') {
                            const coords = this.engine.seatCoords[i];
                            antePromises.push(MeinhoAnimator.throwCustomChip(this.engine, coords?.x ?? 0, coords?.y ?? 0, this.engine.POT_X - 35, this.engine.POT_Y, undefined, false).then(chip => { 
                                if (chip) {
                                    if (currentGen === this.engine.animGeneration) {
                                        this.engine.audioService.tocarSom(this.engine.audioService.somChip);
                                        if (this.engine.boardUI) this.engine.boardUI.playChipHitPotAnimation();
                                        MeinhoHelper.spawnPotHitParticles(this.engine.particleLayer, this.engine.activeFireParticles, this.engine.POT_X, this.engine.POT_Y);
                                    }
                                    chip.visible = false; 
                                    this.engine.potChipsUI.push(chip);
                                }
                            }));
                        }
                    }
                    
                    if (antePromises.length > 0) {
                        await Promise.all(antePromises);
                        if (currentGen !== this.engine.animGeneration) return; 
                    }
                }
            }
            
            const dealOrder: number[] = [];
            const validStatuses = ['playing']; 

            let startSeat = this.engine.gameState.currentTurn !== -1 ? this.engine.gameState.currentTurn : 0;

            for (let round = 0; round < 2; round++) {
                for (let offset = 0; offset < this.engine.gameState.maxPlayers; offset++) {
                    let i = (startSeat + offset) % this.engine.gameState.maxPlayers;
                    
                    if (this.engine.gameState.players[i] && this.engine.gameState.players[i].isSeated && validStatuses.includes(this.engine.gameState.players[i].status)) {
                        dealOrder.push(i * 2 + round); 
                    }
                }
            }

            for (const targetIndex of dealOrder) {
                if (currentGen !== this.engine.animGeneration) return; 
                if (!this.engine.app || !this.engine.deckInstance) break;
                
                const visualSeat = Math.floor(targetIndex / 2);
                const isLeft = targetIndex % 2 === 0;
                const player = this.engine.gameState.players[visualSeat];
                if (!player) continue;

                if (!player.serverCards || player.serverCards.length === 0) continue;

                const target = this.engine.cardTargets.find(c => c.seat === visualSeat && c.isLeft === isLeft);
                if (!target) continue;
                
                const isTargetHero = player.isHero;
                const finalScale = isTargetHero ? 1.05 : 0.65;
                const spacing = isTargetHero ? 16 : 10; 
                const finalX = isLeft ? target.x - spacing / 2 : target.x + spacing / 2;

                const cardIndex = isLeft ? 0 : 1;

                if (player.serverCards.length <= cardIndex) continue;
                const cardStr = player.serverCards[cardIndex];
                if (!cardStr) continue;

                const isHiddenPlaceholder = cardStr === "Hidden";
                const rank = isHiddenPlaceholder ? "A" : (cardStr.slice(0, -1) || "A");
                const suit = isHiddenPlaceholder ? "♠" : (cardStr.slice(-1) || "♠");
                
                let isFaceUp = false;
                
                if (isTargetHero) {
                    if (lockedPeekMode) {
                        isFaceUp = false; 
                    } else {
                        isFaceUp = true;  
                    }

                    if (isInstant && this.engine.heroHasRevealedCurrentHand) {
                        isFaceUp = true;
                    }
                }
                
                const card = this.engine.deckInstance.createCardToDeal(isFaceUp, rank, suit);
                card.label = isFaceUp ? "faceUp" : "faceDown";
                
                (card as any).ownerSeat = visualSeat;
                
                card.scale.set(finalScale);
                card.visible = true;

                this.engine.mainLayer.addChild(card);
                this.engine.dealtCardsUI.push(card); 
                
                if (isTargetHero) {
                    this.engine.heroPixiCards.push(card);
                    (card as any).isRevealed = !lockedPeekMode; 
                }
                
                if (!player.uiCards) player.uiCards = [];
                player.uiCards.push(card);
                
                if (isInstant) {
                    card.x = finalX;
                    card.y = target.y;
                } else {
                    this.engine.audioService.tocarSom(this.engine.audioService.somCarta);

                    const trailAnim = () => {
                        if (currentGen !== this.engine.animGeneration) {
                            if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.remove(trailAnim);
                            return;
                        }
                        const p = new PIXI.Graphics();
                        p.circle(0, 0, 3);
                        p.fill({ color: 0x00f3ff, alpha: 0.6 });
                        p.x = card.x;
                        p.y = card.y;
                        this.engine.particleLayer.addChild(p);
                        this.engine.activeFireParticles.push({ mesh: p, life: 0.6, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5 });
                    };
                    this.engine.app.ticker.add(trailAnim);
                    
                    await this.engine.performAnimation(card, finalX, target.y, 15); 
                    
                    if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.remove(trailAnim);
                }
            }

            if (currentGen !== this.engine.animGeneration) return;

            if (this.engine.gameState.phase === 'resolving' || isInstant) {
                const isCenterValid = this.engine.gameState.centerCardStr && this.engine.gameState.centerCardStr !== "Hidden" && this.engine.gameState.centerCardStr !== "Nenhuma";
                const shouldReveal = this.engine.gameState.phase === 'resolving' || isCenterValid;
                this.engine.boardService.drawCenterCardInstant(this.engine.gameState.centerCardStr, shouldReveal);
            }

        } finally {
            this.isDealing = false; 
            if (!isInstant && currentGen === this.engine.animGeneration) {
                this.engine.callbacks.setDealing(false);
                this.engine.callbacks.setAnimating(false);
                this.engine.callbacks.flushPendingState();
            }
        }
    }

    public async revealHeroCards() {
        if (this.isDealing) return; 
        if (this.engine.heroPixiCards.length < 2) return;

        this.engine.heroHasRevealedCurrentHand = true;
        
        if (!this.engine.app || !this.engine.deckInstance) return;
        const hero = this.engine.gameState.players.find((p: any) => p.isHero);
        if (!hero || !hero.serverCards) return;

        for (let index = 0; index < this.engine.heroPixiCards.length; index++) {
            const oldCard = this.engine.heroPixiCards[index];
            if (oldCard.label === "faceUp" || (oldCard as any).isRevealed) continue;

            // 🔥 CORREÇÃO: Aborta a revelação se a carta real não estiver no array, em vez de criar um Ás de Espadas.
            if (hero.serverCards.length <= index) continue;
            const cardStr = hero.serverCards[index];
            if (!cardStr || cardStr === "Hidden") continue;

            const rank = cardStr.slice(0, -1) || "A";
            const suit = cardStr.slice(-1) || "♠";
            
            const newCard = this.engine.deckInstance.createCardToDeal(true, rank, suit);
            newCard.label = "faceUp";
            
            (newCard as any).ownerSeat = (oldCard as any).ownerSeat;
            
            newCard.x = oldCard.x;
            newCard.y = oldCard.y;
            newCard.scale.set(Math.abs(oldCard.scale.x));
            newCard.visible = true; 
            (newCard as any).isRevealed = true; 
            
            this.engine.mainLayer.addChild(newCard);
            
            const dealtIndex = this.engine.dealtCardsUI.indexOf(oldCard);
            if (dealtIndex !== -1) this.engine.dealtCardsUI[dealtIndex] = newCard;
            else this.engine.dealtCardsUI.push(newCard);
            
            const playerIndex = hero.uiCards.indexOf(oldCard);
            if(playerIndex !== -1) hero.uiCards[playerIndex] = newCard;

            this.engine.heroPixiCards[index] = newCard;
            
            if (oldCard.parent) oldCard.parent.removeChild(oldCard);
            try { oldCard.destroy({ children: true }); } catch(e){}
        }
    }
}