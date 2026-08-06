<template>
  <div class="main-layout">
    <Header />
    
    <main class="content-area profile-bg">
      <div class="profile-container">
        
        <div class="profile-header">
          <div class="header-left">
            <button @click="voltar" class="btn-back-profile group">
              <div class="btn-back-glow group-hover:opacity-100"></div>
              <svg class="icon-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
              </svg>
            </button>

            <div class="title-block">
              <div class="title-glow"></div>
              <h1 class="page-title">
                <svg class="icon-title text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
                </svg>
                Minha Conta
              </h1>
              <p class="subtitle">Gerencie seus dados e segurança.</p>
            </div>
          </div>
          
          <div class="header-right">
            <div class="status-text">
              <p class="status-label">Cargo</p>
              <p class="status-value" :class="roleStyle.textColor">{{ roleStyle.label }}</p>
            </div>
            <div class="role-icon-wrapper drop-shadow" :class="roleStyle.textColor">
              <svg v-if="form.role === 'Diretor'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="role-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
              <svg v-else-if="form.role === 'Agente VIP'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="role-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="role-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Carregando perfil...</p>
        </div>

        <div v-else class="profile-grid animate-fade-in-up">
          
          <div class="left-col">
            
            <div class="card-box relative group overflow-hidden">
              <div class="card-bg-gradient transition-colors" :class="roleStyle.bgGradient"></div>
              
              <div class="avatar-section">
                <div class="avatar-wrapper transition-transform" @click="showAvatarModal = true">
                  <div class="avatar-border transition-all" :class="roleStyle.borderColor">
                    <div class="avatar-inner">
                      <img :src="getAvatarUrl(form.avatar)" class="avatar-img" @error="handleImageError" />
                      <div class="avatar-overlay transition-opacity">
                        <svg class="icon-camera text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="user-info">
                  <h2 class="user-name">{{ form.name || form.userName }}</h2>
                  <p class="user-tag text-green">@{{ form.userName }}</p>
                  
                  <div class="level-pill">
                    <span class="level-text" :class="roleStyle.textColor">{{ roleStyle.label }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-box p-4">
              <h3 class="card-title">
                <svg class="icon-sm text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
                </svg>
                Status da Conta
              </h3>
              <ul class="status-list">
                <li class="status-item">
                  <div class="status-left">
                    <svg v-if="form.emailVerified" class="icon-xs text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <svg v-else class="icon-xs text-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                    <span :class="form.emailVerified ? 'text-gray-light' : 'text-yellow-light'">E-mail</span>
                  </div>
                  <span class="badge" :class="form.emailVerified ? 'badge-green' : 'badge-yellow'">
                    {{ form.emailVerified ? 'Verificado' : 'Pendente' }}
                  </span>
                </li>
                <li class="status-item">
                  <div class="status-left">
                    <svg class="icon-xs text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span class="text-gray-light">CPF</span>
                  </div>
                  <span class="badge badge-green">Vinculado</span>
                </li>
              </ul>
              <div v-if="!form.emailVerified" class="warning-box">
                <p><strong>Atenção:</strong> Verifique seu e-mail para garantir a segurança da conta.</p>
              </div>
            </div>
          </div>

          <div class="right-col relative">
            <div class="card-box flex-col-full">
              
              <div class="tabs-header">
                <button @click="activeTab = 'personal'" class="tab-btn" :class="activeTab === 'personal' ? 'active' : ''">
                  <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Dados
                </button>
                <button @click="activeTab = 'security'" class="tab-btn" :class="activeTab === 'security' ? 'active' : ''">
                  <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>
                  Senha
                </button>
              </div>

              <div class="tabs-body">
                <form v-if="activeTab === 'personal'" @submit.prevent="updateProfile" class="form-wrapper animate-fade-in">
                  <div class="form-content">
                    <div class="grid-2-cols">
                      <div class="input-group opacity-70">
                        <label>Usuário</label>
                        <div class="input-icon-wrapper">
                          <svg class="icon-input text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>
                          <input type="text" v-model="form.userName" class="input-field font-bold cursor-not-allowed" disabled />
                          <svg class="icon-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                      </div>
                      <div class="input-group opacity-70">
                        <label>CPF</label>
                        <div class="input-icon-wrapper">
                          <svg class="icon-input text-gray" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                          <input type="text" v-model="form.cpf" class="input-field font-mono cursor-not-allowed" disabled />
                          <svg class="icon-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                      </div>
                    </div>
                    
                    <div class="input-group mt-3">
                      <label>Nome Completo</label>
                      <div class="input-icon-wrapper">
                        <svg class="icon-input text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <input type="text" v-model="form.name" class="input-field" placeholder="Seu nome completo" />
                      </div>
                    </div>

                    <div class="grid-2-cols mt-3">
                      <div class="input-group">
                        <label>E-mail</label>
                        <div class="input-icon-wrapper">
                          <svg class="icon-input text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                          <input type="email" v-model="form.email" class="input-field" placeholder="seu@email.com" />
                        </div>
                      </div>
                      <div class="input-group">
                        <label>Celular</label>
                        <div class="input-icon-wrapper">
                          <svg class="icon-input text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          <input type="text" v-model="form.phone" class="input-field" placeholder="(00) 00000-0000" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="form-footer">
                    <span class="required-note">* Campos obrigatórios</span>
                    <button type="submit" :disabled="saving" class="btn-save bg-green">
                      <span v-if="saving" class="spinner-small"></span>
                      <svg v-else class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      {{ saving ? 'Salvando...' : 'Salvar Alterações' }}
                    </button>
                  </div>
                </form>

                <form v-if="activeTab === 'security'" @submit.prevent="changePassword" class="form-wrapper animate-fade-in">
                  <div class="form-content">
                    <div class="security-tip">
                      <svg class="icon-sm text-blue mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                      <div>
                        <h4>Dica de Segurança</h4>
                        <p>Use senhas complexas com símbolos e números.</p>
                      </div>
                    </div>

                    <div class="input-group mt-3">
                      <label>Senha Atual</label>
                      <div class="input-icon-wrapper">
                        <svg class="icon-input text-gray" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>
                        <input :type="showCurrentPass ? 'text' : 'password'" v-model="passForm.currentPassword" required class="input-field" placeholder="••••••" />
                        <button type="button" @click="showCurrentPass = !showCurrentPass" class="btn-toggle-pass">
                          <svg v-if="!showCurrentPass" class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          <svg v-else class="icon-sm text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                        </button>
                      </div>
                    </div>

                    <div class="grid-2-cols mt-3">
                      <div class="input-group">
                        <label>Nova Senha</label>
                        <div class="input-icon-wrapper">
                          <svg class="icon-input text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <input :type="showNewPass ? 'text' : 'password'" v-model="passForm.newPassword" required class="input-field" placeholder="Nova senha" />
                          <button type="button" @click="showNewPass = !showNewPass" class="btn-toggle-pass">
                            <svg v-if="!showNewPass" class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                            <svg v-else class="icon-sm text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                          </button>
                        </div>
                      </div>
                      <div class="input-group">
                        <label>Confirmar</label>
                        <div class="input-icon-wrapper">
                          <svg class="icon-input text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <input :type="showConfirmPass ? 'text' : 'password'" v-model="passForm.confirmPassword" required class="input-field" placeholder="Repita senha" />
                          <button type="button" @click="showConfirmPass = !showConfirmPass" class="btn-toggle-pass">
                            <svg v-if="!showConfirmPass" class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                            <svg v-else class="icon-sm text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="form-footer flex-end">
                    <button type="submit" :disabled="savingPass" class="btn-save bg-blue">
                      <span v-if="savingPass" class="spinner-small"></span>
                      <svg v-else class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      {{ savingPass ? 'Alterando...' : 'Atualizar Senha' }}
                    </button>
                  </div>
                </form>
              </div>

            </div>

            <transition name="fade">
              <div v-if="notification.show" class="notify-overlay">
                <div class="notify-box animate-scale-in">
                  <svg v-if="notification.type === 'success'" class="icon-xl text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <svg v-if="notification.type === 'warning'" class="icon-xl text-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                  <svg v-if="notification.type === 'error'" class="icon-xl text-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <h3>{{ notification.type === 'success' ? 'Sucesso!' : notification.type === 'error' ? 'Erro' : 'Atenção' }}</h3>
                  <p>{{ notification.message }}</p>
                  <button @click="notification.show = false">Fechar</button>
                </div>
              </div>
            </transition>

          </div>
        </div>

      </div>
    </main>
    <BottomNav />

    <AvatarModal 
      :show="showAvatarModal" 
      :currentAvatar="form.avatar" 
      @close="showAvatarModal = false" 
      @select="selectAvatar" 
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Header from '../components/Header.vue';
import BottomNav from '../components/BottomNav.vue';
import AvatarModal from '../components/AvatarModal.vue';

const router = useRouter();

// ================= ESTADOS GERAIS =================
const IDENTITY_API_URL = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5001';

const loading = ref(true);
const saving = ref(false);
const savingPass = ref(false);

const activeTab = ref<'personal' | 'security'>('personal');
const showCurrentPass = ref(false);
const showNewPass = ref(false);
const showConfirmPass = ref(false);

const notification = ref({ show: false, message: '', type: 'success' as 'success' | 'error' | 'warning' });
const showNotify = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
  notification.value = { show: true, message: msg, type };
  setTimeout(() => { notification.value.show = false; }, 3000);
};

