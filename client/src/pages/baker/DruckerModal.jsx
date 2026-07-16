// Bondrucker-Konfiguration: BLE-Verbindung + Bon-Inhalt-Optionen.
// Globale Optionen in localStorage 'rz_bon_config' (wie alte App),
// Abschnitts-Bons (Quell/Brueh/Koch/Sauerteig) pro Rezept in
// 'rz_bon_rezept_<id>' (Baecker darf das ohne Admin-Rechte umschalten).

import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import {
  connectPrinter, disconnectPrinter, isPrinterConnected,
  isBluetoothSupported, onPrinterStatusChange,
} from '../../lib/print/bluetooth.js';
import { useToast } from '../../components/Toast.jsx';

const GLOBAL_OPTS = [
  ['rezeptname', 'Rezeptname'],
  ['datum', 'Datum'],
  ['stueckzahl', 'Stückzahl / Produkte'],
  ['schuettwasser', 'Frische Zutaten (Wasser, Sauerteig, Hefe)'],
  ['ta', 'TA (Teigausbeute)'],
  ['allergene', 'Allergene'],
  ['naehrwerte', 'Nährwerte'],
  ['kommentare', 'Arbeitsschritte/Hinweise'],
];

const REZEPT_OPTS = [
  ['bonQuellstueck', 'Quellstück-Bon'],
  ['bonBruehstueck', 'Brühstück-Bon'],
  ['bonKochstueck', 'Kochstück-Bon'],
  ['bonSauerteig', 'Sauerteig-Bon'],
];

export function getRezeptBonOverrides(rezeptId) {
  try {
    return JSON.parse(localStorage.getItem('rz_bon_rezept_' + rezeptId) || '{}');
  } catch {
    return {};
  }
}

export default function DruckerModal({ rezept, onClose }) {
  const toast = useToast();
  const [connected, setConnected] = useState(isPrinterConnected());
  const [busy, setBusy] = useState(false);
  const [globalCfg, setGlobalCfg] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rz_bon_config') || '{}');
    } catch {
      return {};
    }
  });
  const [rezeptCfg, setRezeptCfg] = useState(() => (rezept ? getRezeptBonOverrides(rezept.id) : {}));

  useEffect(() => onPrinterStatusChange(setConnected), []);

  const defaults = { rezeptname: true, datum: true, stueckzahl: true, schuettwasser: true, ta: true, allergene: false, naehrwerte: false, kommentare: false };
  const globalWert = (key) => (key in globalCfg ? globalCfg[key] !== false && globalCfg[key] !== undefined && globalCfg[key] : defaults[key]);
  const rezeptWert = (key) => (key in rezeptCfg ? rezeptCfg[key] : (rezept?.bonOptionen?.[key] ?? true));

  function setGlobal(key, val) {
    const neu = { ...globalCfg, [key]: val };
    setGlobalCfg(neu);
    localStorage.setItem('rz_bon_config', JSON.stringify(neu));
  }

  function setRezept(key, val) {
    const neu = { ...rezeptCfg, [key]: val };
    setRezeptCfg(neu);
    localStorage.setItem('rz_bon_rezept_' + rezept.id, JSON.stringify(neu));
  }

  async function verbinden() {
    setBusy(true);
    try {
      await connectPrinter();
      toast.success('Drucker verbunden');
    } catch (err) {
      if (err.name !== 'NotFoundError') toast.error('Verbindung fehlgeschlagen: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="🖨 Bondrucker" onClose={onClose} maxWidth={460}>
      {!isBluetoothSupported() ? (
        <p style={{ color: 'var(--error)' }}>
          Web Bluetooth wird von diesem Browser nicht unterstützt (Chrome/Edge über HTTPS nötig).
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <span
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: connected ? 'var(--success)' : 'var(--muted)',
            }}
          />
          <span style={{ flex: 1, fontWeight: 600 }}>{connected ? 'Verbunden' : 'Nicht verbunden'}</span>
          {connected ? (
            <button className="btn" onClick={() => { disconnectPrinter(); }}>Trennen</button>
          ) : (
            <button className="btn btn-primary" disabled={busy} onClick={verbinden}>
              {busy ? 'Verbinde…' : 'Verbinden'}
            </button>
          )}
        </div>
      )}

      <h3 style={{ fontSize: 14, margin: '10px 0 6px' }}>Bon-Inhalt (global)</h3>
      {GLOBAL_OPTS.map(([key, label]) => (
        <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
          <input type="checkbox" checked={!!globalWert(key)} onChange={(e) => setGlobal(key, e.target.checked)} />
          <span style={{ fontSize: 14 }}>{label}</span>
        </label>
      ))}

      {rezept && (
        <>
          <h3 style={{ fontSize: 14, margin: '14px 0 6px' }}>Abschnitts-Bons für „{rezept.name}"</h3>
          {REZEPT_OPTS.map(([key, label]) => (
            <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
              <input type="checkbox" checked={!!rezeptWert(key)} onChange={(e) => setRezept(key, e.target.checked)} />
              <span style={{ fontSize: 14 }}>{label}</span>
            </label>
          ))}
        </>
      )}
    </Modal>
  );
}
