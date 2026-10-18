import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En développement, les appels /api et /health sont relayés vers FastAPI (port 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
