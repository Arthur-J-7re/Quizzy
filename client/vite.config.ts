import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Doit rester aligné avec les "paths" de tsconfig.app.json.
      'shared-types': fileURLToPath(new URL('../shared-types/index.ts', import.meta.url)),
    },
  },
  server:{
    port: 5180,
    host: true, // écoute sur toutes les interfaces (LAN + tunnel ngrok)
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.io',
    ],
    // Nécessaire pour que le HMR fonctionne à travers le tunnel ngrok (wss, sans port explicite)
    hmr: process.env.VITE_HMR_HOST
      ? {
          host: process.env.VITE_HMR_HOST,
          port: 443,
          protocol: 'wss',
        }
      : undefined,
    proxy: {
      // Préfixe réservé (aucune route React ne doit commencer par /local-api) :
      // permet aux clients distants (via ngrok/LAN) d'atteindre l'API sans CORS,
      // en passant par le même serveur Vite que celui qui sert la page.
      '/local-api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/local-api/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  // `vite preview` sert le build de prod (dist/) : même besoin de proxy que
  // le serveur dev pour tester ce bundle à travers ngrok/LAN sans CORS.
  preview: {
    port: 5182,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.io',
    ],
    proxy: {
      '/local-api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/local-api/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
