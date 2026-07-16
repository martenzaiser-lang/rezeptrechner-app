// Aenderungsprotokoll (aus der DB — schreibt der Server automatisch).

import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../services/api.js';

const ACTION_LABELS = {
  new: 'Erstellt',
  edit: 'Bearbeitet',
  del: 'Gelöscht',
  import: 'Import',
  settings: 'Einstellungen',
  price: 'Preise',
  custom_ingredient: 'Zutat-Daten',
};

export default function ChangelogModal({ onClose }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    api.getChangelog(300).then((d) => setEntries(d.entries || [])).catch(() => setEntries([]));
  }, []);

  return (
    <Modal title="Änderungsprotokoll" onClose={onClose} maxWidth={640}>
      {entries === null ? (
        <p className="muted">Lade…</p>
      ) : entries.length === 0 ? (
        <p className="muted">Noch keine Einträge.</p>
      ) : (
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {entries.map((e, i) => (
            <div key={i} style={{ padding: '8px 4px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong>
                  {ACTION_LABELS[e.action] || e.action}
                  {e.recipe_name ? ` — ${e.recipe_name}` : ''}
                </strong>
                <span className="muted" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(e.ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="muted">
                {e.user_email}
                {e.details ? ` · ${JSON.stringify(e.details)}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
