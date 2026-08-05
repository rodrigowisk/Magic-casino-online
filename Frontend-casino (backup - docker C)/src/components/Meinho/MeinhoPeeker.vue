<template>
  <div class="peeker-overlay">
    
    <button class="confirm-btn" :class="{ 'fade-out': isDiscarding }" @click="$emit('close')">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
      MOSTRAR
    </button>

    <div 
      class="three-container" 
      :class="{ 'sucked-into-portal': isDiscarding }"
      ref="sceneContainer"
      @pointerdown="startDrag"
      @pointermove="onDrag"
      @pointerup="stopDrag"
      @pointerleave="stopDrag"
    ></div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import * as THREE from 'three';

// Importa o verso da carta
import deckImg from '../../assets/imagens/deck.png';

const props = defineProps<{ cards: any[] }>();
const emit = defineEmits(['close']);

const sceneContainer = shallowRef<HTMLElement | null>(null);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let animationFrameId: number;

let card1: THREE.Group | null = null;
let card2: THREE.Group | null = null;

let isDragging = false;
let startY = 0;
let targetBend = 0;
let currentBend = 0;

const isDiscarding = ref(false);

let geomCard1Front: THREE.PlaneGeometry;
let geomCard1Back: THREE.PlaneGeometry;
let geomCard2Front: THREE.PlaneGeometry;
let geomCard2Back: THREE.PlaneGeometry;

let origPos1Front: Float32Array;
let origPos1Back: Float32Array;
let origPos2Front: Float32Array;
let origPos2Back: Float32Array;

// Medidas proporcionais para o formato da carta
const cardWidth = 1.35;
const cardHeight = 2.15;

const discard = () => {
  return new Promise<void>((resolve) => {
    isDiscarding.value = true;
    setTimeout(() => {
      resolve();
    }, 700); // Sincroniza de forma perfeita com a descida da carta no buraco
  });
};

defineExpose({ discard });

onMounted(() => {
  setTimeout(() => {
    initThreeJS();
    animate();
  }, 50);
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  if (renderer) {
    renderer.forceContextLoss();
    renderer.dispose();
    renderer.domElement.remove();
  }
  if (geomCard1Front) geomCard1Front.dispose();
  if (geomCard1Back) geomCard1Back.dispose();
  if (geomCard2Front) geomCard2Front.dispose();
  if (geomCard2Back) geomCard2Back.dispose();
});

function startDrag(e: PointerEvent) {
  if (isDiscarding.value) return; 
  isDragging = true;
  startY = e.clientY;
  const container = sceneContainer.value;
  if (container) container.setPointerCapture(e.pointerId);
}

function onDrag(e: PointerEvent) {
  if (!isDragging || isDiscarding.value) return;
  const deltaY = startY - e.clientY; 
  if (deltaY > 0) {
    targetBend = Math.min(deltaY / 200, 1.0); 
  }
}

function stopDrag(e: PointerEvent) {
  if (!isDragging || isDiscarding.value) return;
  isDragging = false;
  const container = sceneContainer.value;
  if (container && container.hasPointerCapture(e.pointerId)) {
    container.releasePointerCapture(e.pointerId);
  }
  targetBend = 0; 
}

function extractCardInfo(cardData: any) {
  let rank = 'A';
  let suit = '♠';
  let color = '#000000';

  if (cardData) {
    if (typeof cardData === 'string') {
      rank = cardData.slice(0, -1) || 'A';
      suit = cardData.slice(-1) || '♠';
    } else if (typeof cardData === 'object') {
      rank = cardData.rank || cardData.Rank || 'A';
      suit = cardData.suit || cardData.Suit || '♠';
    }
    if (suit === '♥' || suit === '♦') color = '#e74c3c'; 
  }
  
  return { rank, suit, color };
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function createFrontTexture(cardData: any) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1600; 
  const ctx = canvas.getContext('2d')!;

  ctx.translate(1024, 0);
  ctx.scale(-1, 1);

  const { rank, suit, color } = extractCardInfo(cardData);

  ctx.clearRect(0, 0, 1024, 1600);

  ctx.fillStyle = '#ffffff';
  drawRoundRect(ctx, 0, 0, 1024, 1600, 80);
  ctx.fill();
  
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 8;
  drawRoundRect(ctx, 35, 35, 954, 1530, 60);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle'; 
  
  const drawIndex = (x: number, y: number, isUpsideDown: boolean, scale = 1) => {
    ctx.save();
    ctx.translate(x, y);
    if (isUpsideDown) ctx.rotate(Math.PI); 
    ctx.scale(scale, scale);
    
    ctx.font = 'bold 200px Arial';
    ctx.fillText(rank, 0, -40);
    
    ctx.font = '180px Arial';
    ctx.fillText(suit, 0, 80);
    
    ctx.restore();
  };

  // 1. Canto Superior Esquerdo (Padrão)
  drawIndex(1024 - 230, 280, false); 
  
  // 2. Canto Inferior ESQUERDO (Onde você puxa a carta)
  drawIndex(1024 - 200, 1600 - 220, true, 0.95); 
  
  // O Naipe gigante no meio
  ctx.font = '500px Arial';
  ctx.fillText(suit, 512, 800);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true; 
  return texture;
}

