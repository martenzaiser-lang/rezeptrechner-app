// Zentraler Datenhaushalt: Rezepte, Settings, Preise, Custom-Zutaten.
//
// Sync-Strategie (ersetzt Firestore onSnapshot der alten App):
// - Beim Start SOFORT aus dem localStorage-Cache rendern (Render Free
//   braucht nach 15 min Schlaf ~50 s Cold-Start — der Baecker um 3 Uhr
//   morgens darf darauf nicht warten).
// - Sichtbare App: Polling alle 90 s. Das Backend teilt einen Cache zwischen
//   Geräten; unveränderte Daten verursachen dabei keinen Neon-Abruf.
// - Zusaetzlich sofort bei visibilitychange (Tablet aufgeweckt) und online.
// - Cloud-Status: online / sync / fehler / offline (Anzeige im Header).
// - 20 rotierende lokale Backups (wie alte App) bei jedem neuen Datenstand.

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { makeBackup } from '../../../shared/backup.js';
import { api, auth } from '../services/api.js';
import { rezeptZutaten, aufgeloesteRezepte } from '../lib/calc/rezeptZutaten.js';
import { rezeptPreise } from '../lib/preise.js';

const POLL_INTERVAL_MS = 90_000;
const CACHE_KEY = 'rz2_cache_v1';       // { recipes, settings, prices, customIngredients, etag, ts }
const BACKUP_IDX_KEY = 'rz2_backup_idx';
const BACKUP_PREFIX = 'rz2_backup_';
const MAX_BACKUPS = 20;

const DataContext = createContext(null);

function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return c && Array.isArray(c.recipes) && Array.isArray(c.prices) && Array.isArray(c.customIngredients) && c.settings && typeof c.settings === 'object' && !Array.isArray(c.settings) ? c : null;
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
function addBackup(data) {
  try {
    const idx = JSON.parse(localStorage.getItem(BACKUP_IDX_KEY) || '[]');
    const key = BACKUP_PREFIX + Date.now();
    localStorage.setItem(key, JSON.stringify(makeBackup(data)));
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
  const [cached] = useState(loadCache);
  const [recipes, setRecipes] = useState(cached?.recipes || []);
  const [settings, setSettings] = useState(cached?.settings || {});
  const [prices, setPrices] = useState(cached?.prices || []);
  const [customIngredients, setCustomIngredients] = useState(cached?.customIngredients || []);
  const calculationIngredients = useMemo(() => rezeptZutaten(recipes, customIngredients), [recipes, customIngredients]);
  const calculationRecipes = useMemo(() => aufgeloesteRezepte(recipes, calculationIngredients), [recipes, calculationIngredients]);
  const calculationPrices = useMemo(() => rezeptPreise(calculationRecipes, prices), [calculationRecipes, prices]);
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

  const queueRef = useRef(Promise.resolve());
  const pendingRef = useRef(null);
  const generationRef = useRef(0);
  const refresh = useCallback(({ force = false, throwOnError = false } = {}) => {
    if (pendingRef.current && !force) return pendingRef.current;
    const run = async () => {
      if (!auth.isLoggedIn()) return false;
      if (!navigator.onLine) {
        setCloudStatus('offline');
        if (throwOnError) throw new Error('Offline: aktuellen Serverstand erneut laden.');
        return false;
      }
      const generation = generationRef.current;
      const identity = auth.getEmail();
      setCloudStatus('sync');
      try {
        const [res, nextSettings, priceData, customData] = await Promise.all([
          api.getRecipes(etagRef.current), api.getSettings(), api.getPrices(), api.getCustomIngredients(),
        ]);
        const next = { ...stateRef.current, settings: nextSettings, prices: priceData.prices, customIngredients: customData.ingredients };
        let nextEtag = etagRef.current;
        if (!res.notModified) {
          const body = await res.json();
          if (!Array.isArray(body.recipes)) throw new Error('Rezeptantwort ist unvollständig.');
          next.recipes = body.recipes;
          nextEtag = res.headers.get('ETag');
        }
        if (!Array.isArray(next.prices) || !Array.isArray(next.customIngredients)) throw new Error('Nebendaten sind unvollständig.');
        // Eine inzwischen abgeschlossene Schreiboperation darf niemals von einer
        // älteren Leseantwort überschrieben werden.
        if (generation !== generationRef.current || !auth.isLoggedIn() || auth.getEmail() !== identity) return false;
        const changed = JSON.stringify(next) !== JSON.stringify(stateRef.current);
        stateRef.current = next;
        etagRef.current = nextEtag;
        setRecipes(next.recipes); setSettings(next.settings); setPrices(next.prices); setCustomIngredients(next.customIngredients);
        const ts = Date.now();
        saveCache({ ...next, etag: nextEtag, ts });
        if (changed) addBackup(next);
        setCloudStatus('online'); setInitialLoadDone(true); setLetzterSync(ts); beendeWarten();
        return true;
      } catch (err) {
        if (generation === generationRef.current) setCloudStatus(navigator.onLine ? 'fehler' : 'offline');
        beendeWarten();
        if (throwOnError) throw err;
        return false;
      }
    };
    const task = queueRef.current.catch(() => {}).then(run);
    queueRef.current = task;
    pendingRef.current = task;
    const clear = () => { if (pendingRef.current === task) pendingRef.current = null; };
    task.then(clear, clear);
    return task;
  }, [beendeWarten]);

  useEffect(() => {
    if (!auth.isLoggedIn()) return;

    refresh({ full: true });

    // Sicherheitsnetz: nach 10 s nicht laenger blockieren (Render-Kaltstart
    // kann laenger dauern — dann lieber Cache + Daten-Stand-Banner zeigen).
    const wartenTimeout = setTimeout(beendeWarten, 10_000);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh({ full: true });
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
    generationRef.current++;
    let result;
    try { result = await fn(api); }
    catch (err) { generationRef.current++; setCloudStatus(navigator.onLine ? 'fehler' : 'offline'); throw err; }
    generationRef.current++;
    etagRef.current = null;
    // Neue Rezeptversion sofort übernehmen: ein fehlgeschlagener anschließender
    // Lesezugriff darf beim nächsten Speichern keinen eigenen Konflikt erzeugen.
    if (result?.recipe) {
      const old = stateRef.current.recipes;
      const nextRecipes = old.some(r => r.id === result.recipe.id)
        ? old.map(r => r.id === result.recipe.id ? result.recipe : r) : [...old, result.recipe];
      stateRef.current = { ...stateRef.current, recipes: nextRecipes };
      setRecipes(nextRecipes);
    }
    try { await refresh({ force: true, throwOnError: true }); }
    catch { throw new Error('Änderung gespeichert, aber der aktuelle Gesamtstand konnte nicht geladen werden. Bitte aktualisieren.'); }
    return result;
  }, [refresh]);

  return (
    <DataContext.Provider
      value={{
        recipes,
        settings,
        prices,
        customIngredients,
        calculationIngredients,
        calculationRecipes,
        calculationPrices,
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
