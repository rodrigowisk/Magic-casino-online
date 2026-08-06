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

    private avatarSprite: PIXI.Sprite;

    private sentarText: PIXI.Text;
    private plusText: PIXI.Text; 
    private seatBase3D: PIXI.Graphics;
    private outerGlow: PIXI.Graphics;
    private isStaticEmpty: boolean = false;

    private idleAnim: (() => void) | null = null;
    
    private effectLayer: PIXI.Graphics;
    private sitAnimTick: ((ticker: PIXI.Ticker) => void) | null = null;
    private standAnimTick: ((ticker: PIXI.Ticker) => void) | null = null;
    
    private lastProgress: number = -1;
    private lastSec: number = -1;

    private colorFilter = new PIXI.ColorMatrixFilter();

    constructor(
        x: number, 
        y: number, 
        avatarTexture: PIXI.Texture, 
        playerName: string,
        initialChips: number, 
        isSeated: boolean, 
        onSitDown: () => void
    ) {
        this.colorFilter.brightness(0.4, false);

        this.container = new PIXI.Container();
        this.container.x = x;
        this.container.y = y;
        
        // Aplica a redução global de 18% no tamanho dos assentos como padrão
        this.container.scale.set(0.82);

        this.emptySeatContainer = new PIXI.Container();
        this.emptySeatContainer.eventMode = 'static'; 
        this.emptySeatContainer.cursor = 'pointer';   
        
        if (typeof onSitDown === 'function') {
            this.emptySeatContainer.on('pointertap', onSitDown);
        }

        this.outerGlow = new PIXI.Graphics();
        this.outerGlow.circle(0, 0, 36);
        this.outerGlow.fill({ color: 0x00f3ff, alpha: 0.15 }); 
        this.outerGlow.blendMode = 'add';
        this.emptySeatContainer.addChild(this.outerGlow);

        this.seatBase3D = new PIXI.Graphics();
        this.drawActiveSeatBase(); 
        this.emptySeatContainer.addChild(this.seatBase3D);

        const plusStyle = { fontFamily: 'Arial', fontSize: 24, fill: 0xffffff, fontWeight: '900', dropShadow: false, align: 'center' };
        const textStyle = { fontFamily: 'Arial', fontSize: 8.5, fill: 0xffffff, fontWeight: '900', letterSpacing: 1.5, dropShadow: true, dropShadowColor: '#00f3ff', dropShadowDistance: 0, dropShadowBlur: 8, align: 'center' };

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

        this.idleAnim = () => {
            if(!this.emptySeatContainer || this.emptySeatContainer.destroyed || !this.emptySeatContainer.visible) return;
            if(!this.seatBase3D || this.seatBase3D.destroyed || !this.seatBase3D.scale) return;

            const time = Date.now();
            const slowTime = time / 800; 
            const seatScale = 1 + Math.sin(slowTime) * 0.015;
            
            this.seatBase3D.scale.set(seatScale);
            
            if(this.outerGlow && !this.outerGlow.destroyed && this.outerGlow.scale) {
                this.outerGlow.scale.set(seatScale + Math.sin(slowTime * 1.2) * 0.05);
                this.outerGlow.alpha = 0.1 + Math.sin(slowTime * 1.5) * 0.1;
            }
            if(this.sentarText && !this.sentarText.destroyed) {
                this.sentarText.alpha = 0.85 + Math.sin(slowTime * 2) * 0.15;
            }
            if(this.plusText && !this.plusText.destroyed) {
                this.plusText.alpha = 0.85 + Math.sin(slowTime * 2) * 0.15;
            }
        };

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
            text: `${Number(safeChips).toFixed(2).replace('.', ',')}`, 
            style: { fontFamily: 'Arial', fontSize: 13, fill: 0xffffff, fontWeight: 'bold' } 
        });
        this.balanceText.anchor.set(0.5); 
        this.balanceText.y = 60; 
        this.seatedContainer.addChild(this.balanceText);

        this.effectLayer = new PIXI.Graphics();
        this.effectLayer.blendMode = 'add';
        this.effectLayer.zIndex = 10; 

        this.container.addChild(this.emptySeatContainer);
        this.container.addChild(this.seatedContainer);
        this.container.addChild(this.effectLayer); 

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

    public setAsHero(isHero: boolean) {
        // Se for o herói logado nesta cadeira, a escala fica maior (0.95).
        // Se for adversário ou cadeira vazia, mantém reduzido (0.82).
        this.container.scale.set(isHero ? 0.95 : 0.82);
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
        
        if (!isSeated) {
            this.stopTimer();
        }

        if (!this.sitAnimTick && !this.standAnimTick) {
            this.seatedContainer.scale.set(1);
            if (isSeated) this.seatedContainer.alpha = 1;
        }

        if(this.idleAnim) {
            PIXI.Ticker.shared.remove(this.idleAnim);
            if(!isSeated) {
                PIXI.Ticker.shared.add(this.idleAnim);
            }
        }
    }

    public playSitAnimation() {
        if (this.sitAnimTick) PIXI.Ticker.shared.remove(this.sitAnimTick);
        if (this.standAnimTick) PIXI.Ticker.shared.remove(this.standAnimTick);

        this.setSeated(true);
        this.seatedContainer.alpha = 0;
        this.seatedContainer.scale.set(0);

        let timeElapsed = 0;
        const particles: any[] = [];
        const colors = [0x00f3ff, 0xa855f7, 0xffffff]; 

        for(let i=0; i<40; i++) {
            particles.push({
                x: 0, y: 0,
                vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.5) * 16,
                life: 1, size: Math.random() * 6 + 2, color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        this.sitAnimTick = (ticker: PIXI.Ticker) => {
            if (!this.effectLayer || this.effectLayer.destroyed) {
                if (this.sitAnimTick) { PIXI.Ticker.shared.remove(this.sitAnimTick); this.sitAnimTick = null; }
                return;
            }

            timeElapsed += ticker.deltaTime;
            this.effectLayer.clear();

            if (timeElapsed < 12) {
                const startY = -250;
                const alpha = 1 - (timeElapsed / 12); 
                
                this.effectLayer.moveTo(0, startY);
                let currentY = startY; let currentX = 0;
                while (currentY < 0) {
                    currentY += 40; currentX += (Math.random() - 0.5) * 50;
                    if (currentY > 0) { currentY = 0; currentX = 0; } 
                    this.effectLayer.lineTo(currentX, currentY);
                }
                
                this.effectLayer.stroke({ width: 8, color: 0xa855f7, alpha: alpha * 0.5 });
                this.effectLayer.stroke({ width: 3, color: 0x00f3ff, alpha: alpha });
                this.effectLayer.stroke({ width: 1.5, color: 0xffffff, alpha: alpha }); 
            }

            let activeParticles = 0;
            for(let p of particles) {
                if (p.life > 0) {
                    activeParticles++;
                    p.x += p.vx; p.y += p.vy; p.vx *= 0.88; p.vy *= 0.88;
                    p.life -= 0.02 * ticker.deltaTime;
                    
                    this.effectLayer.circle(p.x, p.y, p.size * p.life);
                    this.effectLayer.fill({ color: p.color, alpha: p.life });
                }
            }

            if (timeElapsed > 5) { 
                if (this.seatedContainer && !this.seatedContainer.destroyed && this.seatedContainer.scale.x < 1) {
                    const newScale = Math.min(1, this.seatedContainer.scale.x + 0.1 * ticker.deltaTime);
                    this.seatedContainer.scale.set(newScale);
                    this.seatedContainer.alpha = newScale;
                }
            }

            if (activeParticles === 0 && (!this.seatedContainer || this.seatedContainer.destroyed || this.seatedContainer.scale.x >= 1)) {
                if (this.sitAnimTick) { PIXI.Ticker.shared.remove(this.sitAnimTick); this.sitAnimTick = null; }
                this.effectLayer.clear();
            }
        };

        PIXI.Ticker.shared.add(this.sitAnimTick);
    }

    public playStandAnimation() {
        if (this.standAnimTick) PIXI.Ticker.shared.remove(this.standAnimTick);
        if (this.sitAnimTick) PIXI.Ticker.shared.remove(this.sitAnimTick);

        this.setSeated(false);

        let timeElapsed = 0;
        const smokeParticles: any[] = [];
        const smokeColors = [0x333333, 0x555555, 0x888888, 0xff5500, 0xffaa00]; 

        for(let i=0; i < 25; i++) {
            smokeParticles.push({
                x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
                life: 1.0, size: Math.random() * 8 + 8,
                color: smokeColors[Math.floor(Math.random() * smokeColors.length)], expansionRate: Math.random() * 2 + 1 
            });
        }

        const sparks: any[] = [];
        for(let i=0; i < 10; i++) { 
            sparks.push({ angle: Math.random() * Math.PI * 2, length: Math.random() * 30 + 20 });
        }

        this.standAnimTick = (ticker: PIXI.Ticker) => {
            if (!this.effectLayer || this.effectLayer.destroyed) {
                if (this.standAnimTick) { PIXI.Ticker.shared.remove(this.standAnimTick); this.standAnimTick = null; }
                return;
            }

            timeElapsed += ticker.deltaTime;
            this.effectLayer.clear();

            if (timeElapsed < 4) {
                const flashAlpha = 1 - (timeElapsed / 4);
                this.effectLayer.circle(0, 0, 20 + (timeElapsed * 2));
                this.effectLayer.fill({ color: 0xffaa00, alpha: flashAlpha * 0.8 });
                this.effectLayer.circle(0, 0, 10);
                this.effectLayer.fill({ color: 0xffffff, alpha: flashAlpha });
            }

            if (timeElapsed < 6) {
                const sparkAlpha = 1 - (timeElapsed / 6);
                const magicColors = [0x00f3ff, 0xa855f7, 0x3b82f6, 0xd946ef]; 

                for (let s of sparks) {
                    const startX = Math.cos(s.angle) * (10 + timeElapsed * 2); const startY = Math.sin(s.angle) * (10 + timeElapsed * 2);
                    const endX = Math.cos(s.angle) * (s.length + timeElapsed * 8); const endY = Math.sin(s.angle) * (s.length + timeElapsed * 8);
                    const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 10; const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 10;

                    this.effectLayer.moveTo(startX, startY);
                    this.effectLayer.lineTo(midX, midY);
                    this.effectLayer.lineTo(endX, endY);
                    
                    const rayColor = magicColors[Math.floor(Math.random() * magicColors.length)];
                    this.effectLayer.stroke({ width: 2, color: rayColor, alpha: sparkAlpha });
                }
            }

            let activeParticles = 0;
            for(let p of smokeParticles) {
                if (p.life > 0) {
                    activeParticles++;
                    p.x += p.vx; p.y += p.vy; p.vx *= 0.75; p.vy *= 0.75;
                    p.size += p.expansionRate * ticker.deltaTime; p.life -= 0.06 * ticker.deltaTime; 
                    
                    let drawColor = p.color;
                    if ((p.color === 0xff5500 || p.color === 0xffaa00) && p.life < 0.6) { drawColor = 0x555555; }

                    this.effectLayer.circle(p.x, p.y, p.size);
                    this.effectLayer.fill({ color: drawColor, alpha: Math.max(0, p.life * 0.6) });
                }
            }

            if (activeParticles === 0 && timeElapsed > 6) {
                if (this.standAnimTick) { PIXI.Ticker.shared.remove(this.standAnimTick); this.standAnimTick = null; }
                this.effectLayer.clear();
            }
        };

        PIXI.Ticker.shared.add(this.standAnimTick);
    }

    public updatePlayerInfo(name: string, chips: number) {
        const safeName = name || 'Livre';
        this.nameText.text = safeName.length > 10 ? safeName.substring(0, 9) + '...' : safeName;
        this.balanceText.text = `${Number(chips || 0).toFixed(2).replace('.', ',')}`;
    }

    public startTimer() {
        if (!this.timerLabelContainer || this.timerLabelContainer.destroyed) return;
        this.timerLabelContainer.visible = true;
        this.timerBgArc.visible = true;
    }
    
    public stopTimer() {
        if (!this.timerArc || this.timerArc.destroyed) return;
        this.timerArc.clear();
        this.timerLabelContainer.visible = false;
        this.timerBgArc.visible = false;
        this.lastProgress = -1; 
        this.lastSec = -1;
    }

    public updateTimer(progress: number, secLeft: number) {
        if (!this.timerArc || this.timerArc.destroyed || !this.seatedContainer.visible) return;
        
        if (Math.abs(this.lastProgress - progress) < 0.002 && this.lastSec === secLeft) return;
        
        this.lastProgress = progress;
        this.lastSec = secLeft;

        this.timerArc.clear();
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (progress * Math.PI * 2);
        this.timerArc.arc(0, 0, 34, startAngle, endAngle, false); 
        let color = 0x2ecc71; 
        if (progress < 0.25) color = 0xe74c3c; 
        else if (progress < 0.5) color = 0xf1c40f; 
        this.timerArc.stroke({ width: 7, color: color }); 
        
        if (this.timerText && !this.timerText.destroyed) {
             this.timerText.text = `⏱ ${secLeft}`;
        }
    }

    public getTimerTipPosition(progress: number) {
        const endAngle = -Math.PI / 2 + (progress * Math.PI * 2);
        return { x: 34 * Math.cos(endAngle), y: 34 * Math.sin(endAngle) };
    }
    
    public darken() {
        if (!this.container || this.container.destroyed) return;
        if (this.seatedContainer && !this.seatedContainer.destroyed) { 
            this.seatedContainer.filters = [this.colorFilter]; 
            this.seatedContainer.alpha = 1.0; 
        }
    }

    public resetFilter() {
        if (!this.container || this.container.destroyed) return;
        if (this.seatedContainer && !this.seatedContainer.destroyed) {
            this.seatedContainer.filters = []; 
            if (!this.sitAnimTick && !this.standAnimTick) { 
                this.seatedContainer.alpha = 1.0; 
            }
        }
    }

    public destroy() {
        if (this.idleAnim) { PIXI.Ticker.shared.remove(this.idleAnim); this.idleAnim = null; }
        if (this.sitAnimTick) { PIXI.Ticker.shared.remove(this.sitAnimTick); this.sitAnimTick = null; }
        if (this.standAnimTick) { PIXI.Ticker.shared.remove(this.standAnimTick); this.standAnimTick = null; }
        
        if (this.container && !this.container.destroyed) { this.container.destroy({ children: true }); }
    }
}