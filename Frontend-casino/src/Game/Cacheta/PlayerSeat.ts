import * as PIXI from 'pixi.js';

export class PlayerSeat {
    public container: PIXI.Container;
    private emptySeatContainer: PIXI.Container;
    private seatedContainer: PIXI.Container;
    private timerArc: PIXI.Graphics;
    private timerBgArc: PIXI.Graphics;
    private timerLabelContainer: PIXI.Container;
    private timerText: PIXI.Text;
    private nameText: PIXI.Text;
    private balanceText: PIXI.Text;

    // Propriedade da classe para controle do Avatar
    private avatarSprite: PIXI.Sprite;

    // Elementos visuais do assento vazio
    private sentarText: PIXI.Text;
    private plusText: PIXI.Text; 
    private seatBase3D: PIXI.Graphics;
    private outerGlow: PIXI.Graphics;
    private isStaticEmpty: boolean = false;

    // Referência para animação local do portal vazio
    private idleAnim: (() => void) | null = null;
    
    constructor(
        x: number, 
        y: number, 
        avatarTexture: PIXI.Texture, 
        playerName: string,
        initialChips: number, 
        isSeated: boolean, 
        onSitDown: () => void
    ) {
        this.container = new PIXI.Container();
        this.container.x = x;
        this.container.y = y;

        // ==============================================================
        // ESTADO: ASSENTO VAZIO
        // ==============================================================
        this.emptySeatContainer = new PIXI.Container();
        this.emptySeatContainer.eventMode = 'static'; 
        this.emptySeatContainer.cursor = 'pointer';   
        
        if (typeof onSitDown === 'function') {
            this.emptySeatContainer.on('pointerdown', onSitDown); 
            this.emptySeatContainer.on('pointertap', onSitDown);
        } else {
            console.warn("Aviso: Função onSitDown não foi passada corretamente para o assento.");
        }

        // 1. Efeito de Brilho Externo (Glow Neon Azul)
        this.outerGlow = new PIXI.Graphics();
        this.outerGlow.circle(0, 0, 36);
        this.outerGlow.fill({ color: 0x00f3ff, alpha: 0.15 }); 
        this.outerGlow.blendMode = 'add';
        this.emptySeatContainer.addChild(this.outerGlow);

        // 2. Base do Assento
        this.seatBase3D = new PIXI.Graphics();
        this.drawActiveSeatBase(); 
        this.emptySeatContainer.addChild(this.seatBase3D);

        const plusStyle = { 
            fontFamily: 'Arial', 
            fontSize: 24, 
            fill: 0xffffff, 
            fontWeight: '900', 
            dropShadow: false, 
            align: 'center'
        };

        const textStyle = { 
            fontFamily: 'Arial', 
            fontSize: 8.5, 
            fill: 0xffffff, 
            fontWeight: '900', 
            letterSpacing: 1.5, 
            dropShadow: true, 
            dropShadowColor: '#00f3ff', 
            dropShadowDistance: 0,
            dropShadowBlur: 8,
            align: 'center'
        };

        // @ts-ignore
        this.plusText = new PIXI.Text({ text: '+', style: plusStyle });
        this.plusText.anchor.set(0.5);
        this.plusText.y = -8; 
        this.emptySeatContainer.addChild(this.plusText);

        // @ts-ignore
        this.sentarText = new PIXI.Text({ text: 'SENTAR', style: textStyle });
        this.sentarText.anchor.set(0.5);
        this.sentarText.y = 8; 
        this.emptySeatContainer.addChild(this.sentarText);

        // 👇 TRAVA DEFINITIVA COM TRY...CATCH 👇
        this.idleAnim = () => {
            try {
                if (!this.container || this.container.destroyed || !this.seatBase3D || this.seatBase3D.destroyed) {
                    if (this.idleAnim) PIXI.Ticker.shared.remove(this.idleAnim);
                    return;
                }

                if (!this.emptySeatContainer || !this.emptySeatContainer.visible) return;

                const time = Date.now();
                const slowTime = time / 800; 
                const seatScale = 1 + Math.sin(slowTime) * 0.015;
                
                // Valida antes do set() e aplica
                if (this.seatBase3D.scale) this.seatBase3D.scale.set(seatScale);
                if (this.outerGlow.scale) this.outerGlow.scale.set(seatScale + Math.sin(slowTime * 1.2) * 0.05);
                this.outerGlow.alpha = 0.1 + Math.sin(slowTime * 1.5) * 0.1;
                
                if (this.sentarText) this.sentarText.alpha = 0.85 + Math.sin(slowTime * 2) * 0.15;
                if (this.plusText) this.plusText.alpha = 0.85 + Math.sin(slowTime * 2) * 0.15;
                
            } catch (e) {
                // Se der qualquer erro no meio da animação (porque foi destruído), engole o erro e remove do loop de vez
                if (this.idleAnim) PIXI.Ticker.shared.remove(this.idleAnim);
            }
        };

        // ==============================================================
        // ESTADO: JOGADOR SENTADO
        // ==============================================================
        this.seatedContainer = new PIXI.Container();

        const bgCircle = new PIXI.Graphics();
        bgCircle.circle(0, 0, 30);
        bgCircle.fill({ color: 0x000000, alpha: 1 });
        this.seatedContainer.addChild(bgCircle);

        const mask = new PIXI.Graphics(); 
        mask.circle(0, 0, 30); 
        mask.fill(0xffffff);
        this.seatedContainer.addChild(mask); 
        
        this.avatarSprite = new PIXI.Sprite(avatarTexture);
        this.avatarSprite.anchor.set(0.5); 
        this.avatarSprite.width = 60; 
        this.avatarSprite.height = 60; 
        this.avatarSprite.mask = mask; 
        this.seatedContainer.addChild(this.avatarSprite);
        
        const border = new PIXI.Graphics(); 
        border.circle(0, 0, 30); 
        border.stroke({ width: 2.5, color: 0xcccccc });
        this.seatedContainer.addChild(border);

        const balancePill = new PIXI.Graphics();
        balancePill.roundRect(-42, 32, 84, 38, 12); 
        balancePill.fill({ color: 0x000000, alpha: 0.9 });
        balancePill.stroke({ width: 1.5, color: 0x666666 });
        this.seatedContainer.addChild(balancePill);

        const safePlayerName = playerName || 'Livre';
        this.nameText = new PIXI.Text({ 
            text: safePlayerName.length > 10 ? safePlayerName.substring(0, 9) + '...' : safePlayerName, 
            style: { fontFamily: 'Arial', fontSize: 12, fill: 0x3ce48a, fontWeight: 'bold' } 
        });
        this.nameText.anchor.set(0.5); 
        this.nameText.y = 44; 
        this.seatedContainer.addChild(this.nameText);

        const safeChips = initialChips || 0;
        this.balanceText = new PIXI.Text({ 
            text: `R$ ${safeChips}`, 
            style: { fontFamily: 'Arial', fontSize: 13, fill: 0xffffff, fontWeight: 'bold' } 
        });
        this.balanceText.anchor.set(0.5); 
        this.balanceText.y = 60; 
        this.seatedContainer.addChild(this.balanceText);

        this.emptySeatContainer.visible = !isSeated;
        this.seatedContainer.visible = isSeated;

        this.container.addChild(this.emptySeatContainer);
        this.container.addChild(this.seatedContainer);

        // ==============================================================
        // ELEMENTOS COMUNS E TIMER 
        // ==============================================================
        this.timerBgArc = new PIXI.Graphics();
        this.timerBgArc.circle(0,0, 34); 
        this.timerBgArc.stroke({width: 7, color: 0x333333, alpha: 0.6}); 
        this.timerBgArc.visible = false;
        this.container.addChild(this.timerBgArc);

        this.timerArc = new PIXI.Graphics(); 
        this.container.addChild(this.timerArc);

        this.timerLabelContainer = new PIXI.Container(); 
        this.timerLabelContainer.y = -48; 
        this.timerLabelContainer.visible = false;
        
        const timerBg = new PIXI.Graphics(); 
        timerBg.roundRect(-28, -12, 56, 24, 12); 
        timerBg.fill({ color: 0x000000, alpha: 0.8 });
        this.timerLabelContainer.addChild(timerBg);
        
        this.timerText = new PIXI.Text({ 
            text: '⏱ 20', 
            style: { fontFamily: 'Arial', fontSize: 14, fill: 0xffffff, fontWeight: 'bold' } 
        });
        this.timerText.anchor.set(0.5); 
        this.timerLabelContainer.addChild(this.timerText);
        
        this.container.addChild(this.timerLabelContainer);

        this.setSeated(isSeated);
    }

