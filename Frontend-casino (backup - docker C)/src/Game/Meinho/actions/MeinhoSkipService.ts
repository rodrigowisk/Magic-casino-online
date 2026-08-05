import * as PIXI from 'pixi.js';
import { MeinhoPixiEngine } from '../MeinhoPixiEngine';
import { MeinhoAnimator } from '../MeinhoAnimator';

export class MeinhoSkipService {
    constructor(private engine: MeinhoPixiEngine) {}

    public async playSkipAnimation(seatIndex: number) {
        const currentGen = this.engine.animGeneration;
        if (!this.engine.app) return;

        // 🔥 TRAVA INICIADA: Segura o estado do backend
        this.engine.callbacks.setAnimating(true);

        try {
            const currentPlayer = this.engine.gameState.players[seatIndex];
            if (!currentPlayer) return;

            if (currentPlayer.isHero) {
                this.engine.heroHasRevealedCurrentHand = false;
                this.engine.heroPixiCards.length = 0;
            }

            if (this.engine.activeTimerSeat === seatIndex) this.engine.stopTimer(); 

            currentPlayer.status = 'out';
            this.engine.boardService.refreshAvatarFilter(seatIndex); 
            
            let cardsToTrash: PIXI.Container[] = this.engine.dealtCardsUI.filter(c => (c as any).ownerSeat === seatIndex && !(c as any).isBeingDiscarded);

            if (cardsToTrash.length > 0) {
                cardsToTrash.forEach(c => {
                    const i = this.engine.dealtCardsUI.indexOf(c);
                    if (i !== -1) this.engine.dealtCardsUI.splice(i, 1);
                });

                this.engine.audioService.tocarSom(this.engine.audioService.somPular);
                await MeinhoAnimator.discardCards(this.engine, cardsToTrash);
                
                cardsToTrash.forEach(c => this.engine.safeDestroy(c));
            }
            if (currentGen !== this.engine.animGeneration) return;
            currentPlayer.uiCards = []; 

        } finally {
            // 🔥 TRAVA LIBERADA
            if (currentGen === this.engine.animGeneration) {
                this.engine.callbacks.setAnimating(false);
                this.engine.callbacks.flushPendingState();
            }
        }
    }
}