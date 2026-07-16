// Abwiegen-Vollbild: grosse Zutatenliste fuers Tablet, Wake-Lock aktiv,
// Escape oder ✕ schliesst.

import { useEffect } from 'react';
import { X } from 'lucide-react';
import ZutatenListe from './ZutatenListe.jsx';
import { requestWakeLock, releaseWakeLock } from '../../lib/wakeLock.js';

export default function AbwiegenFullscreen({ rezept, sk, teigGesamtKg, onClose }) {
  useEffect(() => {
    requestWakeLock();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      releaseWakeLock();
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="abwiegen-overlay">
      <button className="btn btn-primary abwiegen-close" onClick={onClose} aria-label="Schließen">
        <X size={22} />
      </button>
      <h2 style={{ marginTop: 0 }}>{rezept.name}</h2>
      <ZutatenListe rezept={rezept} sk={sk} teigGesamtKg={teigGesamtKg} />
    </div>
  );
}
