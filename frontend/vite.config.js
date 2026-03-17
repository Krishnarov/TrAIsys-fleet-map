import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // target: 'http://localhost:5050',
        target: 'https://tr-a-isys-fleet-map.vercel.app',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5050',
//        target: 'https://tr-a-isys-fleet-map.vercel.app',
        ws: true,
        changeOrigin: true,
      }
    },
  },
})