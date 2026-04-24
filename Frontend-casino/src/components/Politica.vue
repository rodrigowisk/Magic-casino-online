<template>
  <div class="legal-container">
    <div class="header">
      <button class="btn-voltar" @click="$router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      <h2>Documentos Legais</h2>
    </div>

    <div class="tabs">
      <button :class="{ active: activeTab === 'termos' }" @click="activeTab = 'termos'">Termos de Uso</button>
      <button :class="{ active: activeTab === 'privacidade' }" @click="activeTab = 'privacidade'">Privacidade</button>
    </div>

    <div class="content-box custom-scrollbar" ref="contentBox">
      
      <div v-if="activeTab === 'termos'" class="document-text fade-in">
        <h3>Termos e Condições de Uso - Magic Casino</h3>
        <p class="last-updated">Última atualização: Abril de 2026</p>

        <h4>1. Aceitação dos Termos</h4>
        <p>Ao acessar e utilizar o aplicativo/site <strong>Magic Casino</strong>, você concorda expressamente com estes Termos de Uso. Se você não concorda com qualquer parte destes termos, não deve utilizar nossa plataforma. O uso é restrito a maiores de 18 anos.</p>

        <div class="highlight-box alert">
          <h4>2. Natureza Estritamente Recreativa (Fichas Fictícias)</h4>
          <p>O Magic Casino é uma plataforma de entretenimento social. <strong>Todas as fichas, moedas, saldos ou "buy-ins" utilizados neste aplicativo são estritamente FICTÍCIOS e não possuem nenhum valor monetário real.</strong></p>
          <ul>
            <li>É terminantemente <strong>proibido</strong> o saque, resgate ou conversão de fichas virtuais por dinheiro real, bens ou serviços de qualquer natureza.</li>
            <li>A plataforma não é um site de apostas reais (gambling) e não oferece prêmios em dinheiro.</li>
          </ul>
        </div>

        <h4>3. Proibição de Comercialização e Coluio</h4>
        <p>A economia do jogo é fechada e virtual. Para manter a integridade da diversão, as seguintes ações constituem violação grave destes termos:</p>
        <ul>
          <li><strong>Comercialização:</strong> Vender, comprar, trocar ou transferir fichas virtuais fora das mecânicas oficiais do jogo por dinheiro real.</li>
          <li><strong>Coluio (Chip Dumping):</strong> Perder propositalmente para transferir fichas para outro jogador na mesa.</li>
          <li><strong>Fraude:</strong> Utilizar softwares de terceiros, bots, scripts ou explorar falhas (bugs) no sistema para obter vantagem injusta.</li>
        </ul>

        <h4>4. Penalidades e Banimento</h4>
        <p>O Magic Casino monitora ativamente todas as mesas de jogo, a constatação de fraude, coluio, venda de fichas ou qualquer comportamento malicioso resultará no <strong>BANIMENTO PERMANENTE</strong> da conta do usuário, perda de todo o saldo virtual e bloqueio do IP/Dispositivo, sem aviso prévio ou direito a recurso.</p>

        <h4>5. Contas de Usuário</h4>
        <p>Cada jogador tem direito a apenas uma conta. O usuário é o único responsável por manter a confidencialidade de suas credenciais de acesso (login e senha).</p>

        <div class="highlight-box alert">
          <h4>6. Aviso de Cassino Social (Social Casino Disclaimer)</h4>
          <p>Este aplicativo é destinado exclusivamente ao público adulto (maiores de 18 anos) apenas para fins de diversão. <strong>A prática ou o sucesso em jogos de cassino social não implica sucesso futuro em jogos de azar com dinheiro real.</strong></p>
        </div>

        <h4>7. Isenção de Vínculo com Lojas de Aplicativos</h4>
        <p>A Apple Inc., a Google LLC e suas afiliadas <strong>não são patrocinadoras</strong>, não endossam e não têm qualquer tipo de envolvimento com o Magic Casino, suas mesas, mecânicas ou qualquer evento promovido dentro deste aplicativo.</p>

        <h4>8. Compras e Bens Virtuais</h4>
        <p>Caso o usuário adquira pacotes de fichas virtuais através das lojas oficiais (App Store ou Google Play), ele reconhece que está adquirindo uma licença de uso limitada, revogável e não transferível para uso exclusivo dentro do Magic Casino. <strong>Todas as compras de bens virtuais são finais e não reembolsáveis.</strong> Em nenhuma hipótese essas fichas poderão ser trocadas por dinheiro, bens ou serviços reais.</p>

        <h4>9. Encerramento e Exclusão de Dados</h4>
        <p>O usuário pode solicitar a exclusão de sua conta e de todos os seus dados a qualquer momento através do menu de configurações do aplicativo. Ao confirmar a exclusão, todo o histórico, progresso e saldo de fichas virtuais serão apagados permanentemente e não poderão ser recuperados.</p>
      </div>

      <div v-if="activeTab === 'privacidade'" class="document-text fade-in">
        <h3>Política de Privacidade - Magic Casino</h3>
        <p class="last-updated">Última atualização: Abril de 2026</p>

        <h4>1. Coleta de Dados</h4>
        <p>Para garantir o funcionamento da plataforma, o Magic Casino coleta as seguintes informações:</p>
        <ul>
          <li><strong>Dados de Cadastro:</strong> Nome de usuário, endereço de e-mail e número de telefone (se fornecido).</li>
          <li><strong>Dados de Jogo:</strong> Histórico de mãos, saldo de fichas virtuais, tempo de conexão e interação nas mesas.</li>
          <li><strong>Dados de Dispositivo:</strong> Endereço IP, tipo de navegador e dados de diagnóstico para prevenção de fraudes.</li>
        </ul>

        <h4>2. Uso das Informações</h4>
        <p>Utilizamos seus dados estritamente para:</p>
        <ul>
          <li>Autenticar seu acesso à plataforma (via tokens de segurança).</li>
          <li>Processar a lógica dos jogos em tempo real.</li>
          <li>Monitorar e auditar as partidas para identificar fraudes, bots ou coluio (chip dumping).</li>
          <li>Melhorar a estabilidade do sistema e corrigir falhas.</li>
        </ul>

        <div class="highlight-box info">
          <h4>3. Compartilhamento de Dados</h4>
          <p>O Magic Casino <strong>não vende, aluga ou comercializa</strong> seus dados pessoais para terceiros. Suas informações são compartilhadas apenas quando estritamente necessário para o funcionamento da infraestrutura (como provedores de hospedagem em nuvem) ou mediante solicitação de autoridades legais.</p>
        </div>

        <h4>4. Segurança da Informação</h4>
        <p>Empregamos padrões rigorosos de segurança no setor (criptografia de senhas, conexões WSS seguras via Cloudflare e protocolos JWT) para proteger suas informações contra acessos não autorizados. No entanto, o usuário também deve zelar por sua senha e evitar compartilhá-la.</p>

        <h4>5. Exclusão de Conta</h4>
        <p>Você tem o direito de solicitar a exclusão definitiva da sua conta e de seus dados pessoais a qualquer momento. Ao excluir a conta, todo o progresso e saldo de fichas fictícias serão perdidos permanentemente.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const activeTab = ref('termos');
