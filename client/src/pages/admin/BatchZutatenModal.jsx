// Batch-Zutaten: mehrere Zutaten per Textfeld hinzufuegen.
// Format wie alte App: "1000 Weizenmehl 550" / "1.5kg Roggenmehl".

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { parseBatchLine, erkenneFlags } from '../../lib/batchParser.js';

export default function BatchZutatenModal({ vorschlaege, onSave, onClose }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);

  const parsen = () =>
    text.split('\n').map(parseBatchLine).filter(Boolean).map((z) => ({ ...z, ...erkenneFlags(z.name, vorschlaege) }));

  function speichern() {
    const parsed = parsen();
    if (!parsed.length) {
      setPreview([]);
      return;
    }
    onSave(
      parsed.map((z) => ({
        name: z.name,
        menge_kg: +(z.menge_g / 1000).toFixed(6),
        ist_mehl: z.ist_mehl,
        ist_wasser: z.ist_wasser,
        bemerkung: '',
        fuer_produkte: [],
      }))
    );
  }

  return (
    <Modal
      title="Mehrere Zutaten hinzufügen"
      onClose={onClose}
      maxWidth={600}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn" onClick={() => setPreview(parsen())}>Vorschau</button>
          <button className="btn btn-primary" onClick={speichern}>Alle hinzufügen</button>
        </>
      }
    >
      <div style={{ padding: 12, background: 'var(--accent-light)', borderRadius: 10, marginBottom: 12, fontSize: 13 }}>
        💡 <strong>Format:</strong> Eine Zutat pro Zeile — Menge (g oder kg), dann Name.
        <br />
        <code>1000 Weizenmehl 550</code> · <code>1,5kg Roggenmehl</code> · <code>620 Wasser</code>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
        placeholder={'1000 Weizenmehl 550\n620 Wasser\n20 Salz\n15 Hefe'}
      />
      {preview !== null && (
        <div style={{ marginTop: 12 }}>
          {preview.length === 0 ? (
            <div style={{ color: 'var(--error)', fontSize: 13 }}>Keine gültigen Zutaten erkannt</div>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Erkannte Zutaten:</div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {preview.map((z, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontWeight: 600 }}>{z.name}</span>
                    <span>{z.menge_g.toLocaleString('de-DE')} g</span>
                    {z.ist_mehl && <span title="Mehl">🌾</span>}
                    {z.ist_wasser && <span title="Wasser">💧</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
