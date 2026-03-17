import { createApp } from 'vue';
import './style.css'; // Seu CSS global
import App from './App.vue';
import router from './router'; // Importando o maestro de rotas

const app = createApp(App);

// Avisa o Vue para usar as rotas antes de montar o app
app.use(router);

app.mount('#app');