    public setAvatarTexture(newTexture: PIXI.Texture) {
        if (this.avatarSprite && !this.avatarSprite.destroyed) {
            this.avatarSprite.texture = newTexture;
            this.avatarSprite.width = 60;
            this.avatarSprite.height = 60;
        }
    }

    private drawActiveSeatBase() {
        this.seatBase3D.clear();
        this.seatBase3D.circle(0, 0, 30);
        this.seatBase3D.fill({ color: 0x081326, alpha: 0.95 }); 
        this.seatBase3D.stroke({ width: 4, color: 0x00f3ff, alpha: 0.25 });
        this.seatBase3D.circle(0, 0, 29);
        this.seatBase3D.stroke({ width: 1.5, color: 0x00f3ff, alpha: 0.9 });
        this.seatBase3D.circle(0, 0, 24);
        this.seatBase3D.stroke({ width: 0.5, color: 0x00f3ff, alpha: 0.4 });
    }

    public setEmptyState(isHeroSeated: boolean) {
        this.isStaticEmpty = isHeroSeated;
        if (isHeroSeated) {
            this.plusText.visible = false; 
            this.sentarText.text = 'VAZIO';
            this.sentarText.y = 0; 
            (this.sentarText.style as any).fontSize = 8.5;
            this.emptySeatContainer.cursor = 'default';
        } else {
            this.plusText.visible = true; 
            this.sentarText.text = 'SENTAR';
            this.sentarText.y = 8; 
            (this.sentarText.style as any).fontSize = 8.5;
            this.emptySeatContainer.cursor = 'pointer';
        }
        this.drawActiveSeatBase();
    }

