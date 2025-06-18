import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose sur toutes les interfaces réseau
    port: 5173, // Port par défaut
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
