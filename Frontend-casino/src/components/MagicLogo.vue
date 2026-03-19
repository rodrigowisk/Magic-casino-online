<template>
  <div class="magic-logo-container" ref="pixiContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as PIXI from 'pixi.js';

// Importe sua logo
import logoImg from '../assets/imagens/logo-casino.png';

const pixiContainer = ref<HTMLElement | null>(null);
let app: PIXI.Application;

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; size: number; color: number;
}
const magicParticles: Particle[] = []; 
const cosmoParticles: Particle[] = []; 

function drawPlasmaRays(gfx: PIXI.Graphics, cx: number, cy: number, maxRadius: number) {
  const colors = [0x00f3ff, 0xa855f7, 0xffffff]; 
  const numRays = Math.floor(Math.random() * 4) + 2; 

  for (let i = 0; i < numRays; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * maxRadius; 
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    gfx.moveTo(cx, cy);
    const midRadius = radius * 0.5;
    const midAngle = angle + (Math.random() - 0.5);
    
    gfx.lineTo(cx + Math.cos(midAngle) * midRadius, cy + Math.sin(midAngle) * midRadius);
    gfx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    
    gfx.stroke({ width: 1.5, color: color, alpha: 0.5 + Math.random() * 0.5 });
  }
}

onMounted(async () => {
  if (pixiContainer.value) {
    app = new PIXI.Application();
    
    await app.init({ width: 350, height: 400, backgroundAlpha: 0 });
    pixiContainer.value.appendChild(app.canvas);

    const texture = await PIXI.Assets.load(logoImg);
    
    const cosmoLayer = new PIXI.Graphics();
    cosmoLayer.blendMode = 'add'; 
    const cosmoBlur = new PIXI.BlurFilter();
    cosmoBlur.blur = 4;
    cosmoLayer.filters = [cosmoBlur];
    app.stage.addChild(cosmoLayer);

    const glowContainer = new PIXI.Container();
    glowContainer.x = app.screen.width / 2;
    glowContainer.y = (app.screen.height / 2) + 20; 

    const mainSprite = new PIXI.Sprite(texture);
    mainSprite.anchor.set(0.5);
    glowContainer.addChild(mainSprite);

    const scaleFactor = 180 / texture.width;
    glowContainer.scale.set(scaleFactor);
    app.stage.addChild(glowContainer);

    const magicLayer = new PIXI.Graphics();
    magicLayer.blendMode = 'add'; 
    app.stage.addChild(magicLayer);

    const plasmaCenterYOffset = 20; 
    const plasmaRadius = 22; 
    let timeElapsed = 0;
    
    app.ticker.add((ticker) => {
      timeElapsed += ticker.deltaTime;
      
      const cx = glowContainer.x;
      const cy = glowContainer.y; 
      const plasmaCy = cy + plasmaCenterYOffset; 
      
      magicLayer.clear();
      cosmoLayer.clear();

      mainSprite.scale.set(1 + Math.sin(timeElapsed * 0.1) * 0.02);

      for (let i = 0; i < 5; i++) {
        const auraColors = [0x6a0dad, 0xff00ff, 0x00f3ff]; 
        cosmoParticles.push({
          x: cx + (Math.random() - 0.5) * 140, 
          y: cy - 30 + (Math.random() * 50),   
          vx: (Math.random() - 0.5) * 1.5,     
          vy: -1.2 - Math.random() * 1.5,        
          life: 1, 
          size: Math.random() * 8 + 5,         
          color: auraColors[Math.floor(Math.random() * auraColors.length)]
        });
      }

      for (let i = cosmoParticles.length - 1; i >= 0; i--) {
        const p = cosmoParticles[i];
        p.x += p.vx; 
        p.y += p.vy; 
        p.life -= 0.025; 
        p.size *= 0.96; 

        if (p.life <= 0 || p.size < 0.5) {
          cosmoParticles.splice(i, 1); 
        } else {
          cosmoLayer.circle(p.x, p.y, p.size);
          cosmoLayer.fill({ color: p.color, alpha: p.life }); 
        }
      }

      if (Math.random() > 0.2) {
        drawPlasmaRays(magicLayer, cx, plasmaCy, plasmaRadius);
      }

      const numNewParticles = Math.floor(Math.random() * 2) + 1; 
      const magicColors = [0x00f3ff, 0xa855f7, 0xff1493]; 
      
      for (let i = 0; i < numNewParticles; i++) {
        magicParticles.push({
          x: cx + (Math.random() - 0.5) * (plasmaRadius * 1.5), 
          y: plasmaCy + (Math.random() - 0.5) * plasmaRadius,
          vx: (Math.random() - 0.5) * 0.8, 
          vy: -0.5 - Math.random() * 2, 
          life: 1, 
          size: 1 + Math.random() * 2.5, 
          color: magicColors[Math.floor(Math.random() * magicColors.length)]
        });
      }

      for (let i = magicParticles.length - 1; i >= 0; i--) {
        const p = magicParticles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.02; 
        if (p.life <= 0) {
          magicParticles.splice(i, 1); 
        } else {
          magicLayer.circle(p.x, p.y, p.size);
          magicLayer.fill({ color: p.color, alpha: p.life });
        }
      }
    });
  }
});

onBeforeUnmount(() => {
  if (app) {
    app.destroy({ removeView: true }, { children: true, texture: true });
  }
});
</script>

<style scoped>
.magic-logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  /* Largura e altura do canvas */
  width: 350px;
  height: 400px;
}
</style>