function createBackTexture(imageSrc: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 1024, 1600);

  ctx.fillStyle = '#ffffff';
  drawRoundRect(ctx, 0, 0, 1024, 1600, 80);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const img = new Image();
  img.src = imageSrc;
  img.onload = () => {
    ctx.save();
    drawRoundRect(ctx, 40, 40, 944, 1520, 55);
    ctx.clip();
    
    ctx.fillStyle = '#e2e8f0'; 
    ctx.fill();

    ctx.drawImage(img, 40, 40, 944, 1520);
    ctx.restore();

    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 6;
    drawRoundRect(ctx, 40, 40, 944, 1520, 55);
    ctx.stroke();

    texture.needsUpdate = true;
  };

  return texture;
}

function initThreeJS() {
  if (!sceneContainer.value) return;

  const w = sceneContainer.value.clientWidth || 280;
  const h = sceneContainer.value.clientHeight || 360;

  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, -3.8, 3.5); 
  camera.lookAt(0, -0.5, 0);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; 
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.background = 'transparent';
  sceneContainer.value.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);
  
  const spotLight = new THREE.SpotLight(0xffffff, 1.5);
  spotLight.position.set(0, -2, 6);
  spotLight.angle = Math.PI / 3;
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  scene.add(spotLight);

  const tableGeom = new THREE.PlaneGeometry(15, 15);
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.6, transparent: true }); 
  const tableMesh = new THREE.Mesh(tableGeom, shadowMat);
  tableMesh.position.z = -0.05; 
  tableMesh.receiveShadow = true;
  scene.add(tableMesh);

  const segments = 64; 

  geomCard1Front = new THREE.PlaneGeometry(cardWidth, cardHeight, segments, segments);
  geomCard1Back = new THREE.PlaneGeometry(cardWidth, cardHeight, segments, segments);
  geomCard2Front = new THREE.PlaneGeometry(cardWidth, cardHeight, segments, segments);
  geomCard2Back = new THREE.PlaneGeometry(cardWidth, cardHeight, segments, segments);

  origPos1Front = new Float32Array(geomCard1Front.attributes.position.array);
  origPos1Back = new Float32Array(geomCard1Back.attributes.position.array);
  origPos2Front = new Float32Array(geomCard2Front.attributes.position.array);
  origPos2Back = new Float32Array(geomCard2Back.attributes.position.array);

  const texFront1 = createFrontTexture(props.cards[0]);
  const texFront2 = createFrontTexture(props.cards[1]);
  
  const texBack = createBackTexture(deckImg);

  const matFront1 = new THREE.MeshStandardMaterial({ map: texFront1, side: THREE.BackSide, roughness: 0.3, transparent: true, alphaTest: 0.1 });
  const matFront2 = new THREE.MeshStandardMaterial({ map: texFront2, side: THREE.BackSide, roughness: 0.3, transparent: true, alphaTest: 0.1 });
  const matBack = new THREE.MeshStandardMaterial({ map: texBack, side: THREE.FrontSide, roughness: 0.3, transparent: true, alphaTest: 0.1 });

  function buildCard(geomFront: THREE.PlaneGeometry, geomBack: THREE.PlaneGeometry, faceMat: THREE.Material) {
    const group = new THREE.Group();
    const meshBack = new THREE.Mesh(geomBack, matBack);
    meshBack.castShadow = true;
    group.add(meshBack);
    
    const meshFace = new THREE.Mesh(geomFront, faceMat);
    meshFace.position.z = -0.002; 
    meshFace.castShadow = true;
    group.add(meshFace);
    return group;
  }

  card1 = buildCard(geomCard1Front, geomCard1Back, matFront1);
  card2 = buildCard(geomCard2Front, geomCard2Back, matFront2);

  card1.position.set(-0.2, 0, 0);
  card1.rotation.z = -0.05; 
  scene.add(card1);

  card2.position.set(0.2, -0.08, 0.02); 
  card2.rotation.z = 0.05; 
  scene.add(card2);
}

