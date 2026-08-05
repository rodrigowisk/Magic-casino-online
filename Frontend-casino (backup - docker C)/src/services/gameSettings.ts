import { ref, watch } from 'vue';

// Tenta recuperar as configurações salvas pelo Diretor no dispositivo
const savedConfig = localStorage.getItem('magic_games_config');

// Configuração Padrão: Meinho ATIVADO e Cacheta DESATIVADA (como você pediu)
const defaultConfig = {
  meinho: true,
  cacheta: false 
};

// Variável reativa global. Onde quer que ela seja importada, vai atualizar o visual.
export const activeGames = ref(savedConfig ? JSON.parse(savedConfig) : defaultConfig);

// Fica a "ouvir": Se o Diretor mudar alguma coisa, guarda automaticamente no LocalStorage
watch(activeGames, (newVal) => {
  localStorage.setItem('magic_games_config', JSON.stringify(newVal));
}, { deep: true });