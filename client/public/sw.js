// Minimaler Service Worker (Muster aus der Etiketten-App):
// - cached den App-Shell (HTML + zentrale Assets)
// - bei Offline liefert er zumindest das HTML, damit die App aus dem
//   localStorage-Cache weiterarbeiten kann (Baecker um 3 Uhr morgens!).
//
// API-Requests werden NICHT vom SW gecached — der Offline-Datenstand
// liegt im localStorage (DataContext), nicht im SW-Cache.

const CACHE = 'rezeptrechner-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon.png', '/logo.jpg'];
const OFFLINE_FALLBACK = new Response('', { status: 503, statusText: 'Offline' });

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // API-Requests nie cachen, nie abfangen — gehen direkt durch.
  if (url.pathname.startsWith('/api/')) return;

  // Cross-Origin nicht abfangen (sonst CORS-Probleme).
  if (url.origin !== self.location.origin) return;

  // Navigations-Requests: Network-First, Fallback auf Cache, dann Offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match('/index.html'))
        .then((res) => res || OFFLINE_FALLBACK.clone())
    );
    return;
  }

  // Statische Assets: Cache-First mit gefangenem Fetch.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).catch(() => OFFLINE_FALLBACK.clone());
    })
  );
});
