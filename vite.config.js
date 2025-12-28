import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const API_URL = env.VITE_API_URL || 'http://localhost:3000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/auth': {
          target: API_URL,
          changeOrigin: true,
        },
        '/class': {
          target: API_URL,
          changeOrigin: true,
        },
        '/students': {
          target: API_URL,
          changeOrigin: true,
        },
        '/attendance': {
          target: API_URL,
          changeOrigin: true,
        },
      }
    }
  }
})

