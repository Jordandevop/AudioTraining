import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En développement, les appels /api et /health sont relayés vers FastAPI (port 8000).
// 127.0.0.1 et non localhost : sur macOS, localhost peut viser l'IPv6 (::1),
// où un autre programme (ex. Docker) peut occuper le port 8000.
const BACKEND_URL = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': BACKEND_URL,
      '/health': BACKEND_URL,
    },
  },
})
