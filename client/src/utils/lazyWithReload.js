import { lazy } from 'react';

// React.lazy-Wrapper, der den klassischen "stale chunk"-Fehler nach einem
// Deploy abfaengt: das alte index-*.js referenziert Chunk-Hashes, die es
// nach dem Deploy nicht mehr gibt -> der Server liefert index.html (HTML)
// statt JS -> dynamic import wirft.
//
// Strategie: beim ersten Fehlschlag EINMAL hart neu laden (sessionStorage-
// Guard gegen Reload-Schleifen). Nach dem Reload zieht der Browser das neue
// index.html samt aktueller Chunk-Hashes.
export function lazyWithReload(factory) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      const KEY = 'chunk-reload-at';
      const last = Number(sessionStorage.getItem(KEY) || 0);
      // Nur reloaden, wenn der letzte Reload-Versuch >10s her ist.
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
        // Promise nie aufloesen — die Seite laedt ohnehin neu.
        return new Promise(() => {});
      }
      throw err;
    }
  });
}
