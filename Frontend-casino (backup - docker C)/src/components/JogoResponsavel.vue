<template>
  <div class="legal-container">
    <div class="header">
      <button class="btn-voltar" @click="$router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      <h2>Jogo Responsável</h2>
    </div>

    <div class="content-box custom-scrollbar" ref="contentBox">
      
      <div class="document-text fade-in">
        <h3>Práticas de Jogo Saudável</h3>
        <p class="last-updated">Fichas Virtuais e Entretenimento</p>

        <div class="highlight-box info">
          <h4>Apenas Fichas Fictícias</h4>
          <p>O <strong>Magic Casino</strong> é uma plataforma estritamente de entretenimento social. Todo o saldo, fichas e recompensas dentro do aplicativo são <strong>100% fictícios</strong> e não possuem nenhum valor monetário. Não é possível sacar, vender ou trocar fichas por valores financeiros.</p>
        </div>

        <h4>1. O Propósito do Jogo</h4>
        <p>Nosso objetivo é proporcionar um ambiente seguro e divertido para você jogar com amigos. O jogo deve ser visto sempre como uma forma de lazer e interação social, nunca como uma obrigação, uma competição nociva ou uma forma de preencher vazios emocionais.</p>

        <h4>2. Sinais de Alerta (Atenção ao Vício)</h4>
        <p>Mesmo sem envolver valores financeiros, o hábito de jogar jogos virtuais pode se tornar um problema se não houver moderação. Fique atento a estes sinais de alerta:</p>
        <ul>
          <li>Passar mais tempo no aplicativo do que o planejado.</li>
          <li>Negligenciar responsabilidades diárias, como trabalho, estudos ou convívio familiar.</li>
          <li>Sentir irritabilidade, ansiedade ou frustração quando não está jogando ou quando não possui fichas.</li>
          <li>Deixar de lado hobbies e outras atividades presenciais para ficar apenas no celular.</li>
        </ul>

        <div class="highlight-box alert">
          <h4>3. Proteja sua Saúde Mental</h4>
          <p>O vício em jogos (mesmo os fictícios) afeta o sistema de recompensas do cérebro. Se você perceber que a vontade de jogar está afetando seu humor, sua rotina de sono ou suas relações pessoais, o melhor passo é se afastar imediatamente.</p>
        </div>

        <h4>4. Dicas para Manter o Controle</h4>
        <ul>
          <li><strong>Defina limites de tempo:</strong> Decida antecipadamente quanto tempo você vai jogar por dia e respeite esse limite rigidamente.</li>
          <li><strong>Faça pausas regulares:</strong> A cada 45 minutos olhando para a tela, levante-se, beba água e descanse a visão.</li>
          <li><strong>Não jogue para fugir de problemas:</strong> O jogo não resolve estresse ou ansiedade do dia a dia. Procure atividades físicas ou converse com pessoas de confiança.</li>
          <li><strong>Sua vida pessoal vem primeiro:</strong> Suas relações, seu descanso e suas obrigações devem ser sempre a prioridade número um.</li>
        </ul>

        <h4>5. Precisa de uma Pausa?</h4>
        <p>Se você sentir que está perdendo o controle do tempo gasto no aplicativo, encorajamos fortemente que desinstale o app temporariamente ou solicite à administração o bloqueio do seu acesso por um período (Autoexclusão). A sua saúde está acima de qualquer jogo.</p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const contentBox = ref<HTMLElement | null>(null);

onMounted(() => {
  window.scrollTo(0, 0);
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
  color: #22c55e; /* Usando o verde para remeter à saúde/jogo responsável */
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
  color: #22c55e;
  margin-top: 25px;
  margin-bottom: 10px;
  font-size: 16px;
  border-bottom: 1px solid rgba(34, 197, 94, 0.2);
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