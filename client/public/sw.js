// Service Worker (Muster Etiketten-App, erweitert):
// - cached den App-Shell (HTML + zentrale Assets) beim Install
// - NEU: gehashte Build-Assets (/assets/*) werden zur LAUFZEIT gecacht —
//   damit funktioniert ein App-Start auch bei komplettem Internetausfall
//   (Baecker um 3 Uhr; die Etiketten-Variante cachte nur den Shell und
//   waere beim Kaltstart offline gescheitert)
// - API-Requests werden NIE gecached — Offline-Datenstand liegt im
//   localStorage (DataContext), nicht im SW-Cache.

const CACHE = 'rezeptrechner-shell-__BUILD_VERSION__';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon.png', '/logo.jpg', /* BUILD_ASSETS */];
const OFFLINE_FALLBACK = new Response('', { status: 503, statusText: 'Offline' });
const currentMatch = request => caches.open(CACHE).then(cache => cache.match(request));

function cacheableAsset(url, response) {
  if (!response.ok) return false;
  const type = response.headers.get('Content-Type') || '';
  if (/\.js$/.test(url.pathname)) return /javascript/.test(type);
  if (/\.css$/.test(url.pathname)) return /text\/css/.test(type);
  return !/text\/html/.test(type);
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      // Vorherigen Stand für noch geöffnete Tabs behalten.
      const alt = keys.filter(k => k.startsWith('rezeptrechner-shell-') && k !== CACHE);
      return Promise.all(alt.slice(0, -1).map(k => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // API-Requests nie cachen, nie abfangen — gehen direkt durch.
  if (url.pathname.startsWith('/api/')) return;

  // Cross-Origin nicht abfangen (Render-API, sonst CORS-Probleme).
  if (url.origin !== self.location.origin) return;

  // Navigations-Requests: Network-First, Fallback auf Cache, dann Offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (!res.ok || !res.headers.get('Content-Type')?.includes('text/html')) {
            return currentMatch('/index.html').then(cached => cached || res);
          }
          // frisches index.html in den Cache legen (Offline-Kaltstart)
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => currentMatch('/index.html'))
        .then((res) => res || OFFLINE_FALLBACK.clone())
    );
    return;
  }

  // Statische Assets: Cache-First; Netz-Treffer werden fuer den
  // Offline-Fall in den Cache uebernommen (gehashte Dateien sind immutable).
  e.respondWith(
    // Aktuellen Cache zuerst: CacheStorage.match durchsucht sonst ältere
    // Caches zuerst. Nur gehashte Assets dürfen aus dem Vorstand kommen.
    currentMatch(e.request).then(cached => cached || (url.pathname.startsWith('/assets/') ? caches.match(e.request) : undefined)).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          if (cacheableAsset(url, res) && (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => OFFLINE_FALLBACK.clone());
    })
  );
});
