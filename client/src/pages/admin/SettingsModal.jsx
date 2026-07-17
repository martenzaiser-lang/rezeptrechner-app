// Einstellungen: Betriebsname + globale Anzeige-Steuerung fuer den
// Backen-Screen (was Teigmacher/Kuchenmacher sehen — gilt fuer alle
// Geraete, der Admin sieht immer alles).

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { ANZEIGE_OPTIONEN, ANZEIGE_DEFAULTS } from '../../lib/anzeige.js';

export default function SettingsModal({ settings, onSave, onClose }) {
  const [name, setName] = useState(settings?.name || '');
  const [anzeige, setAnzeige] = useState({ ...ANZEIGE_DEFAULTS, ...(settings?.bakerAnzeige || {}) });

  return (
    <Modal
      title="Einstellungen"
      onClose={onClose}
      maxWidth={460}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={() => onSave({ name, bakerAnzeige: anzeige })}>
            Speichern
          </button>
        </>
      }
    >
      <label>Betriebsname</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', marginBottom: 16 }} />

      <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>Anzeige für Teigmacher & Kuchenmacher</h3>
      <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
        Gilt für alle Geräte. Du als Admin siehst im Backen-Screen immer alles.
      </p>
      {ANZEIGE_OPTIONEN.map(([key, label]) => (
        <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
          <input
            type="checkbox"
            checked={!!anzeige[key]}
            onChange={(e) => setAnzeige({ ...anzeige, [key]: e.target.checked })}
          />
          <span style={{ fontSize: 14 }}>{label}</span>
        </label>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
          onClick={() => setAnzeige({ ...ANZEIGE_DEFAULTS })}
        >
          Alle an
        </button>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
          onClick={() => setAnzeige(Object.fromEntries(ANZEIGE_OPTIONEN.map(([k]) => [k, false])))}
        >
          Alle aus
        </button>
      </div>
    </Modal>
  );
}
