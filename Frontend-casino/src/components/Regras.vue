<template>
  <div class="legal-container">
    <div class="header">
      <button class="btn-voltar" @click="$router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      <h2>Regras dos Jogos</h2>
    </div>

    <div class="tabs">
      <button :class="{ active: activeTab === 'meinho' }" @click="activeTab = 'meinho'">Meinho</button>
      <button :class="{ active: activeTab === 'cacheta' }" @click="activeTab = 'cacheta'">Cacheta</button>
    </div>

    <div class="content-box custom-scrollbar" ref="contentBox">
      
      <div v-if="activeTab === 'meinho'" class="document-text fade-in">
        <h3>Como Jogar: Meinho</h3>
        <p class="last-updated">Mecânica de Apostas e Pote</p>

        <h4>1. O Objetivo</h4>
        <p>O Meinho é um jogo de emoção rápida e estratégia contra a mesa. O objetivo é analisar suas duas cartas fechadas e decidir se vale a pena apostar suas fichas contra o Pote central, tentando vencer a carta comunitária que será revelada.</p>

        <div class="highlight-box info">
          <h4>2. A Ante e o Pote</h4>
          <p>Para participar de uma rodada, todos os jogadores sentados pagam automaticamente uma aposta inicial obrigatória chamada <strong>Ante</strong>. O somatório de todas as Antes forma o <strong>Pote</strong> da mesa.</p>
        </div>

        <h4>3. A Rodada</h4>
        <ul>
          <li><strong>Cartas:</strong> Cada jogador recebe 2 cartas viradas para baixo (fechadas).</li>
          <li><strong>Decisão:</strong> Na sua vez, você tem um tempo limite (20 segundos) para tomar uma atitude. Você pode <strong>Apostar</strong> um valor (até o limite máximo do Pote) ou <strong>Pular</strong> (desistir da mão sem gastar mais nada).</li>
          <li><strong>A Revelação:</strong> Se você apostar, 1 carta comunitária é virada no centro da mesa. O sistema avalia automaticamente se a sua combinação de cartas vence a da mesa.</li>
        </ul>

        <h4>4. Pagamentos e Quebra de Pote</h4>
        <p>Se você vencer a mesa, recebe o dobro da sua aposta direto do Pote (descontando o Rake da casa). Se perder, a sua aposta fica presa no Pote, engordando o prêmio para o próximo jogador.</p>
        <ul>
          <li><strong>Pote Quebrado:</strong> Se um jogador ganhar todas as fichas do centro (zerando o Pote), ocorre a "Quebra". O sistema cobrará automaticamente uma nova Ante de todos os jogadores para recomeçar o jogo.</li>
        </ul>
      </div>

      <div v-if="activeTab === 'cacheta'" class="document-text fade-in">
        <h3>Como Jogar: Cacheta</h3>
        <p class="last-updated">Formação de Jogos e Batida</p>

        <h4>1. O Objetivo</h4>
        <p>A Cacheta é um jogo clássico de baralho onde o objetivo é ser o primeiro jogador a formar combinações válidas com todas as suas cartas e "bater", esvaziando a sua mão.</p>

        <h4>2. Combinações Válidas (Jogos)</h4>
        <p>Para bater, você precisa organizar suas cartas em grupos de no mínimo 3 cartas. As combinações aceitas são:</p>
        <ul>
          <li><strong>Trincas ou Quadras:</strong> Cartas do mesmo valor, porém de <strong>naipes diferentes</strong> (Ex: 7 de Copas, 7 de Espadas, 7 de Ouros).</li>
          <li><strong>Sequências:</strong> Cartas com valores em ordem numérica, obrigatoriamente do <strong>mesmo naipe</strong> (Ex: 4, 5 e 6 de Paus).</li>
        </ul>

        <div class="highlight-box alert">
          <h4>3. O Curinga</h4>
          <p>No início de cada rodada, uma carta é virada do baralho. A carta imediatamente superior a ela, do mesmo naipe ou cor (dependendo da regra da mesa), torna-se o <strong>Curinga</strong>. O Curinga pode substituir qualquer carta para ajudar a formar os seus jogos.</p>
        </div>

        <h4>4. A Dinâmica do Jogo</h4>
        <ul>
          <li>Cada jogador recebe <strong>9 cartas</strong>.</li>
          <li>Na sua vez, você deve obrigatoriamente <strong>comprar uma carta</strong> (do monte fechado ou a última jogada no lixo) e <strong>descartar uma carta</strong>.</li>
          <li>O jogo prossegue até que um jogador consiga encaixar suas 9 cartas em jogos perfeitos e compre uma 10ª carta que também se encaixe (ou sirva de descarte para finalizar a mão). Isso é chamado de <strong>Batida</strong>.</li>
        </ul>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const activeTab = ref('meinho');
