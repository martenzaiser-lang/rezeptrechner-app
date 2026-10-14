import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

function serviceWorkerBuild() {
  let config;
  return { name: 'versionierter-service-worker', apply: 'build',
    configResolved(c) { config = c; },
    writeBundle(_options, bundle) {
      const source = readFileSync(resolve(config.root, 'public/sw.js'), 'utf8');
      const assets = Object.keys(bundle).filter(f => /\.(js|css)$/.test(f)).map(f => '/' + f);
      const hash = createHash('sha256').update(source + JSON.stringify(assets)).digest('hex').slice(0, 16);
      writeFileSync(resolve(config.root, config.build.outDir, 'sw.js'), source.replace('__BUILD_VERSION__', hash).replace('/* BUILD_ASSETS */', assets.map(a => JSON.stringify(a)).join(', ')));
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerBuild()],
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
    target: ['es2020', 'safari14'],
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // xlsx (gross, nur Import/Export im Admin) und der React-Kern in
        // eigene Chunks — gleiche Bundle-Aufteilung wie in der Etiketten-App.
        // xlsx bekommt durch den dynamischen Import in lib/excel.js
        // automatisch einen eigenen Lazy-Chunk.
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react-vendor';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
