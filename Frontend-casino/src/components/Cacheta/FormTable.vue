<template>
  <div class="screen-wrapper">
    <div class="create-box">
      <div class="header-area">
        <button class="btn-back" @click="voltar">← Voltar ao Lobby</button>
        <h2>Nova Mesa de Cacheta</h2>
      </div>

      <form @submit.prevent="criarMesa" class="create-form">
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <div class="input-group">
          <label>Nome da Mesa</label>
          <input type="text" v-model="form.name" placeholder="Ex: Cacheta dos Amigos" required />
        </div>

        <div class="input-group dual-group">
          <div class="half-group">
            <label>Valor do Ante (R$)</label>
            <input type="number" v-model.number="form.ante" required />
          </div>
          <div class="half-group">
            <label>Cacife Mínimo (R$)</label>
            <input type="number" v-model.number="form.minBuyIn" required />
          </div>
        </div>

        <div class="input-group dual-group">
          <div class="half-group">
            <label>Rake (Comissão %)</label>
            <input type="number" v-model.number="form.rake" min="0" max="100" required />
          </div>
          <div class="half-group">
            <label>Duração da Mesa</label>
            <select v-model.number="form.durationHours" class="custom-select">
              <option value="12">12 Horas</option>
              <option value="24">24 Horas</option>
              <option value="48">48 Horas</option>
            </select>
          </div>
        </div>

        <div class="input-group">
          <label>Máximo de Jogadores (2 - 6)</label>
          <input type="range" min="2" max="6" v-model.number="form.maxPlayers" class="range-slider" />
          <div class="range-value">{{ form.maxPlayers }} Jogadores</div>
        </div>

        <div class="input-group">
          <label>Senha da Mesa <span class="optional">(Opcional)</span></label>
          <input type="password" v-model="form.password" placeholder="Deixe vazio para mesa pública" />
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? 'CRIANDO...' : 'CRIAR E ENTRAR' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const form = reactive({
  name: '',
  ante: 10,
  minBuyIn: 100, 
  durationHours: 12, 
  maxPlayers: 6,
  rake: 5,
  password: ''
});

const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const criarMesa = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const token = localStorage.getItem('magic_token');

    if (!token) {
      errorMessage.value = 'Você precisa estar autenticado para criar uma mesa.';
      isLoading.value = false;
      return;
    }

    const CACHETA_API_URL = import.meta.env.VITE_CACHETA_API_URL || 'http://localhost:5003';

    const payload = {
        name: form.name,
        ante: form.ante,
        minBuyIn: form.minBuyIn,
        durationHours: form.durationHours,
        maxPlayers: form.maxPlayers,
        rake: form.rake, 
        password: form.password,
        gameType: "cacheta"
    };

    const response = await fetch(`${CACHETA_API_URL}/api/table`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text(); 
      console.error("❌ ERRO COMPLETO DO SERVIDOR:", errorText);
      
      if (response.status === 502) {
         throw new Error("Erro 502: O Nginx não está redirecionando para a porta 5003.");
      }
      if (response.status === 404) {
         throw new Error("Erro 404: Rota /api/table não encontrada. Nginx ou API offline.");
      }
      
      try {
         const errorData = JSON.parse(errorText);
         throw new Error(errorData.title || errorData.message || `Erro HTTP ${response.status}`);
      } catch(e) {
         throw new Error(`Falha no Servidor (${response.status}). Veja o Console (F12).`);
      }
    }

    const data = await response.json();
    successMessage.value = 'Mesa criada com sucesso! A redirecionar...';

    setTimeout(() => {
      router.push(`/mesa-cacheta/${data.tableId}`);
    }, 1500);

  } catch (error: any) {
    errorMessage.value = error.message || 'Erro de conexão com o servidor.';
  } finally {
    isLoading.value = false;
  }
};

const voltar = () => {
  // Agora navega de volta ao lobby por ser uma rota
  router.push('/lobby');
};
</script>

<style scoped>
.screen-wrapper {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #0a0f18; /* Removido o transparente para atuar como página própria */
  background-image: radial-gradient(circle at 50% 50%, #151e32 0%, #0a0f18 100%);
  font-family: Arial, sans-serif;
  padding: 20px;
  box-sizing: border-box;
}

.create-box {
  width: 100%;
  max-width: 450px;
  background: rgba(10, 15, 24, 0.95);
  border: 2px solid #f1c40f; 
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
}

.header-area {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 30px;
}

.header-area h2 {
  color: #fff;
  margin: 0;
  font-size: 20px;
}

.btn-back {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-weight: bold;
}

.btn-back:hover {
  color: #fff;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dual-group {
  flex-direction: row !important;
  gap: 15px;
}

.half-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label, .half-group label {
  color: #f1c40f;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.input-group input[type="text"],
.input-group input[type="number"],
.input-group input[type="password"],
.half-group input[type="number"],
.custom-select {
  background: #111;
  border: 1px solid #444;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.range-slider {
  accent-color: #f1c40f;
  cursor: pointer;
}

.range-value {
  text-align: center;
  color: #fff;
  font-weight: bold;
  font-size: 14px;
}

.optional {
  color: #666;
  font-size: 10px;
  text-transform: none;
}

.btn-primary {
  background: linear-gradient(to bottom, #3ce48a, #26ab65);
  border: 1px solid #124026;
  color: white;
  height: 55px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 18px;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 10px;
  box-shadow: inset 0px 2px 2px rgba(255,255,255,0.25), 0px 4px 6px rgba(0,0,0,0.5);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

.btn-primary:active {
  transform: translateY(3px);
}

.btn-primary:disabled {
  background: #555;
  color: #888;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.error-message {
  background-color: rgba(231, 76, 60, 0.2);
  border: 1px solid #e74c3c;
  color: #ff6b6b;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.success-message {
  background-color: rgba(46, 204, 113, 0.2);
  border: 1px solid #2ecc71;
  color: #2ecc71;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
}
</style>