// SyncGate: Nach einem frischen Login sichtbar auf aktuelle Server-Daten
// warten (max. 10 s, Logik im DataContext) — verhindert, dass jemand
// unbemerkt mit veralteten Cache-Daten arbeitet (Kernfehler der alten
// Firestore-App: Login ging durch, App blieb still auf localStorage).
//
// DatenstandBanner: Wenn der Server nicht erreichbar ist, ehrlich zeigen,
// von wann der angezeigte Datenstand ist — aktualisiert sich automatisch.

import { useData } from '../context/DataContext.jsx';

export function SyncGate({ children }) {
  const { wartetAufDaten } = useData();
  if (wartetAufDaten) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 14 }}>
        <div className="loading" style={{ minHeight: 60 }} />
        <div style={{ fontWeight: 700, fontSize: 16 }}>Lade aktuelle Rezepte…</div>
        <div className="muted" style={{ fontSize: 13 }}>Einen Moment — die Daten werden vom Server geholt.</div>
      </div>
    );
  }
  return children;
}

export function DatenstandBanner() {
  const { cloudStatus, letzterSync } = useData();
  if (cloudStatus === 'online' || cloudStatus === 'sync') return null;
  const stand = letzterSync
    ? new Date(letzterSync).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <div className="offline-banner">
      {cloudStatus === 'offline' ? '📡 Keine Internetverbindung' : '⚠️ Server nicht erreichbar'}
      {stand ? ` — Daten-Stand: ${stand} Uhr.` : '.'} Aktualisiert sich automatisch.
    </div>
  );
}
