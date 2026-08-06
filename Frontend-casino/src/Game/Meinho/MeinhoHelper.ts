import * as PIXI from 'pixi.js';

export class MeinhoHelper {
    public static getSeatCoords(numSeats: number, i: number) {
        let avatarX = 0, avatarY = 0, cx = 0, cy = 0;
        const safeNumSeats = Math.max(2, Math.min(6, numSeats || 6));

        // Pontos-âncora definidos manualmente na distribuição de 6 lugares (abaixo).
        // Os demais tamanhos de mesa reaproveitam esses mesmos pontos, apenas
        // omitindo os assentos que não são usados, para manter o padrão visual.
        if (safeNumSeats === 2) {
            if (i === 0) { avatarX = 215; avatarY = 690; cx = avatarX + 60; cy = avatarY - 20; } // Herói
            else if (i === 1) { avatarX = 215; avatarY = 190; cx = avatarX + 60; cy = avatarY + 20; } // Topo
        }
        else if (safeNumSeats === 3) {
            if (i === 0) { avatarX = 215; avatarY = 690; cx = avatarX + 60; cy = avatarY - 20; } // Herói
            else if (i === 1) { avatarX = 65; avatarY = 330; cx = avatarX + 50; cy = avatarY + 10; } // Superior-esquerda
            else if (i === 2) { avatarX = 365; avatarY = 330; cx = avatarX - 50; cy = avatarY + 10; } // Superior-direita
        }
        else if (safeNumSeats === 4) {
            if (i === 0) { avatarX = 215; avatarY = 690; cx = avatarX + 60; cy = avatarY - 20; } // Herói
            else if (i === 1) { avatarX = 40; avatarY = 560; cx = avatarX + 50; cy = avatarY; } // Esquerda
            else if (i === 2) { avatarX = 215; avatarY = 190; cx = avatarX + 60; cy = avatarY + 20; } // Topo
            else if (i === 3) { avatarX = 390; avatarY = 560; cx = avatarX - 50; cy = avatarY; } // Direita
        }
        else if (safeNumSeats === 5) {
            if (i === 0) { avatarX = 215; avatarY = 690; cx = avatarX + 60; cy = avatarY - 20; } // Herói
            else if (i === 1) { avatarX = 40; avatarY = 560; cx = avatarX + 50; cy = avatarY; } // Inferior-esquerda
            else if (i === 2) { avatarX = 65; avatarY = 330; cx = avatarX + 50; cy = avatarY + 10; } // Superior-esquerda
            else if (i === 3) { avatarX = 365; avatarY = 330; cx = avatarX - 50; cy = avatarY + 10; } // Superior-direita
            else if (i === 4) { avatarX = 390; avatarY = 560; cx = avatarX - 50; cy = avatarY; } // Inferior-direita
        }
        else {
            if (i === 0) { avatarX = 215; avatarY = 690; cx = avatarX + 60; cy = avatarY - 20; }
            else if (i === 1) { avatarX = 40; avatarY = 560; cx = avatarX + 50; cy = avatarY; }
            else if (i === 2) { avatarX = 65; avatarY = 330; cx = avatarX + 50; cy = avatarY + 10; }
            else if (i === 3) { avatarX = 215; avatarY = 190; cx = avatarX + 60; cy = avatarY + 20; }
            else if (i === 4) { avatarX = 365; avatarY = 330; cx = avatarX - 50; cy = avatarY + 10; }
            else if (i === 5) { avatarX = 390; avatarY = 560; cx = avatarX - 50; cy = avatarY; }
        }

        return { avatarX, avatarY, cx, cy };
    }

    public static getBetTarget(pX: number, pY: number, targetPotX: number, targetPotY: number) {
        const centroMesaX = 215;
        const centroMesaY = 468; 

        const dx = centroMesaX - pX;
        const dy = centroMesaY - pY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const betDistance = 90; 
        
        let betX = pX;
        let betY = pY;
        
        if (dist > 0) {
            betX = pX + (dx / dist) * betDistance;
            betY = pY + (dy / dist) * betDistance;
        }
        
        return { betX, betY };
    }

    public static calcWin(betAmount: number, rakePercentage: number) {
        const ganhoBruto = betAmount * 2;
        const rakeRate = rakePercentage ? (rakePercentage / 100) : 0;
        const rakeCut = ganhoBruto * rakeRate;
        const totalCreditado = ganhoBruto - rakeCut;
        const lucroLiquido = totalCreditado - betAmount;
        
        return {
            totalCreditado,
            lucroLiquido,
            formatadoTexto: lucroLiquido.toFixed(2).replace('.', ',')
        };
    }

    public static spawnPotHitParticles(particleLayer: PIXI.Container, activeFireParticles: any[], potX: number, potY: number) {
        for (let i = 0; i < 15; i++) {
            const p = new PIXI.Graphics();
            const size = Math.random() * 3 + 2;
            p.circle(0, 0, size);
            p.fill({ color: 0xFFD700, alpha: 1 }); 
            p.x = potX - 35; 
            p.y = potY; 
            
            particleLayer.addChild(p);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            
            activeFireParticles.push({
                mesh: p,
                life: 1.0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            });
        }
    }

    public static spawnIdlePotParticles(particleLayer: PIXI.Container, activeFireParticles: any[], potX: number, potY: number, colors: number[]) {
        const p = new PIXI.Graphics();
        const size = Math.random() * 2 + 1;
        p.circle(0, 0, size);
        p.fill({ color: colors[Math.floor(Math.random() * colors.length)], alpha: 0.6 });
        p.x = (potX - 35) + (Math.random() - 0.5) * 40;
        p.y = potY + (Math.random() - 0.5) * 20;
        particleLayer.addChild(p);
        activeFireParticles.push({ mesh: p, life: 1.0, vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * -1 - 0.5 });
    }

    public static updateParticles(activeFireParticles: any[]) {
        for (let i = activeFireParticles.length - 1; i >= 0; i--) {
            const p = activeFireParticles[i];
            p.life -= 0.05; 
            p.mesh.alpha = Math.max(0, p.life);
            p.mesh.x += p.vx;
            p.mesh.y += p.vy;
            p.mesh.scale.set(Math.max(0, p.life));

            if (p.life <= 0) {
                if (p.mesh.parent) p.mesh.parent.removeChild(p.mesh);
                p.mesh.destroy();
                activeFireParticles.splice(i, 1);
            }
        }
    }
}