const contentBox = ref<HTMLElement | null>(null);

// Força a tela a começar do topo ao abrir a página
onMounted(() => {
  window.scrollTo(0, 0);
  if (contentBox.value) {
    contentBox.value.scrollTop = 0;
  }
});

// Quando o usuário trocar de aba (Termos <-> Privacidade), volta pro topo automaticamente
watch(activeTab, () => {
  if (contentBox.value) {
    contentBox.value.scrollTop = 0;
  }
});
</script>

<style scoped>
.legal-container {
  width: 100vw;
  height: 100vh;
  height: 100dvh; /* 🔥 A MÁGICA: Usa a altura real da tela do celular tirando as barras de navegação */
  background-color: #0a0f18;
  color: #fff;
  font-family: 'Montserrat', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 🔥 Impede que a tela inteira role, travando o cabeçalho no lugar */
}

.header {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #111827; /* Fundo sólido para o texto não vazar por trás */
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

/* 🔥 AQUI FICA A ROLAGEM ISOLADA 🔥 */
.content-box {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  scroll-behavior: smooth; /* Deixa a rolagem macia */
}

.document-text {
  background: #111827;
  border: 1px solid #1a2639;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  line-height: 1.6;
  margin-bottom: 30px; /* Espaço em branco no final para não colar no rodapé do celular */
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
}

/* Caixas de destaque */
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

.highlight-box.alert p, .highlight-box.alert li {
  color: #fbd3d3;
}

.highlight-box.info {
  background: rgba(0, 243, 255, 0.1);
  border-left-color: #00f3ff;
}

.highlight-box.info h4 {
  color: #00f3ff;
}

/* Animação suave ao trocar de aba */
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Estilo da barra de rolagem (Fica bonito também no PC) */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
</style>