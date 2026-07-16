// Grundrezept aus Text einfuegen (ehem. #m-paste-rezept, Strg+V):
// Zeilen im Format "Menge Name" werden als Zutaten erkannt,
// optional ein Abschnitt fuer alle Zutaten.

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { parseBatchLine, erkenneFlags } from '../../lib/batchParser.js';
import { mkRezept } from '../../lib/mkRezept.js';

const SECTIONS = ['', 'Hauptteig', 'Sauerteig', 'Vorteig', 'Quellstück', 'Kochstück', 'Brühstück'];

export default function PasteImportModal({ vorschlaege, initialText = '', onSave, onClose }) {
  const [name, setName] = useState('');
  const [text, setText] = useState(initialText);
  const [sektion, setSektion] = useState('');

  const zutaten = text
    .split('\n')
    .map(parseBatchLine)
    .filter(Boolean)
    .map((z) => ({ ...z, ...erkenneFlags(z.name, vorschlaege) }));

  function speichern() {
    if (!zutaten.length) return;
    // Name aus erster Nicht-Zutaten-Zeile erkennen, falls leer
    let rezeptName = name.trim();
    if (!rezeptName) {
      const erste = text.split('\n').find((l) => l.trim() && !parseBatchLine(l));
      rezeptName = erste?.trim() || 'Neues Rezept';
    }
    onSave(
      mkRezept({
        name: rezeptName,
        zutaten: zutaten.map((z) => ({
          name: z.name,
          menge_kg: +(z.menge_g / 1000).toFixed(6),
          ist_mehl: z.ist_mehl,
          ist_wasser: z.ist_wasser,
          bemerkung: sektion && sektion !== 'Hauptteig' ? sektion : '',
        })),
      })
    );
  }

  return (
    <Modal
      title="Grundrezept einfügen"
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={speichern} disabled={!zutaten.length}>
            Als neues Rezept anlegen ({zutaten.length} Zutaten)
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label>Rezeptname (optional)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="wird aus Text erkannt" style={{ width: '100%' }} />
        </div>
        <div>
          <label>Abschnitt zuweisen</label>
          <select value={sektion} onChange={(e) => setSektion(e.target.value)} style={{ width: '100%' }}>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>{s || 'Automatisch / Hauptteig'}</option>
            ))}
          </select>
        </div>
      </div>
      <label>Rezepttext (eine Zutat pro Zeile: Menge Name)</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
        placeholder={'Roggenmischbrot\n1000 Roggenmehl 1150\n620 Wasser\n20 Salz'}
        autoFocus
      />
      {text && (
        <p className="muted" style={{ fontSize: 13 }}>
          {zutaten.length} Zutaten erkannt{zutaten.length ? `: ${zutaten.slice(0, 5).map((z) => z.name).join(', ')}${zutaten.length > 5 ? '…' : ''}` : ''}
        </p>
      )}
    </Modal>
  );
}
