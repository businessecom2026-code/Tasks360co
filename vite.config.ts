import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Necessário para o Replit
    port: 5173, 
    proxy: {
      '/api': {
        // Em dev, aponta para a porta padrão do Node. 
        // Em produção (npm start), o Express serve o frontend, então o proxy não é usado.
        target: 'http://localhost:3000', 
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});