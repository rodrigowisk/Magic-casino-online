import * as PIXI from 'pixi.js';
import { MeinhoPixiEngine } from './MeinhoPixiEngine'; 

export class MeinhoAnimator {
    
    public static async discardCards(engine: MeinhoPixiEngine, cardsToDiscard: PIXI.Container[]) {
        const validCards = cardsToDiscard.filter(c => c && !c.destroyed && !(c as any).isBeingDiscarded);
        
        if (!engine.app || validCards.length === 0) return;

        validCards.forEach(c => (c as any).isBeingDiscarded = true);

        engine.isDiscardingCards = true;
        engine.updateDeckVisibility();

        if (document.hidden) {
             engine.isDiscardingCards = false;
             return Promise.resolve();
        }

        const PORTAL_X = engine.deckInstance ? engine.deckInstance.view.x : 215; 
        const PORTAL_Y = engine.deckInstance ? engine.deckInstance.view.y : 520; 
        const CORE_RADIUS = 12; 
        
        const blackHoleCore = new PIXI.Graphics();
        blackHoleCore.circle(0, 0, CORE_RADIUS); 
        blackHoleCore.fill({ color: 0x000000, alpha: 1 });
        blackHoleCore.stroke({ width: 3, color: 0xa855f7, alpha: 0.8 });
        blackHoleCore.x = PORTAL_X;
        blackHoleCore.y = PORTAL_Y;
        engine.mainLayer.addChild(blackHoleCore);

        let portalActive = true;
        let angleOffset = 0;
        let coreScale = 1.0; 

        const emitPlasmaAnim = () => {
            if (!portalActive || !engine.app) return;
            angleOffset += 0.08; // Giro suave e visível

            const particlesPerFrame = 2; 
            for (let i = 0; i < particlesPerFrame; i++) {
                const p = new PIXI.Graphics();
                const size = Math.random() * 2 + 1;
                p.circle(0, 0, size);
                
                const color = engine.MAGIC_COLORS[Math.floor(Math.random() * engine.MAGIC_COLORS.length)];
                p.fill({ color: color, alpha: 0.8 });

                const spawnRadius = CORE_RADIUS * coreScale; 
                const angle = angleOffset + (i * (Math.PI * 2 / particlesPerFrame));
                p.x = PORTAL_X + Math.cos(angle) * spawnRadius;
                p.y = PORTAL_Y + Math.sin(angle) * spawnRadius;
                engine.mainLayer.addChild(p);

                const radialSpeed = 1.0 + Math.random() * 1.5;
                const vrX = Math.cos(angle) * radialSpeed;
                const vrY = Math.sin(angle) * radialSpeed;
                const orbitalSpeed = 2.0; 
                const vtX = Math.cos(angle + Math.PI / 2) * orbitalSpeed;
                const vtY = Math.sin(angle + Math.PI / 2) * orbitalSpeed;

                engine.activeFireParticles.push({ 
                    mesh: p, 
                    life: 0.6 + Math.random() * 0.4, 
                    vx: vrX + vtX, 
                    vy: vrY + vtY 
                });
            }
        };
        engine.app.ticker.add(emitPlasmaAnim);

        const collectPromises = validCards.map((card, index) => {
            if (!card || card.destroyed) return Promise.resolve();
            card.filters = []; 
            if (card.parent === engine.mainLayer) engine.mainLayer.setChildIndex(card, engine.mainLayer.children.length - 1);

            return new Promise<void>((resolve) => {
                // Intervalo de 80ms de sucção entre uma carta e outra para dar o efeito de fila
                engine.pixiDelay(index * 80).then(() => {
                    if (!card || card.destroyed || !engine.app || !engine.app.ticker) return resolve();

                    const startX = card.x;
                    const startY = card.y;
                    const originalScaleX = Math.abs(card.scale.x);
                    const originalScaleY = Math.abs(card.scale.y);
                    let progress = 0;
                    
                    // Velocidade calculada para as cartas orbitarem antes de sumirem
                    const speed = 0.015 + (Math.random() * 0.01); 

                    const suckAnim = () => {
                        if (!card || card.destroyed || !engine.app || !engine.app.ticker) {
                            if (engine.app && engine.app.ticker) engine.app.ticker.remove(suckAnim);
                            resolve(); return;
                        }

                        progress += speed; 
                        if (progress >= 1) progress = 1;

                        const gravityPull = progress * progress * progress * progress; 
                        const orbitAngle = gravityPull * Math.PI * 1.5; 
                        const dx = startX - PORTAL_X;
                        const dy = startY - PORTAL_Y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        const initialAngle = Math.atan2(dy, dx);

                        const currentDist = dist * (1 - gravityPull);
                        card.x = PORTAL_X + Math.cos(initialAngle + orbitAngle) * currentDist;
                        card.y = PORTAL_Y + Math.sin(initialAngle + orbitAngle) * currentDist;
                        card.rotation += 0.1 + (gravityPull * 0.4);
                        card.scale.set(originalScaleX * (1 - gravityPull), originalScaleY * (1 - (gravityPull * 0.5)));
                        card.alpha = 1 - gravityPull; 

                        if (progress === 1) {
                            if (engine.app && engine.app.ticker) engine.app.ticker.remove(suckAnim);
                            resolve();
                        }
                    };
                    engine.app.ticker.add(suckAnim);
                });
            });
        });

        await Promise.all(collectPromises);
        
        await new Promise<void>((resolve) => {
            const collapseAnim = () => {
                if (!engine.app || !engine.app.ticker) {
                    resolve();
                    return;
                }

                // Fechamento e implosão suave do portal
                coreScale -= 0.04; 
                if (coreScale <= 0) {
                    coreScale = 0;
                    if (engine.app && engine.app.ticker) engine.app.ticker.remove(collapseAnim);
                    
                    for(let i = 0; i < 15; i++) {
                        const p = new PIXI.Graphics();
                        p.circle(0, 0, Math.random() * 3 + 1.5);
                        p.fill({ color: engine.MAGIC_COLORS[Math.floor(Math.random() * engine.MAGIC_COLORS.length)], alpha: 1 });
                        p.x = PORTAL_X;
                        p.y = PORTAL_Y;
                        engine.mainLayer.addChild(p);
                        engine.activeFireParticles.push({ mesh: p, life: 1.0, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 });
                    }
                    resolve();
                }
                
                if (blackHoleCore && !blackHoleCore.destroyed) blackHoleCore.scale.set(coreScale);
            };
            
            if (engine.app && engine.app.ticker) engine.app.ticker.add(collapseAnim);
            else resolve();
        });

        portalActive = false;
        if (engine.app && engine.app.ticker) engine.app.ticker.remove(emitPlasmaAnim);
        if (blackHoleCore.parent) blackHoleCore.parent.removeChild(blackHoleCore);
        blackHoleCore.destroy();

        engine.isDiscardingCards = false;
        engine.updateDeckVisibility();
    }

