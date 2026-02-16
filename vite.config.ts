import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173, // Porta padrão do Vite
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // Aponta para o servidor Express
        changeOrigin: true,
        secure: false,
      }
    }
  },
});