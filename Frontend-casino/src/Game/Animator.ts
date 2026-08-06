import * as PIXI from 'pixi.js';

export class Animator {
    /**
     * Move um objeto de forma suave pela tela.
     * Retorna uma Promise para sabermos exatamente quando a carta chegou ao destino.
     */
    public static animateTo(
        app: PIXI.Application, 
        target: PIXI.Container, 
        endX: number, 
        endY: number, 
        durationFrames: number = 25 
    ): Promise<void> {
        return new Promise((resolve) => {
            let currentFrame = 0;
            const startX = target.x;
            const startY = target.y;

            const tick = () => {
                if (!target || target.destroyed) {
                    app.ticker.remove(tick);
                    resolve();
                    return;
                }

                currentFrame++;
                const progress = currentFrame / durationFrames;
                
                const easeOut = 1 - Math.pow(1 - progress, 3);

                target.x = startX + (endX - startX) * easeOut;
                target.y = startY + (endY - startY) * easeOut;

                if (currentFrame >= durationFrames) {
                    app.ticker.remove(tick); 
                    target.x = endX;         
                    target.y = endY;
                    resolve();               
                }
            };

            app.ticker.add(tick);
        });
    }
}