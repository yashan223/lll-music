import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const localProxy = {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
  '/uploads': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: localProxy,
  },
  preview: {
    host: true,
    port: 4173,
    proxy: localProxy,
  },
})
