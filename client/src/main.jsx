import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/theme.css';
// Design-Refresh v3: NACH theme.css laden — uebersteuert gezielt einzelne
// v2-Regeln (Ladeanimationen, Mobile-Politur, Theming nativer Controls).
import './styles/refresh-v3.css';
// Eigene Politur (rundere Formen, Mikro-Animationen) — NACH refresh-v3.
import './styles/polish.css';

// Theme aus localStorage anwenden BEVOR React rendert — verhindert Flackern.
try {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') {
    document.documentElement.setAttribute('data-theme', saved);
  }
} catch {}

// Service-Worker registrieren (nur in Produktion).
// Bei neuem SW (= neuer Deploy) wird ein CustomEvent 'sw-update' gefeuert,
// damit die App einen Toast anzeigen kann ("Neue Version verfuegbar").
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      // Bei jedem Page-Load und alle 30 min nach Update fragen
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('sw-update'));
          }
        });
      });
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
