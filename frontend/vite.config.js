import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const entorno = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      // En desarrollo, las llamadas a /api se redirigen al backend NestJS (así no hay problemas de CORS)
      proxy: {
        '/api': entorno.API_PROXY_TARGET ?? 'http://localhost:3000',
      },
    },
  }
})