    public static async throwCustomChip(engine: MeinhoPixiEngine, startX: number, startY: number, endX: number, endY: number, amount?: number, isPot: boolean = false) {
        if (!engine.app) return null;
        const chipContainer = new PIXI.Container();
        const textureToUse = isPot ? engine.potChipsTexture : engine.singleChipTexture;

        if (textureToUse) {
            const sprite = new PIXI.Sprite(textureToUse);
            sprite.anchor.set(0.5);
            sprite.width = isPot ? 65 : 30; 
            sprite.height = isPot ? 65 : 30; 
            chipContainer.addChild(sprite);
        }

        if (amount !== undefined) {
            const valueText = new PIXI.Text({
                text: amount.toString(),
                style: { fontFamily: 'Arial', fontSize: 11, fill: 0xffffff, fontWeight: 'bold' }
            } as any);
            valueText.anchor.set(0.5);
            const pillWidth = valueText.width + 12; 
            const pillBg = new PIXI.Graphics();
            pillBg.roundRect(12, -14, pillWidth, 20, 10);
            pillBg.fill({ color: 0x000000, alpha: 0.75 });
            pillBg.stroke({ width: 1, color: 0x00f3ff, alpha: 0.8 }); 
            valueText.x = 12 + (pillWidth / 2);
            valueText.y = -4; 
            chipContainer.addChild(pillBg);
            chipContainer.addChild(valueText);
        }

        chipContainer.x = startX;
        chipContainer.y = startY;
        engine.mainLayer.addChild(chipContainer);

        await engine.performAnimation(chipContainer, endX, endY, 15); 
        return chipContainer;
    }
}