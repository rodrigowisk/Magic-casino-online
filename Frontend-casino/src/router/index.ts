import { createRouter, createWebHistory } from 'vue-router';

// Importando as telas existentes
import Login from '../views/Login.vue';
import Cadastro from '../views/Cadastro.vue';

// 🔥 NOSSO LOBBY GLOBAL 🔥
import Lobby from '../views/Lobby.vue';

// --- NOVA PÁGINA DE VER TODOS (MEINHO) ---
import LobbyMeinho from '../views/Meinho/LobbyMeinho.vue';

// --- TELAS DO MEINHO ---
// Mantendo a correção para apontar para a pasta 'components'
import CreateTable from '../components/Meinho/FormTable.vue';
import MeinhoTable from '../Games/MeinhoTable.vue';

// 👇 IMPORT DA NOSSA NOVA MESA DEV 👇
import MeinhoTableDev from '../Games/MeinhoTableDev.vue';

// --- TELAS DA CACHETA ---
// Mantendo a correção para apontar para a pasta 'components'
import CreateTableCacheta from '../components/Cacheta/FormTable.vue';
import CachetaTable from '../Games/Cacheta/CachetaTable.vue';

// Importando as novas telas do Menu Inferior
import Caixa from '../views/Caixa.vue';
import Perfil from '../views/Perfil.vue';
import Configuracoes from '../views/Configuracoes.vue';

// 👇 NOVA TELA DO AGENTE 👇
import Agente from '../views/AgentPanel.vue';
import OwnerPanel from '../views/OwnerPanel.vue';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/cadastro', name: 'Cadastro', component: Cadastro },
  
  // Rota Única para o Salão de Jogos
  { path: '/lobby', name: 'Lobby', component: Lobby },

  // 🔥 Nova rota para ver todas as mesas de Meinho em grade
  { path: '/lobby-meinho', name: 'LobbyMeinho', component: LobbyMeinho },
  
  // Rotas de Jogo (Meinho)
  { path: '/mesa/:id', name: 'Mesa', component: MeinhoTable },
  { path: '/criar-mesa', name: 'CreateTable', component: CreateTable },

  // 👇 NOVA ROTA DEV COM PARÂMETRO OPCIONAL (O "?" É A MÁGICA) 👇
  { path: '/meinhoDEV/:id?', name: 'MeinhoDev', component: MeinhoTableDev },

  // Rotas de Jogo (Cacheta)
  { path: '/mesa-cacheta/:id', name: 'MesaCacheta', component: CachetaTable },
  { path: '/criar-mesa-cacheta', name: 'CreateTableCacheta', component: CreateTableCacheta },
  
  // Rotas do Menu Inferior
  { path: '/caixa', name: 'Caixa', component: Caixa },
  { path: '/perfil', name: 'Perfil', component: Perfil },
  { path: '/configuracoes', name: 'Configuracoes', component: Configuracoes },
  
  // 👇 Nova Rota do Agente 👇
  { path: '/agente', name: 'Agente', component: Agente },
  { path: '/admin', name: 'OwnerPanel', component: OwnerPanel },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;