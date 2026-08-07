import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // import.meta.dirname = direktori file ini (ESM), setara __dirname
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Semua panggilan API admin di-proxy ke backend Express
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
