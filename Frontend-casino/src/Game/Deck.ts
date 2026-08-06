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
                if (this.cardBackTexture && this.cardBackTexture !== PIXI.Texture.EMPTY) {
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
            }

            // Efeito de escada milimétrico para criar volume 3D
            cardLayer.y = -i * 0.8;
            cardLayer.x = -i * 0.4;
            
            this.view.addChild(cardLayer);
        }
    }

    public createCardToDeal(isFaceUp: boolean = false, rank: string = 'A', suit: string = '♠'): PIXI.Container {
        if (rank === 'Hidde' || rank === 'Hidden' || suit === 'n') {
            isFaceUp = false;
        }

        const cardContainer = new PIXI.Container();

        if (!isFaceUp) {
            const cardBg = new PIXI.Graphics();
            cardBg.roundRect(-17.5, -27.5, 35, 55, 4); 
            cardBg.fill({ color: 0xffffff });
            cardContainer.addChild(cardBg);

            if (this.cardBackTexture && this.cardBackTexture !== PIXI.Texture.EMPTY) {
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
            }

            const border = new PIXI.Graphics();
            border.roundRect(-17.5, -27.5, 35, 55, 4);
            border.stroke({ width: 1, color: 0xcccccc });
            cardContainer.addChild(border);

        } else {
            const suits = ['♣', '♦', '♥', '♠']; 
            const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            
            const suitIdx = suits.indexOf(suit);
            const rankIdx = ranks.indexOf(rank);
            
            if (suitIdx !== -1 && rankIdx !== -1) {
                const cardIndex = (suitIdx * 13) + rankIdx;
                
                try {
                    // 🔥 BUSCA DIRETA NA PASTA PUBLIC DO VITE COM CARREGAMENTO ASSÍNCRONO SEGURO
                    const imgPath = `/decks/c_${cardIndex}.png`;
                    const cardSprite = new PIXI.Sprite();
                    
                    // Ajustes básicos de ancoragem e posição (independentes da textura)
                    cardSprite.anchor.set(0.5);
                    cardSprite.x = 0; 
                    cardSprite.y = 0;

                    // Carrega a textura e SÓ DEPOIS aplica o tamanho. Isso evita o bug de carta branca!
                    PIXI.Assets.load(imgPath).then((texture) => {
                        if (!cardSprite.destroyed) {
                            cardSprite.texture = texture;
                            cardSprite.width = 35;
                            cardSprite.height = 55;
                        }
                    }).catch(e => console.error("Erro ao carregar carta:", imgPath, e));
                    
                    const cardBg = new PIXI.Graphics();
                    cardBg.roundRect(-17.5, -27.5, 35, 55, 4); 
                    cardBg.fill({ color: 0xffffff });

                    // Aplica máscara apenas para fazer os cantos arredondados bonitinhos
                    const cardMask = new PIXI.Graphics();
                    cardMask.roundRect(-17.5, -27.5, 35, 55, 4);
                    cardMask.fill({ color: 0xffffff });
                    cardSprite.mask = cardMask;

                    const border = new PIXI.Graphics();
                    border.roundRect(-17.5, -27.5, 35, 55, 4);
                    border.stroke({ width: 1, color: 0xcccccc });

                    cardContainer.addChild(cardBg);
                    cardContainer.addChild(cardMask);
                    cardContainer.addChild(cardSprite);
                    cardContainer.addChild(border);
                } catch (e) {
                    console.error("Erro ao carregar a imagem individual da carta:", cardIndex, e);
                }
            }
        }
        
        const topLayerIdx = this.totalLayers - 1;
        cardContainer.x = this.view.x - (topLayerIdx * 0.4);
        cardContainer.y = this.view.y - (topLayerIdx * 0.8);
        
        return cardContainer;
    }
}