import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  server: {
    // ISSO AQUI LIBERA O SEU DOMÍNIO NO VITE
    allowedHosts: [
      'magic-casino.online',
      'www.magic-casino.online'
    ]
  }
})