function applyBend(amount: number) {
  if (!geomCard1Front || !geomCard2Front) return;

  function deform(geom: THREE.PlaneGeometry, orig: Float32Array) {
    const pos = geom.attributes.position;
    
    const bl_x = -(cardWidth / 2);  
    const bl_y = -(cardHeight / 2); 

    const dirX = 1.0;
    const dirY = 1.2; 
    const len = Math.sqrt(dirX*dirX + dirY*dirY);
    const nx = dirX / len;
    const ny = dirY / len;

    const maxDist = amount * 1.44; 
    const R = 0.44; 

    for (let i = 0; i < pos.count; i++) {
      let x = orig[i * 3];
      let y = orig[i * 3 + 1];
      let z = orig[i * 3 + 2];

      let dist = (x - bl_x) * nx + (y - bl_y) * ny;

      if (dist < maxDist && amount > 0) {
        let p = maxDist - dist; 
        let theta = p / R;
        let arc_x = R * Math.sin(theta);
        let arc_z = R * (1.0 - Math.cos(theta));
        let shift = p - arc_x;

        x += shift * nx;
        y += shift * ny;
        z += arc_z;
        z += 0.02 * (p / maxDist);
      }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
  }

  deform(geomCard1Front, origPos1Front);
  deform(geomCard1Back, origPos1Back);
  deform(geomCard2Front, origPos2Front);
  deform(geomCard2Back, origPos2Back);
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  
  if (isDiscarding.value && card1 && card2) {
    // 3D Engine Animation
    card1.position.x += (0 - card1.position.x) * 0.1;
    card1.position.y += (0 - card1.position.y) * 0.1;
    card1.position.z += (0 - card1.position.z) * 0.1;

    card2.position.x += (0 - card2.position.x) * 0.1;
    card2.position.y += (0 - card2.position.y) * 0.1;
    card2.position.z += (0 - card2.position.z) * 0.1;

    card1.rotation.z += 0.2;
    card2.rotation.z += 0.2;

    currentBend += (1.2 - currentBend) * 0.1;
    applyBend(currentBend);

  } else {
    currentBend += (targetBend - currentBend) * 0.15;
    if (Math.abs(targetBend - currentBend) > 0.001) {
      applyBend(currentBend);
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}
</script>

<style scoped>
.peeker-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 430px;
  height: 900px;
  background: transparent;
  z-index: 400; 
  pointer-events: none; 
}

.three-container {
  position: absolute;
  bottom: 100px; 
  left: 50%;
  transform: translate(-50%, 0) scale(1) rotate(0deg); 
  width: 280px;  
  height: 360px; 
  cursor: grab;
  touch-action: none;
  pointer-events: auto; 
  z-index: 210;
  /* Animação que vai sugar o elemento CSS pra dentro do buraco negro */
  transition: transform 0.6s cubic-bezier(0.5, 0, 0.2, 1), opacity 0.6s ease-in;
}

.three-container:active {
  cursor: grabbing;
}

/* Esta classe é ativada quando clica em PULAR. Faz ele voar pro centro e encolher pra zero. */
.three-container.sucked-into-portal {
  transform: translate(calc(-50% + 50px), -200px) scale(0) rotate(720deg) !important;
  opacity: 0;
}

.confirm-btn {
  position: absolute;
  bottom: 193px; 
  left: 80px; 
  background: rgba(10, 15, 25, 0.85); 
  border: 1px solid rgba(0, 243, 255, 0.5);
  color: #00f3ff;
  font-family: Arial, sans-serif;
  font-size: 10px; 
  font-weight: 900;
  letter-spacing: 0.5px;
  padding: 8px 14px; 
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.8), 0 0 10px rgba(0, 243, 255, 0.3), inset 0 0 5px rgba(0, 243, 255, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 999; 
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease, opacity 0.3s ease;
  pointer-events: auto; 
  text-transform: uppercase;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.confirm-btn svg {
  width: 12px;
  height: 12px;
}

.confirm-btn:active {
  transform: scale(0.95);
  background: rgba(0, 243, 255, 0.3);
}

.confirm-btn.fade-out {
  opacity: 0;
  transform: scale(0.8);
  pointer-events: none;
}
</style>