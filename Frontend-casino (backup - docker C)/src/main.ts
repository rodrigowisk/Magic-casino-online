import { createApp } from 'vue';
import './style.css'; // Seu CSS global
import App from './App.vue';
import router from './router'; // Importando o maestro de rotas
import { authService } from './services/authService';

/**
 * INICIALIZAÇÃO DO APP MAGIC CASINO
 * --------------------------------
 * Removido o interceptador global de fetch que causava recarregamentos indesejados (401).
 * Agora o controle de sessão e expiração é gerenciado pelo Router e pelo SignalR.
 */

const app = createApp(App);

// Configura o Vue Router antes da montagem
app.use(router);

/**
 * MONITORAMENTO DE SESSÃO ÚNICA (SIGNALR)
 * ---------------------------------------
 * Se o usuário já abrir a aplicação estando autenticado (com token no storage),
 * iniciamos a conexão com o Hub de Sessão para garantir que ele seja derrubado
 * caso realize um novo login em outro dispositivo.
 */
if (authService.isAuthenticated()) {
    authService.startSessionHub().catch(err => {
        console.warn("⚠️ SignalR: Não foi possível iniciar o monitoramento de sessão na inicialização.", err);
    });
}

// Monta a aplicação no elemento #app do index.html
app.mount('#app');