const form = ref({ 
  cpf: '', userName: '', name: '', email: '', phone: '', 
  role: 'Jogador', emailVerified: false, 
  avatar: 'default.webp' 
});

const passForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' });

// ================= SISTEMA DE AVATARES =================
const showAvatarModal = ref(false);

const avatarImages: Record<string, string> = import.meta.glob('../assets/imagens/avatars/**/*.webp', { eager: true, import: 'default' });

const getAvatarUrl = (filename: string) => {
  const safeFilename = filename || 'default.webp';
  const path = `../assets/imagens/avatars/${safeFilename}`;
  return avatarImages[path] || avatarImages['../assets/imagens/avatars/default.webp'];
};

const handleImageError = (e: Event) => {
  (e.target as HTMLImageElement).src = getAvatarUrl('default.webp');
};

const selectAvatar = async (filename: string) => {
  form.value.avatar = filename;
  showAvatarModal.value = false;
  await saveAvatarToBackend(filename);
};

// ================= LÓGICA DE DADOS & API =================
const roleStyle = computed(() => {
  const role = form.value.role;
  if (role === 'Diretor') return { label: 'DIRETOR', textColor: 'text-red', bgGradient: 'bg-grad-red', borderColor: 'border-red' };
  if (role === 'Agente VIP') return { label: 'AGENTE VIP', textColor: 'text-yellow', bgGradient: 'bg-grad-gold', borderColor: 'border-gold' };
  return { label: 'JOGADOR', textColor: 'text-blue', bgGradient: 'bg-grad-blue', borderColor: 'border-blue' };
});

