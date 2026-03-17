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
        durationFrames: number = 25 // Duração da viagem da carta
    ): Promise<void> {
        return new Promise((resolve) => {
            let currentFrame = 0;
            const startX = target.x;
            const startY = target.y;

            const tick = () => {
                currentFrame++;
                const progress = currentFrame / durationFrames;
                
                // Fórmula matemática "Ease-Out Cubic" 
                // Faz a carta sair rápido e desacelerar suavemente ao chegar na mão, tirando o efeito robótico.
                const easeOut = 1 - Math.pow(1 - progress, 3);

                target.x = startX + (endX - startX) * easeOut;
                target.y = startY + (endY - startY) * easeOut;

                if (currentFrame >= durationFrames) {
                    app.ticker.remove(tick); // Para a animação
                    target.x = endX;         // Trava na posição final exata
                    target.y = endY;
                    resolve();               // Avisa o código que a carta chegou
                }
            };

            // Adiciona a função de animação ao loop principal da placa de vídeo
            app.ticker.add(tick);
        });
    }
}