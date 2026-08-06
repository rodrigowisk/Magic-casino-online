import * as PIXI from 'pixi.js';
import { MeinhoPixiEngine } from '../MeinhoPixiEngine';
import { MeinhoAnimator } from '../MeinhoAnimator';
import { MeinhoHelper } from '../MeinhoHelper';

export class MeinhoBetService {
    constructor(private engine: MeinhoPixiEngine) {}

    public async playBetAnimation(
        seatIndex: number, 
        betAmount: number, 
        isWin: boolean, 
        playedCards: string[], 
        centerCardRevealed: string,
        timeElapsedMs: number = 0 
    ) {
        const currentGen = this.engine.animGeneration;
        if (!this.engine.app || !this.engine.deckInstance) return;

        // 🔥 TRAVA DE ESTADO INICIADA AQUI: Impede que o timer do próximo jogador sobreponha a animação
        this.engine.callbacks.setAnimating(true);

        try {
            const currentPlayer = this.engine.gameState.players[seatIndex];
            if (!currentPlayer) return;

            if (this.engine.activeTimerSeat === seatIndex) this.engine.stopTimer(); 

            if (this.engine.playerSeats[seatIndex]) {
                this.engine.boardService.refreshAvatarFilter(seatIndex);
            }

            let revealedCards = playedCards || [];
            let centerCard = centerCardRevealed || "2♥";

            const coords = this.engine.seatCoords[seatIndex];
            const { betX, betY } = MeinhoHelper.getBetTarget(coords?.x ?? 0, coords?.y ?? 0, this.engine.POT_X - 35, this.engine.POT_Y);
          
            let betChip: PIXI.Container | null = null;
            
            if (timeElapsedMs < 800) {
                 betChip = await MeinhoAnimator.throwCustomChip(this.engine, coords?.x ?? 0, coords?.y ?? 0, betX, betY, betAmount, false);
                 if (currentGen !== this.engine.animGeneration) { this.engine.safeDestroy(betChip); return; }
                 this.engine.audioService.tocarSom(this.engine.audioService.somChip);
            } else {
                 betChip = await MeinhoAnimator.throwCustomChip(this.engine, betX, betY, betX, betY, betAmount, false);
            }

            if (betChip) this.engine.transientUI.push(betChip);
            this.engine.gameState.phase = 'resolving';

            if (timeElapsedMs < 800) {
                await this.engine.pixiDelay(800 - timeElapsedMs, currentGen);
                if (currentGen !== this.engine.animGeneration) return;
            }

            let uiCardsSeguros: PIXI.Container[] = this.engine.dealtCardsUI.filter(c => (c as any).ownerSeat === seatIndex && !c.destroyed);

            if (!currentPlayer.isHero && revealedCards.length >= 2) {
                const flipPromises = uiCardsSeguros.map((oldCard, i) => {
                    return new Promise<void>((resolve) => {
                        const target = this.engine.cardTargets.find(c => c.seat === seatIndex && c.isLeft === (i === 0));
                        if (!target) return resolve();

                        const cardStr = revealedCards[i];
                        const rank = cardStr.slice(0, -1) || "A";
                        const suit = cardStr.slice(-1) || "♠";
                        const originalScale = 0.65;

                        if (timeElapsedMs >= 1400 || document.hidden) {
                            if (currentGen !== this.engine.animGeneration) return resolve(); 
                            
                            const newCard = this.engine.deckInstance!.createCardToDeal(true, rank, suit);
                            newCard.label = "faceUp";
                            (newCard as any).ownerSeat = seatIndex; 
                            
                            newCard.scale.set(originalScale);
                            newCard.x = i === 0 ? target.x - 5 : target.x + 5;
                            newCard.y = target.y;
                            
                            this.engine.safeDestroy(oldCard);
                            this.engine.mainLayer.addChild(newCard);
                            const idx = this.engine.dealtCardsUI.indexOf(oldCard);
                            if (idx !== -1) this.engine.dealtCardsUI[idx] = newCard;
                            else this.engine.dealtCardsUI.push(newCard);
                            
                            if (currentPlayer.uiCards) currentPlayer.uiCards[i] = newCard;
                            resolve();
                        } else {
                            let isShrinking = true;
                            const flipAnim = () => {
                                if (currentGen !== this.engine.animGeneration || !oldCard || oldCard.destroyed || !oldCard.visible || !this.engine.app || !this.engine.app.ticker) {
                                    if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.remove(flipAnim);
                                    resolve();
                                    return;
                                }

                                if (isShrinking) {
                                    oldCard.scale.x -= 0.15;
                                    if (oldCard.scale.x <= 0) {
                                        isShrinking = false;
                                        
                                        if (currentGen !== this.engine.animGeneration) {
                                            if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.remove(flipAnim);
                                            resolve();
                                            return;
                                        } 

                                        const newCard = this.engine.deckInstance!.createCardToDeal(true, rank, suit);
                                        newCard.label = "faceUp";
                                        (newCard as any).ownerSeat = seatIndex; 

                                        newCard.scale.set(0, originalScale);
                                        newCard.x = i === 0 ? target.x - 5 : target.x + 5;
                                        newCard.y = target.y;

                                        this.engine.safeDestroy(oldCard);
                                        this.engine.mainLayer.addChild(newCard);
                                        
                                        const idx = this.engine.dealtCardsUI.indexOf(oldCard);
                                        if (idx !== -1) this.engine.dealtCardsUI[idx] = newCard;
                                        else this.engine.dealtCardsUI.push(newCard);
                                        
                                        if (currentPlayer.uiCards) currentPlayer.uiCards[i] = newCard;

                                        const growAnim = () => {
                                            if (currentGen !== this.engine.animGeneration || !newCard || newCard.destroyed || !newCard.visible || !this.engine.app || !this.engine.app.ticker) {
                                                if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.remove(growAnim);
                                                if (newCard && !newCard.destroyed) this.engine.safeDestroy(newCard); 
                                                resolve();
                                                return;
                                            }
                                            newCard.scale.x += 0.15;
                                            if (newCard.scale.x >= originalScale) {
                                                newCard.scale.x = originalScale;
                                                if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.remove(growAnim);
                                                resolve();
                                            }
                                        };
                                        if (this.engine.app && this.engine.app.ticker) {
                                            this.engine.app.ticker.remove(flipAnim);
                                            this.engine.app.ticker.add(growAnim);
                                        } else { resolve(); }
                                    }
                                }
                            };
                            if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.add(flipAnim);
                            else resolve();
                        }
                    });
                });

                await Promise.all(flipPromises);
                
                if (timeElapsedMs < 1400) {
                    await this.engine.pixiDelay(1400 - Math.max(800, timeElapsedMs), currentGen);
                }
            }

            const centerRank = centerCard.slice(0, -1) || "A";
            const centerSuit = centerCard.slice(-1) || "♠";
            const baseCenterScale = 1.7; 
            
            // A carta nasce exatamente no baralho e desliza até a posição de
            // descanso na mesa — a mesma posição usada em MeinhoBoardService,
            // sempre calculada a partir do baralho (nunca mais números soltos).
            const startX = this.engine.deckInstance.view.x;
            const startY = this.engine.deckInstance.view.y;
            const endX = this.engine.deckInstance.view.x - 69; 
            const endY = this.engine.deckInstance.view.y - 3;

            await new Promise<void>((resolve) => {
                if (currentGen !== this.engine.animGeneration) { resolve(); return; }

                const existingCenter = this.engine.dealtCardsUI.filter(c => Math.abs(c.x - endX) < 5 && Math.abs(c.y - endY) < 5);
                existingCenter.forEach(c => {
                    const idx = this.engine.dealtCardsUI.indexOf(c);
                    if (idx !== -1) this.engine.dealtCardsUI.splice(idx, 1);
                    this.engine.safeDestroy(c);
                });

                if (timeElapsedMs > 2200) {
                    if (currentGen !== this.engine.animGeneration) { resolve(); return; }
                    const centerFaceUp = this.engine.deckInstance!.createCardToDeal(true, centerRank, centerSuit);
                    centerFaceUp.label = "faceUp";
                    centerFaceUp.scale.set(baseCenterScale);
                    centerFaceUp.x = endX;
                    centerFaceUp.y = endY;
                    this.engine.mainLayer.addChild(centerFaceUp);
                    this.engine.dealtCardsUI.push(centerFaceUp);
                    resolve();
                    return;
                }

                const centerFaceDown = this.engine.deckInstance!.createCardToDeal(false, centerRank, centerSuit);
                centerFaceDown.label = "faceDown";
                centerFaceDown.scale.set(baseCenterScale);
                centerFaceDown.x = startX;
                centerFaceDown.y = startY;
                this.engine.mainLayer.addChild(centerFaceDown);
                this.engine.dealtCardsUI.push(centerFaceDown);

                let progress = 0;
                const speed = 0.025; 
                let isFlipped = false;
                let activeCard = centerFaceDown;

                if (timeElapsedMs > 1800) {
                     progress = 0.75;
                }

                const slideAndFlipAnim = () => {
                    if (currentGen !== this.engine.animGeneration) {
                        if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.remove(slideAndFlipAnim);
                        if (activeCard && !activeCard.destroyed) this.engine.safeDestroy(activeCard);
                        resolve();
                        return;
                    }

                    if (!activeCard || activeCard.destroyed || !activeCard.visible || !this.engine.app || !this.engine.app.ticker) {
                        if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.remove(slideAndFlipAnim);
                        resolve();
                        return;
                    }

                    progress += speed;
                    if (progress >= 1) progress = 1;

                    // Posição sempre interpolada até o fim — a carta só termina de
                    // sair do monte perto de chegar na mesa.
                    activeCard.x = startX + (endX - startX) * progress;
                    activeCard.y = startY + (endY - startY) * progress;

                    if (progress <= 0.75) {
                        // Ainda saindo do monte: mantém virada pra baixo, sem girar.
                        activeCard.scale.x = baseCenterScale;
                    }
                    else if (progress <= 0.875) {
                        // Já fora do monte (75%+ do trajeto): começa a fechar para virar.
                        let flipProg = (progress - 0.75) / 0.125;
                        activeCard.scale.x = baseCenterScale * (1 - flipProg);
                    }
                    else {
                        if (!isFlipped) {
                            isFlipped = true;
                            this.engine.safeDestroy(centerFaceDown);

                            if (currentGen === this.engine.animGeneration && this.engine.gameState.phase !== 'waiting') {
                                const centerFaceUp = this.engine.deckInstance!.createCardToDeal(true, centerRank, centerSuit);
                                centerFaceUp.label = "faceUp";
                                centerFaceUp.scale.set(0, baseCenterScale);
                                centerFaceUp.x = activeCard.x;
                                centerFaceUp.y = activeCard.y;
                                this.engine.mainLayer.addChild(centerFaceUp);

                                const idx = this.engine.dealtCardsUI.indexOf(centerFaceDown);
                                if (idx !== -1) this.engine.dealtCardsUI[idx] = centerFaceUp;
                                else this.engine.dealtCardsUI.push(centerFaceUp);

                                activeCard = centerFaceUp;
                            } else {
                                if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.remove(slideAndFlipAnim);
                                resolve();
                                return;
                            }
                        }
                        let flipProg = (progress - 0.875) / 0.125;
                        activeCard.scale.x = baseCenterScale * flipProg;
                    }

                    if (progress === 1) {
                        if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.remove(slideAndFlipAnim);
                        activeCard.scale.x = baseCenterScale;
                        activeCard.x = endX;
                        activeCard.y = endY;
                        resolve();
                    }
                };
                if (this.engine.app && this.engine.app.ticker) this.engine.app.ticker.add(slideAndFlipAnim);
            });

            if (currentGen !== this.engine.animGeneration) return;
            
            if (timeElapsedMs < 3000) {
                 await this.engine.pixiDelay(3000 - Math.max(2200, timeElapsedMs), currentGen);
            }
            if (currentGen !== this.engine.animGeneration) return;

            for (let i = this.engine.mainLayer.children.length - 1; i >= 0; i--) {
                const child = this.engine.mainLayer.children[i];
                if (child.label === "resultText") {
                    this.engine.mainLayer.removeChild(child);
                    child.destroy();
                }
            }

            let resultTextObj: PIXI.Text | null = null;
            const safeName = currentPlayer.name ? currentPlayer.name.toUpperCase() : "JOGADOR";

            if (isWin) {
                const winMath = MeinhoHelper.calcWin(betAmount, this.engine.gameState.rake);
                
                let wonText = "";
                if (currentPlayer.isHero) {
                    wonText = `PARABÉNS!\nVOCÊ GANHOU R$ ${winMath.formatadoTexto}`;
                } else {
                    wonText = `${safeName} GANHOU\nR$ ${winMath.formatadoTexto}`;
                }

                // 👇 PRIMEIRA CORREÇÃO: Nova sintaxe PixiJS v8 para stroke
                resultTextObj = new PIXI.Text({
                    text: wonText,
                    style: { fontFamily: 'Arial', fontSize: 14, fill: 0xFFD700, fontWeight: 'bold', align: 'center', stroke: { color: '#000000', width: 3 } }
                } as any);
                resultTextObj.label = "resultText"; 
                resultTextObj.anchor.set(0.5);
                resultTextObj.x = 215;
                resultTextObj.y = 510; 
                
                if (currentGen === this.engine.animGeneration) {
                    this.engine.mainLayer.addChild(resultTextObj);
                    this.engine.transientUI.push(resultTextObj);
                    if (currentPlayer.isHero && timeElapsedMs < 3000) this.engine.audioService.tocarSom(this.engine.audioService.somVitoria);
                }

                let winChip: PIXI.Container | null = null;

                if (timeElapsedMs < 3800) {
                    winChip = await MeinhoAnimator.throwCustomChip(this.engine, this.engine.POT_X - 35, this.engine.POT_Y, betX + 15, betY, Number(winMath.totalCreditado.toFixed(2)), false);
                    if (currentGen !== this.engine.animGeneration) return;
                    if (winChip) this.engine.transientUI.push(winChip);
                    if (!document.hidden) this.engine.audioService.tocarSom(this.engine.audioService.somChips);
                    await this.engine.pixiDelay(3800 - Math.max(3000, timeElapsedMs), currentGen);
                } else {
                     winChip = await MeinhoAnimator.throwCustomChip(this.engine, betX + 15, betY, betX + 15, betY, Number(winMath.totalCreditado.toFixed(2)), false);
                     if (winChip) this.engine.transientUI.push(winChip);
                }
                if (currentGen !== this.engine.animGeneration) return;
                
                if (timeElapsedMs < 4000) {
                    if (betChip) {
                        this.engine.performAnimation(betChip, coords?.x ?? 0, coords?.y ?? 0, 15).then(() => {
                            if(currentGen === this.engine.animGeneration && !document.hidden) this.engine.audioService.tocarSom(this.engine.audioService.somChips);
                            this.engine.safeDestroy(betChip);
                        });
                    }
                    if (winChip) {
                        this.engine.performAnimation(winChip, coords?.x ?? 0, coords?.y ?? 0, 15).then(() => this.engine.safeDestroy(winChip));
                    }
                } else {
                    this.engine.safeDestroy(betChip);
                    this.engine.safeDestroy(winChip);
                }

                let cardsToTrash: PIXI.Container[] = this.engine.dealtCardsUI.filter(c => (c as any).ownerSeat === seatIndex && !c.destroyed);
                
                if (currentPlayer.isHero) {
                    this.engine.heroPixiCards.length = 0;
                    this.engine.heroHasRevealedCurrentHand = false; 
                }

                const centerCards = this.engine.dealtCardsUI.filter(c => Math.abs(c.x - endX) < 5 && Math.abs(c.y - endY) < 5 && !c.destroyed);
                cardsToTrash.push(...centerCards);

                if (cardsToTrash.length > 0) {
                    cardsToTrash.forEach(c => {
                        const i = this.engine.dealtCardsUI.indexOf(c);
                        if (i !== -1) this.engine.dealtCardsUI.splice(i, 1);
                    });

                    if (!document.hidden) this.engine.audioService.tocarSom(this.engine.audioService.somPular);
                    MeinhoAnimator.discardCards(this.engine, cardsToTrash).then(() => {
                        cardsToTrash.forEach(c => {
                            if (!c.destroyed) this.engine.safeDestroy(c);
                        });
                    });
                    currentPlayer.uiCards = [];
                }
                currentPlayer.status = 'done';
                this.engine.boardService.refreshAvatarFilter(seatIndex);

                if (timeElapsedMs < 6500) {
                     await this.engine.pixiDelay(6500 - Math.max(4000, timeElapsedMs), currentGen);
                }
                if (currentGen !== this.engine.animGeneration) return;

            } else {
                let lostText = "";
                if (currentPlayer.isHero) {
                    lostText = `VOCÊ PERDEU!`;
                } else {
                    lostText = `${safeName} PERDEU!`;
                }

                // 👇 SEGUNDA CORREÇÃO: Nova sintaxe PixiJS v8 para stroke
                resultTextObj = new PIXI.Text({
                    text: lostText,
                    style: { fontFamily: 'Arial', fontSize: 14, fill: 0xBDC3C7, fontWeight: 'bold', align: 'center', stroke: { color: '#000000', width: 3 } }
                } as any);
                resultTextObj.label = "resultText"; 
                resultTextObj.anchor.set(0.5);
                resultTextObj.x = 215;
                resultTextObj.y = 510; 
                
                if (currentGen === this.engine.animGeneration) {
                    this.engine.mainLayer.addChild(resultTextObj);
                    this.engine.transientUI.push(resultTextObj);
                    if (currentPlayer.isHero && timeElapsedMs < 3000) this.engine.audioService.tocarSom(this.engine.audioService.somDerrota);
                }

                if (timeElapsedMs < 3800) {
                    await this.engine.pixiDelay(3800 - Math.max(3000, timeElapsedMs), currentGen);
                }
                if (currentGen !== this.engine.animGeneration) return;

                if (betChip) {
                    if (timeElapsedMs < 4000) {
                         while(betChip.children.length > 1) { betChip.removeChildAt(1); } 
                         await this.engine.performAnimation(betChip, this.engine.POT_X - 35, this.engine.POT_Y, 15);
                         if (currentGen !== this.engine.animGeneration) return;
                         if (!document.hidden) this.engine.audioService.tocarSom(this.engine.audioService.somChip);
                         if (this.engine.boardUI) this.engine.boardUI.playChipHitPotAnimation(); 
                         MeinhoHelper.spawnPotHitParticles(this.engine.particleLayer, this.engine.activeFireParticles, this.engine.POT_X, this.engine.POT_Y);
                         betChip.visible = false;
                         this.engine.potChipsUI.push(betChip); 
                    } else {
                         betChip.visible = false;
                         this.engine.potChipsUI.push(betChip);
                         if (this.engine.boardUI) this.engine.boardUI.playChipHitPotAnimation(); 
                    }
                }

                let cardsToTrash: PIXI.Container[] = this.engine.dealtCardsUI.filter(c => (c as any).ownerSeat === seatIndex && !c.destroyed);
                
                if (currentPlayer.isHero) {
                    this.engine.heroPixiCards.length = 0;
                    this.engine.heroHasRevealedCurrentHand = false; 
                }

                const centerCards = this.engine.dealtCardsUI.filter(c => Math.abs(c.x - endX) < 5 && Math.abs(c.y - endY) < 5 && !c.destroyed);
                cardsToTrash.push(...centerCards);

                if (cardsToTrash.length > 0) {
                    cardsToTrash.forEach(c => {
                        const i = this.engine.dealtCardsUI.indexOf(c);
                        if (i !== -1) this.engine.dealtCardsUI.splice(i, 1);
                    });

                    if (!document.hidden) this.engine.audioService.tocarSom(this.engine.audioService.somPular);
                    MeinhoAnimator.discardCards(this.engine, cardsToTrash).then(() => {
                        cardsToTrash.forEach(c => {
                            if (!c.destroyed) this.engine.safeDestroy(c);
                        });
                    });
                    currentPlayer.uiCards = [];
                }
                currentPlayer.status = 'done';
                this.engine.boardService.refreshAvatarFilter(seatIndex);

                if (timeElapsedMs < 6500) {
                    await this.engine.pixiDelay(6500 - Math.max(4000, timeElapsedMs), currentGen);
                }
                if (currentGen !== this.engine.animGeneration) return;
            }

            if (resultTextObj) {
                if (this.engine.app && resultTextObj.parent) resultTextObj.parent.removeChild(resultTextObj);
                resultTextObj.destroy();
            }

        } finally {
            // 🔥 FIM DA TRAVA: Libera o frontend para aplicar o timer do próximo jogador ou os resets da rodada!
            if (currentGen === this.engine.animGeneration) {
                this.engine.callbacks.setAnimating(false);
                this.engine.callbacks.flushPendingState();
            }
        }
    }

