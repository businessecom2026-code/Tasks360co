import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: [
      '72a40eca-84a2-411b-b7b4-a8f5ef6f91ad-00-1brs3mq6khv6z.kirk.replit.dev'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    },
    hmr: {
      clientPort: 443, // Força a porta HTTPS do Replit
      protocol: 'wss'  // Força o uso de WebSocket Seguro
    }
  }
});