const contentBox = ref<HTMLElement | null>(null);

onMounted(() => {
  window.scrollTo(0, 0);
  if (contentBox.value) {
    contentBox.value.scrollTop = 0;
  }
});

watch(activeTab, () => {
  if (contentBox.value) {
    contentBox.value.scrollTop = 0;
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;900&display=swap');

.legal-container {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background-color: #0a0f18;
  color: #fff;
  font-family: 'Montserrat', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #111827;
  border-bottom: 1px solid #1a2639;
  z-index: 10;
}

.btn-voltar {
  background: transparent;
  border: none;
  color: #00f3ff;
  cursor: pointer;
  padding: 5px;
  margin-right: 15px;
  transition: transform 0.2s;
}

.btn-voltar:active {
  transform: scale(0.9);
}

.btn-voltar svg {
  width: 24px;
  height: 24px;
}

.header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  text-transform: uppercase;
  color: #fff;
  letter-spacing: 1px;
}

.tabs {
  display: flex;
  padding: 20px 20px 0 20px;
  gap: 10px;
  flex-shrink: 0;
}

.tabs button {
  flex: 1;
  background: transparent;
  border: none;
  color: #66768f;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  padding: 12px 0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
}

.tabs button.active {
  color: #00f3ff;
  border-bottom: 2px solid #00f3ff;
  text-shadow: 0 0 8px rgba(0, 243, 255, 0.4);
}

.content-box {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.document-text {
  background: #111827;
  border: 1px solid #1a2639;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  line-height: 1.6;
  margin-bottom: 30px;
}

.document-text h3 {
  color: #fff;
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 20px;
}

.last-updated {
  font-size: 12px;
  color: #66768f;
  margin-top: 0;
  margin-bottom: 30px;
}

.document-text h4 {
  color: #3ce48a;
  margin-top: 25px;
  margin-bottom: 10px;
  font-size: 16px;
  border-bottom: 1px solid rgba(60, 228, 138, 0.2);
  padding-bottom: 5px;
}

.document-text p, .document-text li {
  font-size: 14px;
  color: #b0c4de;
}

.document-text ul {
  padding-left: 20px;
  margin-bottom: 20px;
}

.document-text li {
  margin-bottom: 8px;
  color: #b0c4de;
}

.document-text strong {
  color: #fff;
}

.highlight-box {
  border-radius: 8px;
  padding: 15px;
  margin: 20px 0;
  border-left: 4px solid;
}

.highlight-box h4 {
  margin-top: 0;
  border-bottom: none;
}

.highlight-box.alert {
  background: rgba(231, 76, 60, 0.1);
  border-left-color: #e74c3c;
}

.highlight-box.alert h4 {
  color: #e74c3c;
}

.highlight-box.alert p {
  color: #fbd3d3;
}

.highlight-box.info {
  background: rgba(0, 243, 255, 0.1);
  border-left-color: #00f3ff;
}

.highlight-box.info h4 {
  color: #00f3ff;
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
</style>