const loadProfile = async () => {
  loading.value = true;
  try {
    const username = localStorage.getItem('magic_username') || 'Jogador';
    const avatar = localStorage.getItem('magic_avatar') || 'default.webp';

    form.value.userName = username;
    form.value.name = username;
    form.value.avatar = avatar;
    form.value.cpf = '***.***.***-**';
    form.value.email = `${username.toLowerCase()}@email.com`;
    form.value.phone = '(00) 00000-0000';
    form.value.emailVerified = true;

    // IDENTIFICA O CARGO AUTOMATICAMENTE
    const rolesStr = localStorage.getItem('magic_roles');
    const roles = rolesStr ? JSON.parse(rolesStr) : [];
    
    if (roles.includes('Owner') || roles.includes('Admin')) {
        form.value.role = 'Diretor';
    } else {
        try {
            const token = localStorage.getItem('magic_token');
            const agentRes = await fetch(`${IDENTITY_API_URL}/api/agent/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (agentRes.ok) {
                form.value.role = 'Agente VIP';
            } else {
                form.value.role = 'Jogador';
            }
        } catch {
            form.value.role = 'Jogador';
        }
    }

  } catch (error) {
    showNotify("Erro ao carregar dados do perfil.", "error");
  } finally {
    loading.value = false;
  }
};

const saveAvatarToBackend = async (filename: string) => {
  try {
    const token = localStorage.getItem('magic_token');
    const response = await fetch(`${IDENTITY_API_URL}/api/auth/avatar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ avatar: filename })
    });

    if (response.ok) {
      localStorage.setItem('magic_avatar', filename);
      showNotify("Avatar atualizado com sucesso!", "success");
      // O header será atualizado caso seja reativo ou se forçarmos via state (Pinia/Vuex no futuro)
    } else {
      throw new Error("Erro ao salvar");
    }
  } catch (error) {
    showNotify("Falha ao salvar a imagem no servidor.", "error");
  }
};

