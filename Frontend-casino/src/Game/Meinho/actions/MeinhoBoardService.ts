import * as PIXI from 'pixi.js';
import { MeinhoPixiEngine } from '../MeinhoPixiEngine';
import { MeinhoAnimator } from '../MeinhoAnimator';

export class MeinhoBoardService {
    constructor(private engine: MeinhoPixiEngine) {}

    public updateDeckVisibility() {
        if (this.engine.deckInstance && this.engine.gameState && this.engine.gameState.players) {
            const seatedCount = this.engine.gameState.players.filter((p: any) => p.isSeated).length;
            const isGameActive = this.engine.gameState.phase !== 'waiting';
            
            if (this.engine.isDiscardingCards || isGameActive) {
                this.engine.deckInstance.view.visible = true;
            } else {
                this.engine.deckInstance.view.visible = seatedCount > 1;
            }
        }
    }

    public hardResetBoard() {
        this.engine.animGeneration++; 
        this.engine.heroHasRevealedCurrentHand = false; 
        try {
            this.clearDealtCards();
            this.clearPotChips();
            
            this.engine.transientUI.forEach(obj => this.engine.safeDestroy(obj));
            this.engine.transientUI.length = 0;
            this.engine.stopTimer();

            this.engine.playerSeats.forEach((seat, index) => {
                this.refreshAvatarFilter(index);
            });

            if (this.engine.mainLayer && this.engine.mainLayer.children) {
                for (let i = this.engine.mainLayer.children.length - 1; i >= 0; i--) {
                    const child = this.engine.mainLayer.children[i];
                    if (child.label === "faceUp" || child.label === "faceDown" || child.label === "resultText") {
                        this.engine.mainLayer.removeChild(child);
                        try { child.destroy({ children: true }); } catch (e) {}
                    }
                }
            }
        } catch (e) {
            console.error("Erro no hardResetBoard:", e);
        }
    }

    public clearPotChips() {
        this.engine.potChipsUI.forEach(chip => this.engine.safeDestroy(chip));
        this.engine.potChipsUI.length = 0;
        
        if (this.engine.boardUI && this.engine.boardUI.potStackSprite) {
            // 🔥 CORREÇÃO: Mantém a imagem do pote visível se ainda houver fichas registadas no jogo
            this.engine.boardUI.potStackSprite.visible = (this.engine.gameState.pot > 0); 
        }
    }

    public clearDealtCards() {
        this.engine.dealtCardsUI.forEach(card => this.engine.safeDestroy(card));
        this.engine.dealtCardsUI.length = 0;
        this.engine.heroPixiCards.length = 0; 

        for (let i = this.engine.mainLayer.children.length - 1; i >= 0; i--) {
            const child = this.engine.mainLayer.children[i];
            if (child.label === "resultText") {
                this.engine.mainLayer.removeChild(child);
                try { child.destroy(); } catch(e){}
            }
        }
        
        this.engine.transientUI.forEach(obj => this.engine.safeDestroy(obj));
        this.engine.transientUI.length = 0;
    }

    public clearPlayerCards(seatIndex: number) {
        const currentPlayer = this.engine.gameState.players[seatIndex];
        if (!currentPlayer) return;

        let cardsToTrash: PIXI.Container[] = this.engine.dealtCardsUI.filter(c => (c as any).ownerSeat === seatIndex && !c.destroyed);

        if (currentPlayer.isHero && this.engine.heroPixiCards) {
            this.engine.heroPixiCards.length = 0;
            // 🔥 MAIS UMA TRAVA: Limpa o filar se as cartas forem apagadas do nada
            this.engine.heroHasRevealedCurrentHand = false; 
        }

        cardsToTrash.forEach(card => {
            const idx = this.engine.dealtCardsUI.indexOf(card);
            if (idx !== -1) {
                this.engine.dealtCardsUI.splice(idx, 1);
            }
        });

        currentPlayer.uiCards = [];

        if (cardsToTrash.length > 0) {
            if (!document.hidden) this.engine.audioService.tocarSom(this.engine.audioService.somPular); 
            
            MeinhoAnimator.discardCards(this.engine, cardsToTrash).then(() => {
                cardsToTrash.forEach(card => {
                    if (typeof this.engine.safeDestroy === 'function') {
                        this.engine.safeDestroy(card);
                    } else {
                        if (card.parent) card.parent.removeChild(card);
                        card.destroy({ children: true });
                    }
                });
            });
        }
        
        currentPlayer.status = 'done';
        this.refreshAvatarFilter(seatIndex);
    }

