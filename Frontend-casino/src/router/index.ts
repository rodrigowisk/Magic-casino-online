import { createRouter, createWebHistory } from 'vue-router';

// Importando as telas existentes
import Login from '../views/Login.vue';
import Cadastro from '../views/Cadastro.vue';
import Lobby from '../views/Meinho/Lobby.vue';
import CreateTable from '../views/Meinho/CreateTable.vue';
import MeinhoTable from '../Games/MeinhoTable.vue';

// --- TELAS DA CACHETA ---
import LobbyCacheta from '../views/Cacheta/Lobby.vue'; 
import CreateTableCacheta from '../views/Cacheta/CreateTable.vue';
import CachetaTable from '../Games/Cacheta/CachetaTable.vue';

// Importando as novas telas do Menu Inferior
import Caixa from '../views/Caixa.vue';
import Perfil from '../views/Perfil.vue';
import Configuracoes from '../views/Configuracoes.vue';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/cadastro', name: 'Cadastro', component: Cadastro },
  { path: '/lobby', name: 'Lobby', component: Lobby },
  { path: '/mesa/:id', name: 'Mesa', component: MeinhoTable },
  { path: '/criar-mesa', name: 'CreateTable', component: CreateTable },

  { path: '/lobby-cacheta', name: 'LobbyCacheta', component: LobbyCacheta },
  { path: '/mesa-cacheta/:id', name: 'MesaCacheta', component: CachetaTable },
  { path: '/criar-mesa-cacheta', name: 'CreateTableCacheta', component: CreateTableCacheta },
  
  // Rotas do Menu Inferior
  { path: '/caixa', name: 'Caixa', component: Caixa },
  { path: '/perfil', name: 'Perfil', component: Perfil },
  { path: '/configuracoes', name: 'Configuracoes', component: Configuracoes },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;