    public setSeated(isSeated: boolean) {
        this.emptySeatContainer.visible = !isSeated;
        this.seatedContainer.visible = isSeated;
        if (this.idleAnim) {
            // Remove primeiro para não duplicar listeners no Ticker
            PIXI.Ticker.shared.remove(this.idleAnim);
            if (!isSeated) {
                PIXI.Ticker.shared.add(this.idleAnim);
            }
        }
    }

    public updatePlayerInfo(name: string, chips: number) {
        const safeName = name || 'Livre';
        this.nameText.text = safeName.length > 10 ? safeName.substring(0, 9) + '...' : safeName;
        this.balanceText.text = `R$ ${chips || 0}`;
    }

    public startTimer() {
        this.timerLabelContainer.visible = true;
        this.timerBgArc.visible = true;
    }
    
    public stopTimer() {
        this.timerArc.clear();
        this.timerLabelContainer.visible = false;
        this.timerBgArc.visible = false;
    }

    public updateTimer(progress: number, secLeft: number) {
        this.timerArc.clear();
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (progress * Math.PI * 2);
        this.timerArc.arc(0, 0, 34, startAngle, endAngle, false); 
        let color = 0x2ecc71; 
        if (progress < 0.25) color = 0xe74c3c; 
        else if (progress < 0.5) color = 0xf1c40f; 
        this.timerArc.stroke({ width: 7, color: color }); 
        this.timerText.text = `⏱ ${secLeft}`;
    }

    public getTimerTipPosition(progress: number) {
        const endAngle = -Math.PI / 2 + (progress * Math.PI * 2);
        return {
            x: 34 * Math.cos(endAngle), 
            y: 34 * Math.sin(endAngle)  
        };
    }
    
    public darken() {
        const filter = new PIXI.ColorMatrixFilter();
        filter.brightness(0.4, false);
        this.container.filters = [filter];
    }

    public resetFilter() {
        this.container.filters = [];
    }

    public destroy() {
        if (this.idleAnim) {
            PIXI.Ticker.shared.remove(this.idleAnim);
        }
        if (this.container && !this.container.destroyed) {
            this.container.destroy({ children: true });
        }
    }
}