    public forceRevealAllCards() {
        if (!this.engine.app || !this.engine.deckInstance) return;
        this.engine.gameState.players.forEach((p: any, seatIndex: number) => {
            if (p.isSeated && p.status === 'playing' && p.serverCards && p.serverCards.length === 2) {
                if (p.isHero) return; 

                const playerUiCards = this.engine.dealtCardsUI.filter(c => (c as any).ownerSeat === seatIndex);
                
                if (playerUiCards.length === 2) {
                    const oldCard1 = playerUiCards[0];
                    const oldCard2 = playerUiCards[1];
                    
                    if (oldCard1.destroyed || oldCard2.destroyed) return;

                    // 🔥 CORREÇÃO: mesma proteção do MeinhoDealService.ts — se a carta
                    // ainda estiver mascarada como "Hidden" nesse instante, não tenta
                    // interpretar como código de carta real (evita o texto de reserva
                    // "Hidden" aparecendo desenhado na carta).
                    if (!p.serverCards[0] || !p.serverCards[1] || p.serverCards[0] === "Hidden" || p.serverCards[1] === "Hidden") return;

                    const r1 = p.serverCards[0].slice(0, -1) || "A";
                    const s1 = p.serverCards[0].slice(-1) || "♠";
                    const r2 = p.serverCards[1].slice(0, -1) || "A";
                    const s2 = p.serverCards[1].slice(-1) || "♠";

                    const newCard1 = this.engine.deckInstance!.createCardToDeal(true, r1, s1);
                    const newCard2 = this.engine.deckInstance!.createCardToDeal(true, r2, s2);
                    newCard1.label = "faceUp";
                    newCard2.label = "faceUp";
                    
                    (newCard1 as any).ownerSeat = seatIndex;
                    (newCard2 as any).ownerSeat = seatIndex;
                    
                    newCard1.x = oldCard1.x; newCard1.y = oldCard1.y; newCard1.scale.set(Math.abs(oldCard1.scale.x), Math.abs(oldCard1.scale.y));
                    newCard2.x = oldCard2.x; newCard2.y = oldCard2.y; newCard2.scale.set(Math.abs(oldCard2.scale.x), Math.abs(oldCard2.scale.y));

                    this.engine.safeDestroy(oldCard1);
                    this.engine.safeDestroy(oldCard2);
                    
                    this.engine.mainLayer.addChild(newCard1);
                    this.engine.mainLayer.addChild(newCard2);
                    
                    const idx1 = this.engine.dealtCardsUI.indexOf(oldCard1); 
                    if(idx1 !== -1) this.engine.dealtCardsUI[idx1] = newCard1; else this.engine.dealtCardsUI.push(newCard1);
                    
                    const idx2 = this.engine.dealtCardsUI.indexOf(oldCard2); 
                    if(idx2 !== -1) this.engine.dealtCardsUI[idx2] = newCard2; else this.engine.dealtCardsUI.push(newCard2);

                    if (p.uiCards) {
                        p.uiCards[0] = newCard1;
                        p.uiCards[1] = newCard2;
                    }
                }
            }
        });
    }

