import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// When running with `vercel dev`, it starts Vite internally and the
// API routes are served on the same port — no proxy needed.
// When running with `vite` alone (frontend-only), proxy `/api/*` to
// the vercel dev API server on port 3001 so both servers can coexist.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', () => {
            // Silently ignore proxy errors — the API server may not be running.
            // The frontend will catch the network error and show a clear message.
          });
        },
      },
    },
  },
})
