import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      // Lokale Entwicklung: API-Calls an den lokalen Express-Server
      // durchreichen, damit kein CORS-Setup noetig ist.
      '/api': 'http://localhost:4001',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // xlsx (gross, nur Import/Export im Admin) und der React-Kern in
        // eigene Chunks — gleiche Bundle-Aufteilung wie in der Etiketten-App.
        // xlsx bekommt durch den dynamischen Import in lib/excel.js
        // automatisch einen eigenen Lazy-Chunk.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
