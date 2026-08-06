import * as PIXI from 'pixi.js';

export class MeinhoBoardUI {
    public tableInfoTextUI: PIXI.Text | null = null;
    public potTextUI: PIXI.Text | null = null;
    public potStackSprite: PIXI.Sprite | null = null;

    constructor(
        public width: number,
        public height: number,
        public backgroundLayer: PIXI.Container,
        public mainLayer: PIXI.Container,
        public gameState: any,
        public tableTexture: PIXI.Texture,
        public potChipsTexture: PIXI.Texture | null,
        public potX: number,
        public potY: number
    ) {
        this.buildBoard();
    }

    private buildBoard() {
        const tableSprite = new PIXI.Sprite(this.tableTexture);
        tableSprite.anchor.set(0.5); 
        
        // RESTAURADO O SEU FATOR
        let scale = Math.min(this.width / (this.tableTexture.width || this.width), this.height / (this.tableTexture.height || this.height));
        const margemFator = 1.04; 
        tableSprite.scale.set(scale * margemFator);
        
        // RESTAURADA A SUA POSIÇÃO Y
        tableSprite.x = this.width / 2;
        tableSprite.y = this.height * 0.52;
        
        this.backgroundLayer.addChild(tableSprite); 

        // RESTAURADO O SEU TEXTO
        this.tableInfoTextUI = new PIXI.Text({
            text: `JOGO: MEINHO\nMESA: ${(this.gameState.tableName || 'CARREGANDO...').toUpperCase()}\nBUY-IN: 🪙 ${this.gameState.tableMinBuyIn}\nANTE: 🪙 ${this.gameState.minBet}`,
            style: {
                fontFamily: 'Montserrat, Arial, sans-serif', 
                fontSize: 13, 
                fill: 0xffffff, 
                align: 'center',
                fontWeight: '800',
                letterSpacing: 2, 
                lineHeight: 22 
            }
        } as any);
        this.tableInfoTextUI.anchor.set(0.5);
        this.tableInfoTextUI.x = this.potX;
        this.tableInfoTextUI.y = 570; 
        this.tableInfoTextUI.alpha = 0.25; 
        this.backgroundLayer.addChild(this.tableInfoTextUI);

        this.potStackSprite = new PIXI.Sprite(this.potChipsTexture || PIXI.Texture.EMPTY);
        this.potStackSprite.anchor.set(0.5);
        this.potStackSprite.width = 65; 
        this.potStackSprite.height = 65;
        this.potStackSprite.x = this.potX - 35; 
        this.potStackSprite.y = this.potY; 
        this.potStackSprite.visible = this.gameState.pot > 0;
        this.mainLayer.addChild(this.potStackSprite);

        this.potTextUI = new PIXI.Text({
            text: `Pote\n🪙 ${Number(this.gameState.pot).toFixed(2).replace('.', ',')}`,
            style: {
                fontFamily: 'Arial', 
                fontSize: 16, 
                fill: 0x00f3ff, 
                fontWeight: 'bold',
                align: 'center', 
                dropShadow: true, 
                dropShadowColor: '#00f3ff', 
                dropShadowDistance: 0, 
                dropShadowBlur: 8 
            }
        } as any);
        
        this.potTextUI.anchor.set(0, 0.5); 
        this.potTextUI.x = this.potX + 15; 
        this.potTextUI.y = this.potY; 
        
        this.potTextUI.visible = true; 
        this.mainLayer.addChild(this.potTextUI);
    }

    public updateTexts(tableName: string, minBuyIn: number, minBet: number, pot: number) {
        if (this.tableInfoTextUI) {
            this.tableInfoTextUI.text = `JOGO: MEINHO\nMESA: ${(tableName || 'CARREGANDO...').toUpperCase()}\nBUY-IN: 🪙 ${minBuyIn}\nANTE: 🪙 ${minBet}`;
        }
        if (this.potTextUI) {
            this.potTextUI.text = `Pote\n${Number(pot).toFixed(2).replace('.', ',')}`; 
            this.potTextUI.visible = pot > 0;
        }
        
        if (this.potStackSprite) {
            this.potStackSprite.visible = pot > 0;
        }
    }

    public animatePotIncrease(newPot: number) {
        if (this.potStackSprite) {
            this.potStackSprite.visible = newPot > 0;
            if (newPot > 0 && this.potChipsTexture) {
                const w = this.potChipsTexture.width || 65;
                const h = this.potChipsTexture.height || 65;
                const originalScaleX = Math.sign(this.potStackSprite.scale.x) * (65 / w);
                const originalScaleY = Math.sign(this.potStackSprite.scale.y) * (65 / h);
                
                this.potStackSprite.scale.set(originalScaleX * 1.3, originalScaleY * 1.3);
                setTimeout(() => {
                    if (this.potStackSprite && !this.potStackSprite.destroyed) {
                        this.potStackSprite.scale.set(originalScaleX, originalScaleY);
                    }
                }, 150);
            }
        }
    }

    public playChipHitPotAnimation() {
        if (this.potStackSprite && !this.potStackSprite.destroyed) {
            this.potStackSprite.width = 85; 
            this.potStackSprite.height = 85; 
            setTimeout(() => {
                if (this.potStackSprite && !this.potStackSprite.destroyed) {
                    this.potStackSprite.width = 65; 
                    this.potStackSprite.height = 65; 
                }
            }, 120);
        }
    }
}