    public drawCenterCardInstant(centerCardStr: string, isFaceUp: boolean = true) {
        // 🔥 CORREÇÃO: Nunca desenha o Vira se a mesa estiver esperando (waiting)
        if (!this.engine.app || !this.engine.deckInstance || !centerCardStr || centerCardStr === "Nenhuma" || centerCardStr.trim() === "" || centerCardStr === "Hidden" || this.engine.gameState.phase === 'waiting') return;
        
        const expectedName = isFaceUp ? "faceUp" : "faceDown";

        // Posição calculada a partir do baralho: à esquerda dele e um pouco acima,
        // para não tampar o baralho nem colidir com o texto do pote.
        const CENTER_CARD_X = this.engine.deckInstance.view.x - 69;
        const CENTER_CARD_Y = this.engine.deckInstance.view.y - 3;

        const existing = this.engine.dealtCardsUI.filter(c => Math.abs(c.x - CENTER_CARD_X) < 5 && Math.abs(c.y - CENTER_CARD_Y) < 5);
        
        if (existing.length > 0) {
            if (existing[0].label === expectedName) return; 
            existing.forEach(c => {
                const idx = this.engine.dealtCardsUI.indexOf(c);
                if (idx !== -1) this.engine.dealtCardsUI.splice(idx, 1);
                this.engine.safeDestroy(c);
            });
        }

        const cRank = centerCardStr.slice(0, -1) || "A";
        const cSuit = centerCardStr.slice(-1) || "♠";
        
        const centerCard = this.engine.deckInstance.createCardToDeal(isFaceUp, cRank, cSuit);
        centerCard.label = expectedName;
        centerCard.scale.set(1.7);
        centerCard.x = CENTER_CARD_X;
        centerCard.y = CENTER_CARD_Y;
        
        this.engine.mainLayer.addChild(centerCard);
        this.engine.dealtCardsUI.push(centerCard);
    }

    public refreshAvatarFilter(seatIndex: number) {
        const seatUi = this.engine.playerSeats[seatIndex];
        const player = this.engine.gameState.players[seatIndex];
        if (!seatUi) return;

        if (player && player.isSeated) {
            const isPlaying = player.status === 'playing';
            const hasServerCards = player.serverCards && player.serverCards.length > 0;
            const hasVisualCards = (player.uiCards && player.uiCards.length > 0) || (player.isHero && this.engine.heroPixiCards.length > 0);
            
            if (isPlaying && (hasServerCards || hasVisualCards)) {
                if (typeof seatUi.resetFilter === 'function') seatUi.resetFilter();
            } else {
                if (typeof seatUi.darken === 'function') seatUi.darken();
            }
        } else {
            if (typeof seatUi.resetFilter === 'function') seatUi.resetFilter();
        }
    }

    public async sweepBoard() {
        const currentGen = this.engine.animGeneration;
        this.engine.heroHasRevealedCurrentHand = false;
        
        for (let i = this.engine.mainLayer.children.length - 1; i >= 0; i--) {
            const child = this.engine.mainLayer.children[i];
            if (child.label === "resultText") {
                this.engine.mainLayer.removeChild(child);
                try { child.destroy(); } catch(e){}
            }
        }
        this.engine.transientUI.forEach(obj => this.engine.safeDestroy(obj));
        this.engine.transientUI.length = 0;
        
        const cardsToTrash: PIXI.Container[] = this.engine.dealtCardsUI.filter(c => !c.destroyed);
        
        if (cardsToTrash.length > 0) {
            if (!document.hidden) this.engine.audioService.tocarSom(this.engine.audioService.somPular); 
            
            this.engine.dealtCardsUI = [];
            this.engine.heroPixiCards = [];
            this.engine.gameState.players.forEach((p: any) => p.uiCards = []);

            await MeinhoAnimator.discardCards(this.engine, cardsToTrash);
            
            if (currentGen !== this.engine.animGeneration) return;

            cardsToTrash.forEach(c => {
                if (!c.destroyed) this.engine.safeDestroy(c);
            });
        }
    }
}