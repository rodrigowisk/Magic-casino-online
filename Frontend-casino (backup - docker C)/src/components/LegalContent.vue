<template>
  <div class="legal-text-wrapper">
    <div v-if="tab === 'termos'" class="fade-in">
      <h3>Termos e Condições de Uso - Magic Casino</h3>
      <p class="last-updated">Última atualização: Abril de 2026</p>

      <h4>1. Aceitação dos Termos</h4>
      <p>Ao acessar e utilizar o aplicativo/site <strong>Magic Casino</strong>, você concorda expressamente com estes Termos de Uso. Se você não concorda com qualquer parte destes termos, não deve utilizar nossa plataforma. O uso é restrito a maiores de 18 anos.</p>

      <div class="highlight-box alert">
        <h4>2. Natureza Estritamente Recreativa (Fichas Fictícias)</h4>
        <p>O Magic Casino é uma plataforma de entretenimento social. <strong>Todas as fichas, moedas, saldos ou "buy-ins" utilizados neste aplicativo são estritamente FICTÍCIOS e não possuem nenhum valor monetário.</strong></p>
        <ul>
          <li>É terminantemente <strong>proibido</strong> o saque, resgate ou conversão de fichas virtuais por valores financeiros, bens ou serviços de qualquer natureza.</li>
          <li>A plataforma não é um site de apostas (gambling) e não oferece prêmios financeiros.</li>
        </ul>
      </div>

      <h4>3. Proibição de Comercialização e Coluio</h4>
      <p>A economia do jogo é fechada e virtual. Para manter a integridade da diversão, as seguintes ações constituem violação grave destes termos:</p>
      <ul>
        <li><strong>Comercialização:</strong> Vender, comprar, trocar ou transferir fichas virtuais fora das mecânicas oficiais do jogo por valores financeiros.</li>
        <li><strong>Coluio (Chip Dumping):</strong> Perder propositalmente para transferir fichas para outro jogador na mesa.</li>
        <li><strong>Fraude:</strong> Utilizar softwares de terceiros, bots, scripts ou explorar falhas (bugs) no sistema para obter vantagem injusta.</li>
      </ul>

      <h4>4. Penalidades e Banimento</h4>
      <p>O Magic Casino monitora ativamente todas as mesas de jogo, a constatação de fraude, coluio, venda de fichas ou qualquer comportamento malicioso resultará no <strong>BANIMENTO PERMANENTE</strong> da conta do usuário, perda de todo o saldo virtual e bloqueio do IP/Dispositivo, sem aviso prévio ou direito a recurso.</p>

      <h4>5. Contas de Usuário</h4>
      <p>Cada jogador tem direito a apenas uma conta. O usuário é o único responsável por manter a confidencialidade de suas credenciais de acesso (login e senha).</p>

      <div class="highlight-box alert">
        <h4>6. Aviso de Cassino Social</h4>
        <p>Este aplicativo é destinado exclusivamente ao público adulto (maiores de 18 anos) apenas para fins de diversão. <strong>A prática ou o sucesso em jogos de cassino social não implica sucesso futuro em jogos de azar envolvendo valores financeiros.</strong></p>
      </div>

      <h4>7. Isenção de Vínculo com Lojas de Aplicativos</h4>
      <p>A Apple Inc., a Google LLC e suas afiliadas <strong>não são patrocinadoras</strong>, não endossam e não têm qualquer tipo de envolvimento com o Magic Casino, suas mesas, mecânicas ou qualquer evento promovido dentro deste aplicativo.</p>

      <h4>8. Compras e Bens Virtuais</h4>
      <p>Caso o usuário adquira pacotes de fichas virtuais através das lojas oficiais (App Store ou Google Play), ele reconhece que está adquirindo uma licença de uso limitada, revogável e não transferível para uso exclusivo dentro do Magic Casino. <strong>Todas as compras de bens virtuais são finais e não reembolsáveis.</strong> Em nenhuma hipótese essas fichas poderão ser trocadas por valores financeiros, bens ou serviços de qualquer natureza.</p>

      <h4>9. Encerramento e Exclusão de Dados</h4>
      <p>O usuário pode solicitar a exclusão de sua conta e de todos os seus dados a qualquer momento através do menu de configurações do aplicativo. Ao confirmar a exclusão, todo o histórico, progresso e saldo de fichas virtuais serão apagados permanentemente e não poderão ser recuperados.</p>
    </div>

    <div v-if="tab === 'privacidade'" class="fade-in">
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
        <li>Processar a lógica dos jogos simultaneamente.</li>
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
</template>

<script setup lang="ts">
defineProps<{
  tab: string; // 'termos' ou 'privacidade'
}>();
</script>

<style scoped>
.legal-text-wrapper {
  text-align: left;
}

.legal-text-wrapper h3 { font-size: 16px; color: #fff; margin-top: 0; margin-bottom: 5px; }
.legal-text-wrapper .last-updated { font-size: 11px; color: #6b7280; margin-top: 0; margin-bottom: 20px; }
.legal-text-wrapper h4 { color: #a855f7; font-size: 14px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid rgba(168, 85, 247, 0.2); padding-bottom: 5px; }
.legal-text-wrapper p, .legal-text-wrapper li { font-size: 12px; color: #d1d5db; line-height: 1.5; margin-bottom: 10px; }
.legal-text-wrapper ul { padding-left: 20px; margin-bottom: 15px; }

/* Caixas de destaque dentro dos Termos */
.highlight-box { border-radius: 8px; padding: 12px; margin: 15px 0; border-left: 3px solid; }
.highlight-box h4 { margin-top: 0; border-bottom: none; }
.highlight-box.alert { background: rgba(239, 68, 68, 0.1); border-left-color: #ef4444; }
.highlight-box.alert h4 { color: #ef4444; }
.highlight-box.alert p, .highlight-box.alert li { color: #fecaca; }
.highlight-box.info { background: rgba(59, 130, 246, 0.1); border-left-color: #3b82f6; }
.highlight-box.info h4 { color: #3b82f6; }

.fade-in { animation: fadeIn 0.3s ease-out; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>