const updateProfile = async () => {
  saving.value = true;
  setTimeout(() => {
    saving.value = false;
    showNotify("Dados atualizados com sucesso!", "success");
  }, 1000);
};

const changePassword = async () => {
  if (passForm.value.newPassword.length < 6) {
    return showNotify("A senha deve ter no mínimo 6 caracteres.", "warning");
  }
  if (passForm.value.newPassword !== passForm.value.confirmPassword) {
    return showNotify("As senhas não coincidem.", "warning");
  }
  
  savingPass.value = true;
  setTimeout(() => {
    savingPass.value = false;
    showNotify("Senha alterada com sucesso!", "success");
    passForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
  }, 1200);
};

const voltar = () => {
  router.push('/lobby');
};

onMounted(() => {
  loadProfile();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;900&display=swap');

/* ========================================================
   CORES GERAIS E LAYOUT BASE
   ======================================================== */
.text-white { color: #ffffff; }
.text-gray { color: #9ca3af; }
.text-gray-light { color: #d1d5db; }
.text-green { color: #22c55e; }
.text-yellow { color: #facc15; }
.text-yellow-light { color: #fef08a; opacity: 0.8; }
.text-blue { color: #60a5fa; }
.text-red { color: #ef4444; }

.font-bold { font-weight: 700; }
.font-mono { font-family: monospace; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.cursor-not-allowed { cursor: not-allowed; }
.mt-3 { margin-top: 12px; }

.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 24px; height: 24px; }
.icon-xl { width: 48px; height: 48px; }
.icon-xs { width: 14px; height: 14px; }
.inline-icon { display: inline-block; vertical-align: middle; }

/* Estrutura Principal */
.main-layout { width: 100vw; height: 100vh; height: 100dvh; display: flex; flex-direction: column; font-family: 'Montserrat', sans-serif; overflow: hidden; background: #000; }
.profile-bg { background-color: #0f212e; } 
.content-area { flex: 1; padding: 20px; overflow-y: auto; box-sizing: border-box; padding-bottom: 90px; display: flex; justify-content: center;}
.profile-container { max-width: 1000px; width: 100%; display: flex; flex-direction: column; gap: 20px;}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #0f212e; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #2c3e50; border-radius: 3px; }

/* Animações */
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-fade-in-up { animation: fadeInUp 0.4s ease-out; }
.animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

/* ========================================================
   CABEÇALHO DO PERFIL
   ======================================================== */
.profile-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 15px;}
.header-left { display: flex; align-items: center; gap: 15px; }

.btn-back-profile { position: relative; padding: 12px; background: #1a2c38; border: 1px solid rgba(55,65,81,0.5); border-radius: 12px; cursor: pointer; transition: 0.3s; overflow: hidden;}
.btn-back-profile:hover { border-color: rgba(34,197,94,0.5); background: #1f364d; box-shadow: 0 0 15px rgba(34,197,94,0.1); }
.icon-back { width: 24px; height: 24px; color: #9ca3af; transition: 0.3s; position: relative; z-index: 2;}
.btn-back-profile:hover .icon-back { color: #4ade80; transform: translateX(-4px); }

.title-block { position: relative; padding-left: 8px;}
.page-title { margin: 0; font-size: 24px; font-weight: 900; color: white; display: flex; align-items: center; gap: 8px; position: relative; z-index: 10;}
.icon-title { width: 28px; height: 28px; }
.subtitle { margin: 2px 0 0 0; font-size: 12px; color: #9ca3af; position: relative; z-index: 10;}

.header-right { display: flex; align-items: center; gap: 12px; }
.status-text { text-align: right; display: none; }
@media (min-width: 768px) { .status-text { display: block; } }
.status-label { margin: 0; font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;}
.status-value { margin: 0; font-size: 14px; font-weight: 900; }
.role-icon-wrapper { width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; }
.role-icon { width: 32px; height: 32px; }
.drop-shadow { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }

/* ========================================================
   GRID PRINCIPAL
   ======================================================== */
.profile-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
@media (min-width: 768px) { .profile-grid { grid-template-columns: 4fr 8fr; } }
.left-col { display: flex; flex-direction: column; gap: 15px; }
.right-col { display: flex; flex-direction: column; }

.card-box { background: #1a2c38; border: 1px solid rgba(55,65,81,0.5); border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
.flex-col-full { flex: 1; display: flex; flex-direction: column; overflow: hidden;}

/* Card do Avatar */
.card-bg-gradient { position: absolute; top: 0; left: 0; width: 100%; height: 90px; opacity: 0.2; pointer-events: none;}
.bg-grad-red { background: linear-gradient(to bottom, #ef4444, transparent); }
.bg-grad-gold { background: linear-gradient(to bottom, #f59e0b, transparent); }
.bg-grad-blue { background: linear-gradient(to bottom, #3b82f6, transparent); }

.avatar-section { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; position: relative; z-index: 10;}

.avatar-wrapper { position: relative; cursor: pointer; transition: 0.3s; }
.avatar-wrapper:hover { transform: scale(1.05); }

/* 🔥 LIMPEZA: Sem fundos azuis estranhos 🔥 */
.avatar-border { width: 96px; height: 96px; border-radius: 50%; padding: 4px; border: 2px solid; background: transparent; }
.border-red { border-color: #ef4444; box-shadow: 0 0 20px rgba(239,68,68,0.2); }
.border-gold { border-color: #f59e0b; box-shadow: 0 0 20px rgba(245,158,11,0.2); }
.border-blue { border-color: #3b82f6; box-shadow: 0 0 20px rgba(59,130,246,0.2); }

.avatar-inner { width: 100%; height: 100%; border-radius: 50%; overflow: hidden; position: relative; display: flex; justify-content: center; align-items: center; background: transparent;}
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

.avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; opacity: 0; border-radius: 50%; transition: 0.3s;}
.avatar-wrapper:hover .avatar-overlay { opacity: 1; }
.icon-camera { width: 24px; height: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }

.user-info { width: 100%; text-align: center; }
.user-name { margin: 0; font-size: 20px; font-weight: 900; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-tag { margin: 0 0 12px 0; font-size: 12px; font-family: monospace; }
.level-pill { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); background: rgba(15,33,46,0.5); backdrop-filter: blur(4px); box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
.level-text { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }

/* Status da Conta */
.card-title { margin: 0 0 12px 0; font-size: 14px; font-weight: 900; color: white; display: flex; align-items: center; gap: 8px;}
.status-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;}
.status-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(15,33,46,0.5); border: 1px solid rgba(55,65,81,0.3); border-radius: 6px; }
.status-left { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500;}
.badge { font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; }
.badge-green { background: rgba(34,197,94,0.1); color: #22c55e; }
.badge-yellow { background: rgba(234,179,8,0.1); color: #eab308; }
.warning-box { margin-top: 12px; padding: 8px; background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.2); border-radius: 6px; text-align: center;}
.warning-box p { margin: 0; font-size: 10px; color: rgba(254,240,138,0.8); line-height: 1.3;}
.warning-box strong { font-weight: 900; }

/* ========================================================
   FORMULÁRIOS (COLUNA DIREITA)
   ======================================================== */
.tabs-header { display: flex; border-bottom: 1px solid #374151; background: rgba(15,33,46,0.3); }
.tab-btn { flex: 1; padding: 12px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #6b7280; font-size: 12px; font-weight: 900; text-transform: uppercase; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; transition: 0.3s; outline: none; }
.tab-btn:hover { color: #d1d5db; }
.tab-btn.active { color: white; border-color: #22c55e; background: #1a2c38; }

.tabs-body { padding: 20px; flex: 1; display: flex; flex-direction: column;}
.form-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: space-between; height: 100%;}
.form-content { display: flex; flex-direction: column; gap: 12px; }

.grid-2-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.input-group { display: flex; flex-direction: column; gap: 4px; }
.input-group label { font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; padding-left: 4px;}

.input-icon-wrapper { position: relative; display: flex; align-items: center; width: 100%;}
.icon-input { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; pointer-events: none; flex-shrink: 0;}

/* 🔥 CADEADOS ESMAGADOS E CONSERTADOS 🔥 */
.icon-right { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #4b5563; pointer-events: none; flex-shrink: 0;}

.input-field { width: 100%; background: #0f212e; color: white; font-size: 14px; border: 1px solid #374151; border-radius: 8px; padding: 8px 12px 8px 36px; box-sizing: border-box; outline: none; transition: 0.3s; font-family: 'Montserrat', sans-serif;}
.input-field::placeholder { color: #4b5563; }
.input-field:focus { border-color: #22c55e; }
.input-field:disabled { opacity: 0.8; }

.form-footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid rgba(55,65,81,0.5); display: flex; justify-content: space-between; align-items: center;}
.flex-end { justify-content: flex-end; }
.required-note { font-size: 10px; color: #6b7280; }

.btn-save { padding: 10px 24px; border: none; border-radius: 8px; color: white; font-size: 12px; font-weight: 900; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.bg-green { background: #16a34a; }
.bg-blue { background: #2563eb; }

/* Dica de Segurança */
.security-tip { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); border-radius: 6px; padding: 12px; display: flex; align-items: flex-start; gap: 8px;}
.security-tip h4 { margin: 0 0 2px 0; font-size: 12px; font-weight: 900; color: #dbeafe; }
.security-tip p { margin: 0; font-size: 10px; color: rgba(191,219,254,0.7); line-height: 1.2; }
.btn-toggle-pass { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 4px; display: flex; justify-content: center; align-items: center; transition: 0.2s;}
.btn-toggle-pass:hover { color: white; }

/* Spinners e Notificações */
.loading-state { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 60px 0; gap: 15px; }
.loading-state p { margin: 0; font-size: 14px; color: #9ca3af; animation: pulse 2s infinite; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(34,197,94,0.3); border-top-color: #22c55e; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.notify-overlay { position: absolute; inset: 0; z-index: 500; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); border-radius: 12px; padding: 20px;}
.notify-box { background: #0f212e; border: 1px solid #4b5563; border-radius: 16px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; max-width: 250px; display: flex; flex-direction: column; align-items: center; gap: 12px;}
.notify-box h3 { margin: 0; font-size: 18px; font-weight: 900; color: white;}
</style>