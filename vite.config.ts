import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8645,
    strictPort: false,
    host: true
  },
  preview: {
    port: 8645,
    strictPort: false
  }
})
