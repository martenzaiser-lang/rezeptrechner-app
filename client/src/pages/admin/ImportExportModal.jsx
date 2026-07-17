// Excel-/JSON-Export und -Import mit Vorschau (Update-by-Name wie alte App).

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { exportExcel, exportJSON, downloadTemplate, parseImportBuffer } from '../../lib/excel.js';
import { mkRezept } from '../../lib/mkRezept.js';
import { useToast } from '../../components/Toast.jsx';

export default function ImportExportModal({ recipes, settings, onImport, onClose }) {
  const toast = useToast();
  const [preview, setPreview] = useState(null); // [{rezept, status}]
  const [fname, setFname] = useState('');

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFname(f.name);
    const reader = new FileReader();
    if (f.name.toLowerCase().endsWith('.json')) {
      reader.onload = (ev) => {
        try {
          const d = JSON.parse(ev.target.result);
          if (!d.rezepte) {
            toast.error('Ungültige JSON-Datei (kein rezepte-Feld)');
            return;
          }
          zeigePreview(d.rezepte);
        } catch {
          toast.error('Datei konnte nicht gelesen werden');
        }
      };
      reader.readAsText(f);
    } else {
      reader.onload = async (ev) => {
        try {
          const parsed = await parseImportBuffer(ev.target.result);
          if (!parsed.length) {
            toast.error('Keine Rezepte gefunden');
            return;
          }
          zeigePreview(parsed);
        } catch (err) {
          toast.error('Datei konnte nicht gelesen werden: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(f);
    }
    e.target.value = '';
  }

  function zeigePreview(parsed) {
    setPreview(
      parsed.map((d) => {
        const existing = recipes.find((x) => x.name === d.name);
        return { data: d, status: existing ? 'update' : 'neu', existingId: existing?.id };
      })
    );
  }

  async function importieren() {
    // Update-by-Name: bestehende ID uebernehmen, sonst neue via mkRezept
    const rezepte = preview.map(({ data, existingId }) => {
      const r = mkRezept(data);
      if (existingId) r.id = existingId;
      return r;
    });
    await onImport(rezepte);
    setPreview(null);
  }

  return (
    <Modal
      title="Import / Export"
      onClose={onClose}
      maxWidth={620}
      footer={
        preview ? (
          <>
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>Zurück</button>
            <button className="btn btn-primary" onClick={importieren}>
              {preview.length} Rezept(e) importieren
            </button>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
        )
      }
    >
      {!preview ? (
        <>
          <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Export</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <button className="btn" onClick={async () => { await exportExcel(recipes); toast.success('Excel-Export erstellt'); }}>
              📊 Excel-Export
            </button>
            <button className="btn" onClick={() => { exportJSON(recipes, settings); toast.success('JSON-Sicherung erstellt'); }}>
              💾 JSON-Sicherung
            </button>
            <button className="btn btn-ghost" onClick={downloadTemplate}>Vorlage herunterladen</button>
          </div>
          <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Import (Excel oder JSON)</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            Bestehende Rezepte werden per Name aktualisiert, neue angelegt.
          </p>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            Datei wählen…
            <input type="file" accept=".xlsx,.xls,.json" style={{ display: 'none' }} onChange={handleFile} />
          </label>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13 }}>
            <strong>{preview.length}</strong> Rezept(e) in <strong>{fname}</strong>:
          </p>
          <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {preview.map(({ data, status }, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 4px', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>
                  {data.name}
                  {data.produkte?.length ? ` (${data.produkte.length} Produkte)` : ''}
                  <span className="muted" style={{ fontWeight: 400 }}> · {data.kategorie} · {data.zutaten.length} Zutaten</span>
                </span>
                <span style={{ color: status === 'neu' ? 'var(--success)' : 'var(--warning)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {status === 'neu' ? '+ Neu' : '⟳ Update'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
