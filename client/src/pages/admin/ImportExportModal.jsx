// Excel-/JSON-Export und -Import mit Vorschau (Update-by-Name wie alte App).

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { exportExcel, exportJSON, downloadTemplate, parseImportBuffer } from '../../lib/excel.js';
import { mkRezept } from '../../lib/mkRezept.js';
import { useToast } from '../../components/Toast.jsx';
import { useData } from '../../context/DataContext.jsx';
import { api } from '../../services/api.js';
import { validateBackup } from '../../../../shared/backup.js';
import { validateRecipe } from '../../../../shared/validation.js';

export default function ImportExportModal({ recipes, settings, onImport, onClose }) {
  const toast = useToast();
  const [preview, setPreview] = useState(null); // [{rezept, status}]
  const [fname, setFname] = useState('');
  const { prices, customIngredients, mutateAndRefresh, cloudStatus } = useData();
  const [backup, setBackup] = useState(null);
  const [revision, setRevision] = useState(null);
  const [restore, setRestore] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFname(f.name);
    setBackup(null); setRestore(false); setRevision(null); setPreview(null);
    const reader = new FileReader();
    if (f.name.toLowerCase().endsWith('.json')) {
      reader.onload = async (ev) => {
        try {
          const d = JSON.parse(ev.target.result);
          if (!d.rezepte) {
            toast.error('Ungültige JSON-Datei (kein rezepte-Feld)');
            return;
          }
          d.rezepte = d.rezepte.map(mkRezept);
          const errors = validateBackup(d);
          if (errors.length) throw new Error(errors.join(' '));
          const aktuell = await api.getBackup();
          setRevision(aktuell.revision);
          setBackup(d);
          zeigePreview(d.rezepte, aktuell.backup.rezepte);
        } catch (err) {
          toast.error('Datei konnte nicht vorbereitet werden: ' + err.message);
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

  function zeigePreview(parsed, bestand = recipes) {
    const ids = new Set();
    setPreview(
      parsed.map((d) => {
        const named = bestand.filter(x => x.name === d.name);
        const existing = bestand.find(x => x.id === d.id) || (named.length === 1 ? named[0] : null);
        if (!existing && named.length > 1) throw new Error(`Mehrdeutiger Rezeptname: ${d.name}. IDs in der Datei ergänzen.`);
        const data = mkRezept(d);
        if (existing) { data.id = existing.id; data._version = existing._version; } else delete data._version;
        const errors = validateRecipe(data);
        if (errors.length) throw new Error(`${data.name}: ${errors.join(' ')}`);
        if (ids.has(data.id)) throw new Error(`Rezept doppelt im Import: ${data.name}`);
        ids.add(data.id);
        return { data, status: existing ? 'update' : 'neu' };
      })
    );
  }

  async function importieren() {
    setBusy(true);
    try {
      if (restore) {
        await mutateAndRefresh(a => a.restoreBackup(backup, revision));
        toast.success('Sicherung vollständig wiederhergestellt');
        onClose();
      } else await onImport(preview.map(({ data }) => data));
      setPreview(null);
    } catch (err) { toast.error('Import fehlgeschlagen: ' + err.message); }
    finally { setBusy(false); }
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
            <button className="btn btn-primary" onClick={importieren} disabled={busy || (!restore && !preview.length)}>
              {busy ? 'Wird gespeichert…' : restore ? 'Sicherung wiederherstellen' : `${preview.length} Rezept(e) importieren`}
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
            <button className="btn" onClick={async () => {
              try {
                const { backup: b } = await api.getBackup();
                exportJSON(b.rezepte, b.cfg, b.prices, b.customIngredients); toast.success('Vollständige JSON-Sicherung erstellt');
              } catch { exportJSON(recipes, settings, prices, customIngredients); toast.info('Lokalen Datenstand gesichert – Server war nicht erreichbar'); }
            }}>
              💾 JSON-Sicherung
            </button>
            <button className="btn btn-ghost" onClick={downloadTemplate}>Vorlage herunterladen</button>
          </div>
          <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Import (Excel oder JSON)</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            Zuordnung zuerst über Rezept-ID, sonst über einen eindeutigen Namen. Änderungen seit der Vorschau brechen den Import ab.
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
          {backup && <div style={{ marginBottom: 12 }}>
            <label><input type="checkbox" checked={restore} onChange={e => setRestore(e.target.checked)} /> Sicherung wiederherstellen statt nur Rezepte zusammenführen</label>
            {restore && <p role="status">Ersetzt alle {recipes.length} vorhandenen Rezepte durch {backup.rezepte.length} gesicherte Rezepte.
              {backup.cfg !== undefined ? ' Einstellungen werden ersetzt.' : ' Einstellungen fehlen in der Datei und bleiben erhalten.'}
              {backup.prices !== undefined ? ` ${backup.prices.length} Preise werden wiederhergestellt.` : ' Preise bleiben erhalten.'}
              {backup.customIngredients !== undefined ? ` ${backup.customIngredients.length} eigene Zutaten werden wiederhergestellt.` : ' Eigene Zutaten bleiben erhalten.'}
            </p>}
          </div>}
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
