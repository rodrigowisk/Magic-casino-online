import * as PIXI from 'pixi.js';

export class Deck {
    public view: PIXI.Container;
    private cardBackTexture: PIXI.Texture;
    private isDoubleDeck: boolean;
    private totalLayers: number;

    /**
     * @param x Posição X
     * @param y Posição Y
     * @param cardBackTexture Textura do verso
     * @param isDoubleDeck Se true, renderiza 10 cartas (2 baralhos). Se false, apenas 5.
     */
    constructor(x: number, y: number, cardBackTexture: PIXI.Texture, isDoubleDeck: boolean = false) {
        this.view = new PIXI.Container();
        this.view.x = x;
        this.view.y = y;
        this.cardBackTexture = cardBackTexture;
        this.isDoubleDeck = isDoubleDeck;
        
        // Define a "grossura" visual do monte
        this.totalLayers = this.isDoubleDeck ? 10 : 5;
        
        this.renderStack();
    }

    private renderStack() {
        // Limpa visual anterior se houver
        this.view.removeChildren();

        for (let i = 0; i < this.totalLayers; i++) {
            const cardLayer = new PIXI.Container();
            
            const cardBg = new PIXI.Graphics();
            cardBg.roundRect(-30, -47, 60, 94, 6); 
            cardBg.fill({ color: 0xffffff }); 
            
            // Borda externa: degrade de cinza para dar profundidade lateral ao monte
            const strokeColor = i === (this.totalLayers - 1) ? 0xcccccc : 0x999999;
            cardBg.stroke({ width: 1, color: strokeColor }); 
            
            cardLayer.addChild(cardBg);

            // Apenas a última carta (topo) recebe a imagem do verso
            if (i === (this.totalLayers - 1)) {
                const backSprite = new PIXI.Sprite(this.cardBackTexture);
                backSprite.anchor.set(0.5);
                backSprite.width = 56; 
                backSprite.height = 90;

                const backMask = new PIXI.Graphics();
                backMask.roundRect(-28, -45, 56, 90, 4);
                backMask.fill({ color: 0xffffff });
                backSprite.mask = backMask;

                cardLayer.addChild(backMask);
                cardLayer.addChild(backSprite);
            }

            // Efeito de escada milimétrico para criar volume 3D
            cardLayer.y = -i * 0.8;
            cardLayer.x = -i * 0.4;
            
            this.view.addChild(cardLayer);
        }
    }

    public createCardToDeal(isFaceUp: boolean = false, rank: string = 'A', suit: string = '♠'): PIXI.Container {
        const cardContainer = new PIXI.Container();
        const cardBg = new PIXI.Graphics();
        
        // Tamanho padrão de carta na mão (35x55)
        cardBg.roundRect(-17.5, -27.5, 35, 55, 4); 
        cardBg.fill({ color: 0xffffff });
        cardContainer.addChild(cardBg);

        if (!isFaceUp) {
            const backSprite = new PIXI.Sprite(this.cardBackTexture);
            backSprite.anchor.set(0.5);
            backSprite.width = 32;
            backSprite.height = 52;

            const backMask = new PIXI.Graphics();
            backMask.roundRect(-16, -26, 32, 52, 2);
            backMask.fill({ color: 0xffffff });
            backSprite.mask = backMask;

            cardContainer.addChild(backMask);
            cardContainer.addChild(backSprite);

            const border = new PIXI.Graphics();
            border.roundRect(-17.5, -27.5, 35, 55, 4);
            border.stroke({ width: 1, color: 0xcccccc });
            cardContainer.addChild(border);

        } else {
            cardBg.stroke({ width: 1, color: 0xcccccc });
            
            const isRed = suit === '♥' || suit === '♦';
            const textColor = isRed ? 0xff0000 : 0x000000;

            // 1. Número no canto superior esquerdo
            const rankText = new PIXI.Text({
                text: rank,
                style: {
                    fontFamily: 'Arial',
                    fontSize: 14,
                    fill: textColor,
                    fontWeight: 'bold'
                }
            });
            rankText.anchor.set(0.5);
            rankText.x = -10; 
            rankText.y = -18; // Subi um tiquinho para caber o mini naipe
            cardContainer.addChild(rankText);

            // 2. Mini Naipe colado embaixo do número
            const miniSuitText = new PIXI.Text({
                text: suit,
                style: {
                    fontFamily: 'Arial',
                    fontSize: 11, // Bem pequeno
                    fill: textColor
                }
            });
            miniSuitText.anchor.set(0.5);
            miniSuitText.x = -10; // Mesma coluna do número
            miniSuitText.y = -7;  // Logo abaixo do número
            cardContainer.addChild(miniSuitText);

            // 3. Naipe Gigante centralizado no meio da carta
            const bigSuitText = new PIXI.Text({
                text: suit,
                style: {
                    fontFamily: 'Arial',
                    fontSize: 32, // Tamanho grande, mas que caiba bem no meio
                    fill: textColor,
                    alpha: 0.85 // Leve transparência para ficar elegante
                }
            });
            bigSuitText.anchor.set(0.5);
            bigSuitText.x = 2; // Levemente deslocado para a direita para compensar o número no canto
            bigSuitText.y = 10; // Centralizado no espaço inferior restante
            cardContainer.addChild(bigSuitText);
        }
        
        // A carta que sai do monte sai exatamente da posição da última camada visual
        const topLayerIdx = this.totalLayers - 1;
        cardContainer.x = this.view.x - (topLayerIdx * 0.4);
        cardContainer.y = this.view.y - (topLayerIdx * 0.8);
        
        return cardContainer;
    }
}