// Zutatpreise-Verwaltung: €/kg + Lieferant je Zutat (DB, geraeteuebergreifend),
// BAEKO-Standardpreise als angezeigter Fallback, CSV-Import, Filter.

import { useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { findZutatPreis, parseBaekoCSV } from '../../lib/preise.js';
import { useToast } from '../../components/Toast.jsx';

export default function PreiseModal({ recipes, prices, onSave, onClose }) {
  const toast = useToast();
  const [filter, setFilter] = useState('');
  // Aenderungen sammeln: { zutatName: { preis_eur_kg, lieferant } }
  const [dirty, setDirty] = useState({});

  const alleZutaten = useMemo(() => {
    const set = new Set();
    recipes.forEach((r) => r.zutaten?.forEach((z) => !z.ist_kommentar && z.name && set.add(z.name)));
    return [...set].sort((a, b) => a.localeCompare(b, 'de'));
  }, [recipes]);

  const preisMap = useMemo(() => {
    const m = {};
    prices.forEach((p) => { m[p.zutat_name] = p; });
    return m;
  }, [prices]);

  const sichtbar = alleZutaten.filter((n) => !filter || n.toLowerCase().includes(filter.toLowerCase()));

  const get = (name) => dirty[name] ?? preisMap[name] ?? null;

  function setPreis(name, patch) {
    const cur = get(name) || { preis_eur_kg: '', lieferant: '' };
    setDirty({ ...dirty, [name]: { ...cur, ...patch } });
  }

  async function speichern() {
    const eintraege = Object.entries(dirty)
      .map(([zutat_name, p]) => ({
        zutat_name,
        preis_eur_kg: parseFloat(String(p.preis_eur_kg).replace(',', '.')) || 0,
        lieferant: p.lieferant || null,
        deleted: !(parseFloat(String(p.preis_eur_kg).replace(',', '.')) > 0),
      }));
    if (!eintraege.length) {
      onClose();
      return;
    }
    await onSave(eintraege);
  }

  function csvImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const treffer = parseBaekoCSV(ev.target.result, alleZutaten);
        if (!treffer.length) {
          toast.info('Keine passenden Zutaten in der CSV gefunden');
          return;
        }
        const neu = { ...dirty };
        treffer.forEach((t) => { neu[t.zutat_name] = { preis_eur_kg: t.preis_eur_kg, lieferant: t.lieferant }; });
        setDirty(neu);
        toast.success(`${treffer.length} Preise aus CSV übernommen — bitte prüfen, dann Speichern`);
      } catch (err) {
        toast.error('CSV-Fehler: ' + err.message);
      }
    };
    reader.readAsText(file, 'ISO-8859-1');
    e.target.value = '';
  }

  return (
    <Modal
      title="Zutatpreise"
      onClose={onClose}
      maxWidth={680}
      footer={
        <>
          <label className="btn" style={{ cursor: 'pointer' }}>
            BÄKO-CSV importieren
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={csvImport} />
          </label>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={speichern}>
            Speichern ({Object.keys(dirty).length})
          </button>
        </>
      }
    >
      <input
        type="search"
        placeholder="Zutat filtern…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
      />
      <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        {sichtbar.map((name) => {
          const eigener = get(name);
          const baeko = findZutatPreis(name);
          return (
            <div key={name} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                {name}
                {baeko !== null && !eigener?.preis_eur_kg && (
                  <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> · BÄKO {baeko.toFixed(2)} €/kg</span>
                )}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="€/kg"
                value={eigener?.preis_eur_kg ?? ''}
                onChange={(e) => setPreis(name, { preis_eur_kg: e.target.value })}
                style={{ width: 84, textAlign: 'right' }}
              />
              <input
                type="text"
                placeholder="Lieferant"
                value={eigener?.lieferant ?? ''}
                onChange={(e) => setPreis(name, { lieferant: e.target.value })}
                style={{ width: 110 }}
              />
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
