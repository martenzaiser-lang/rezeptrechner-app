// Zentraler Datenhaushalt: Rezepte, Settings, Preise, Custom-Zutaten.
//
// Sync-Strategie (ersetzt Firestore onSnapshot der alten App):
// - Beim Start SOFORT aus dem localStorage-Cache rendern (Render Free
//   braucht nach 15 min Schlaf ~50 s Cold-Start — der Baecker um 3 Uhr
//   morgens darf darauf nicht warten).
// - Polling alle 90 s mit ETag: unveraenderter Stand kostet nur ein 304.
// - Zusaetzlich sofort bei visibilitychange (Tablet aufgeweckt) und online.
// - Cloud-Status: online / sync / fehler / offline (Anzeige im Header).
// - 20 rotierende lokale Backups (wie alte App) bei jedem neuen Datenstand.

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { api, auth } from '../services/api.js';

const POLL_INTERVAL_MS = 90_000;
const CACHE_KEY = 'rz2_cache_v1';       // { recipes, settings, prices, customIngredients, etag, ts }
const BACKUP_IDX_KEY = 'rz2_backup_idx';
const BACKUP_PREFIX = 'rz2_backup_';
const MAX_BACKUPS = 20;

const DataContext = createContext(null);

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('[cache] Speichern fehlgeschlagen:', err.message);
  }
}

// Rotierendes Backup der Rezepte (Wiederherstellung im Notfall,
// Muster der alten App: max 20, aeltestes fliegt raus).
function addBackup(recipes) {
  try {
    const idx = JSON.parse(localStorage.getItem(BACKUP_IDX_KEY) || '[]');
    const key = BACKUP_PREFIX + Date.now();
    localStorage.setItem(key, JSON.stringify(recipes));
    idx.push(key);
    while (idx.length > MAX_BACKUPS) {
      localStorage.removeItem(idx.shift());
    }
    localStorage.setItem(BACKUP_IDX_KEY, JSON.stringify(idx));
  } catch {
    // localStorage voll → aelteste Backups opfern
    try {
      const idx = JSON.parse(localStorage.getItem(BACKUP_IDX_KEY) || '[]');
      idx.slice(0, 10).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(BACKUP_IDX_KEY, JSON.stringify(idx.slice(10)));
    } catch {}
  }
}

export function DataProvider({ children }) {
  const cached = loadCache();
  const [recipes, setRecipes] = useState(cached?.recipes || []);
  const [settings, setSettings] = useState(cached?.settings || {});
  const [prices, setPrices] = useState(cached?.prices || []);
  const [customIngredients, setCustomIngredients] = useState(cached?.customIngredients || []);
  // 'online' | 'sync' | 'fehler' | 'offline'
  const [cloudStatus, setCloudStatus] = useState(navigator.onLine ? 'sync' : 'offline');
  const [initialLoadDone, setInitialLoadDone] = useState(Boolean(cached));
  // Zeitpunkt des letzten erfolgreichen Server-Syncs (fuer den
  // "Daten-Stand"-Banner, wenn der Server nicht erreichbar ist).
  const [letzterSync, setLetzterSync] = useState(cached?.ts || null);
  // Frischer Login: sichtbar auf aktuelle Daten warten statt still den
  // Cache zu zeigen (der stille Cache-Start war der Kernfehler der
  // alten Firestore-App). Endet bei Erfolg, Fehler oder nach 10 s.
  const [wartetAufDaten, setWartetAufDaten] = useState(() => {
    try {
      return sessionStorage.getItem('frisch_eingeloggt') === '1' && navigator.onLine;
    } catch {
      return false;
    }
  });

  const beendeWarten = useCallback(() => {
    try { sessionStorage.removeItem('frisch_eingeloggt'); } catch {}
    setWartetAufDaten(false);
  }, []);

  const etagRef = useRef(cached?.etag || null);
  const stateRef = useRef({ recipes, settings, prices, customIngredients });
  stateRef.current = { recipes, settings, prices, customIngredients };

  const refresh = useCallback(async ({ full = false } = {}) => {
    if (!auth.isLoggedIn()) return;
    if (!navigator.onLine) {
      setCloudStatus('offline');
      return;
    }
    setCloudStatus('sync');
    try {
      const res = await api.getRecipes(etagRef.current);
      let next = { ...stateRef.current };
      let changed = false;

      if (!res.notModified && res.status !== 304) {
        const body = await res.json();
        const etag = res.headers.get('ETag');
        next.recipes = body.recipes || [];
        etagRef.current = etag;
        changed = true;
        addBackup(next.recipes);
      }

      // Nebendaten seltener bzw. beim ersten Laden / expliziten full-Refresh
      if (full || !initialLoadDone) {
        const [settingsData, pricesData, customData] = await Promise.all([
          api.getSettings(),
          api.getPrices(),
          api.getCustomIngredients(),
        ]);
        next.settings = settingsData || {};
        next.prices = pricesData?.prices || [];
        next.customIngredients = customData?.ingredients || [];
        changed = true;
      }

      if (changed) {
        setRecipes(next.recipes);
        setSettings(next.settings);
        setPrices(next.prices);
        setCustomIngredients(next.customIngredients);
        saveCache({ ...next, etag: etagRef.current, ts: Date.now() });
      }
      setCloudStatus('online');
      setInitialLoadDone(true);
      setLetzterSync(Date.now());
      beendeWarten();
    } catch (err) {
      // 401 wird im api-Client behandelt (Redirect). Alles andere: Status rot,
      // App arbeitet mit dem Cache weiter.
      console.warn('[sync] Refresh fehlgeschlagen:', err.message);
      setCloudStatus(navigator.onLine ? 'fehler' : 'offline');
      beendeWarten();
    }
  }, [initialLoadDone, beendeWarten]);

  useEffect(() => {
    if (!auth.isLoggedIn()) return;

    refresh({ full: true });

    // Sicherheitsnetz: nach 10 s nicht laenger blockieren (Render-Kaltstart
    // kann laenger dauern — dann lieber Cache + Daten-Stand-Banner zeigen).
    const wartenTimeout = setTimeout(beendeWarten, 10_000);

    const interval = setInterval(() => refresh(), POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onOnline = () => refresh({ full: true });
    const onOffline = () => setCloudStatus('offline');

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearTimeout(wartenTimeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nach Admin-Mutationen: sofort neu laden, damit alle Komponenten
  // (und der Cache) den Serverstand inkl. neuer _version haben.
  const mutateAndRefresh = useCallback(async (fn) => {
    const result = await fn(api);
    await refresh({ full: true });
    return result;
  }, [refresh]);

  return (
    <DataContext.Provider
      value={{
        recipes,
        settings,
        prices,
        customIngredients,
        cloudStatus,
        initialLoadDone,
        letzterSync,
        wartetAufDaten,
        refresh,
        mutateAndRefresh,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData ausserhalb von DataProvider');
  return ctx;
}
