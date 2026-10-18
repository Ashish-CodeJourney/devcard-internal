/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // The API only allows the deployed Vercel origin via CORS, so local dev
    // talks to it through this proxy (same-origin from the browser's view).
    proxy: {
      '/api': { target: 'https://devcard-internal-backend.onrender.com', changeOrigin: true, secure: true },
      '/auth': { target: 'https://devcard-internal-backend.onrender.com', changeOrigin: true, secure: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
})
