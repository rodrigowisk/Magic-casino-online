import { createApp } from 'vue';
import './style.css'; // Seu CSS global
import App from './App.vue';
import router from './router'; // Importando o maestro de rotas

// 👇 GUARDA DE TRÂNSITO GLOBAL (INTERCEPTOR DE FETCH) 👇
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    
    // Se o servidor devolver 401 (Não Autorizado / Token Expirado)
    if (response.status === 401) {
        console.warn("Token expirado! Redirecionando para o login...");
        
        // Limpa a "sujeira" do local storage
        localStorage.removeItem('magic_token');
        localStorage.removeItem('magic_username');
        localStorage.removeItem('magic_userid');
        localStorage.removeItem('magic_avatar');
        
        // Redireciona o usuário imediatamente para o login
        window.location.href = '/login'; 
    }
    
    return response;
};
// 👆 FIM DO GUARDA DE TRÂNSITO 👆

const app = createApp(App);

// Avisa o Vue para usar as rotas antes de montar o app
app.use(router);

app.mount('#app');