    public async rechargePotAnim() {
        const currentGen = this.engine.animGeneration;
        
        // 🔥 TRAVA INICIADA PARA A REPOSIÇÃO DE POTE
        this.engine.callbacks.setAnimating(true);
        
        try {
            // 👇 TERCEIRA CORREÇÃO: Nova sintaxe PixiJS v8 para stroke
            const avisoText = new PIXI.Text({
                text: "Pote quebrado!\nCobrando nova Ante...",
                style: { fontFamily: 'Arial', fontSize: 14, fill: 0xBDC3C7, fontWeight: 'bold', align: 'center', stroke: { color: '#000000', width: 3 } }
            } as any);
            avisoText.anchor.set(0.5);
            avisoText.x = 215;
            avisoText.y = 510;
            if (this.engine.app && !document.hidden) {
                this.engine.mainLayer.addChild(avisoText);
                this.engine.transientUI.push(avisoText);
            }

            await this.engine.pixiDelay(1000, currentGen);
            if (currentGen !== this.engine.animGeneration) return;

            const antePromises = [];
            for (let i = 0; i < this.engine.gameState.maxPlayers; i++) {
                if (this.engine.gameState.players[i] && this.engine.gameState.players[i].isSeated && this.engine.gameState.players[i].chips > 0) {
                    
                    const coords = this.engine.seatCoords[i];
                    const pX = coords?.x ?? 0;
                    const pY = coords?.y ?? 0;
                    
                    antePromises.push(MeinhoAnimator.throwCustomChip(this.engine, pX, pY, this.engine.POT_X - 35, this.engine.POT_Y, undefined, false).then(chip => { 
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

            await Promise.all(antePromises);
            if (currentGen !== this.engine.animGeneration) return;
            await this.engine.pixiDelay(800, currentGen);
            if (currentGen !== this.engine.animGeneration) return;

            if (this.engine.app && avisoText.parent) avisoText.parent.removeChild(avisoText);
            avisoText.destroy();

        } finally {
            // 🔥 FIM DA TRAVA PARA A REPOSIÇÃO DE POTE
            if (currentGen === this.engine.animGeneration) {
                this.engine.callbacks.setAnimating(false);
                this.engine.callbacks.flushPendingState();
            }
        }
    }
}