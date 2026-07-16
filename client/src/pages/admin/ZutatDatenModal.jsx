// Custom-Zutaten: eigene Naehrwerte + Allergene pflegen (DB, geraete-
// uebergreifend — ehem. localStorage 'nw_custom'). Zeigt fehlende Zutaten
// (ohne Naehrwert-Daten) zuerst, wie das alte Zutat-Daten-Modal.

import { useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { getNaehrwert } from '../../lib/calc/naehrwerteLookup.js';
import { EU_ALLERGENE } from '../../data/allergene.js';

const NW_FELDER = [
  ['kcal', 'kcal'],
  ['eiweiss', 'Eiweiß g'],
  ['fett', 'Fett g'],
  ['gfs', 'ges. FS g'],
  ['kh', 'KH g'],
  ['zucker', 'Zucker g'],
  ['ballaststoffe', 'Ballastst. g'],
  ['salz', 'Salz g'],
];

export default function ZutatDatenModal({ recipes, customIngredients, onSave, onDelete, onClose }) {
  const [filter, setFilter] = useState('');
  const [nurFehlende, setNurFehlende] = useState(true);
  const [bearbeite, setBearbeite] = useState(null); // { name, ...felder, allergene[] }

  const customMap = useMemo(() => {
    const m = {};
    customIngredients.forEach((c) => { m[c.name.toLowerCase()] = c.data; });
    return m;
  }, [customIngredients]);

  const alleZutaten = useMemo(() => {
    const set = new Set();
    recipes.forEach((r) => r.zutaten?.forEach((z) => !z.ist_kommentar && z.name && set.add(z.name)));
    return [...set].sort((a, b) => a.localeCompare(b, 'de'));
  }, [recipes]);

  const liste = alleZutaten
    .map((name) => ({
      name,
      hatDaten: getNaehrwert(name, customMap) !== null,
      istCustom: !!customMap[name.toLowerCase()],
    }))
    .filter((z) => !filter || z.name.toLowerCase().includes(filter.toLowerCase()))
    .filter((z) => !nurFehlende || !z.hatDaten || z.istCustom);

  function bearbeiten(name) {
    const data = customMap[name.toLowerCase()] || {};
    setBearbeite({
      name,
      kcal: data.kcal ?? '',
      eiweiss: data.eiweiss ?? data.protein ?? '',
      fett: data.fett ?? data.fat ?? '',
      gfs: data.gfs ?? '',
      kh: data.kh ?? data.carbs ?? '',
      zucker: data.zucker ?? '',
      ballaststoffe: data.ballaststoffe ?? '',
      salz: data.salz ?? '',
      allergene: data.a || data.allergene || [],
    });
  }

  async function speichern() {
    const b = bearbeite;
    const num = (v) => parseFloat(String(v).replace(',', '.')) || 0;
    // Beide Formate speichern: 8-Feld (LMIV) + kcal/protein/carbs/fat/a (Chips)
    const data = {
      kcal: num(b.kcal),
      eiweiss: num(b.eiweiss),
      fett: num(b.fett),
      gfs: num(b.gfs),
      kh: num(b.kh),
      zucker: num(b.zucker),
      ballaststoffe: num(b.ballaststoffe),
      salz: num(b.salz),
      protein: num(b.eiweiss),
      carbs: num(b.kh),
      fat: num(b.fett),
      a: b.allergene,
      allergene: b.allergene,
    };
    await onSave(b.name, data);
    setBearbeite(null);
  }

  if (bearbeite) {
    return (
      <Modal
        title={`Nährwerte: ${bearbeite.name}`}
        onClose={() => setBearbeite(null)}
        maxWidth={480}
        footer={
          <>
            {customMap[bearbeite.name.toLowerCase()] && (
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--error)', marginRight: 'auto' }}
                onClick={async () => { await onDelete(bearbeite.name); setBearbeite(null); }}
              >
                Eintrag löschen
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setBearbeite(null)}>Abbrechen</button>
            <button className="btn btn-primary" onClick={speichern}>Speichern</button>
          </>
        }
      >
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Werte pro 100 g</p>
        <div className="form-grid-4" style={{ gap: 8, marginBottom: 12 }}>
          {NW_FELDER.map(([key, label]) => (
            <div key={key}>
              <label style={{ fontSize: 11 }}>{label}</label>
              <input
                type="text"
                inputMode="decimal"
                value={bearbeite[key]}
                onChange={(e) => setBearbeite({ ...bearbeite, [key]: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
        <label>Allergene</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {Object.entries(EU_ALLERGENE).map(([code, a]) => (
            <label key={code} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <input
                type="checkbox"
                checked={bearbeite.allergene.includes(code)}
                onChange={(e) =>
                  setBearbeite({
                    ...bearbeite,
                    allergene: e.target.checked
                      ? [...bearbeite.allergene, code]
                      : bearbeite.allergene.filter((c) => c !== code && c.charAt(0) !== code),
                  })
                }
              />
              {a.name}
            </label>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Zutat-Daten (Nährwerte & Allergene)" onClose={onClose} maxWidth={560}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          type="search"
          placeholder="Zutat filtern…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1 }}
        />
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={nurFehlende} onChange={(e) => setNurFehlende(e.target.checked)} />
          nur fehlende/eigene
        </label>
      </div>
      <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        {liste.length === 0 && <p className="muted">Alle Zutaten haben Nährwert-Daten. 🎉</p>}
        {liste.map((z) => (
          <button
            key={z.name}
            className="btn btn-ghost"
            style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 10px', color: 'var(--text)' }}
            onClick={() => bearbeiten(z.name)}
          >
            <span style={{ fontWeight: 600 }}>{z.name}</span>
            <span style={{ fontSize: 12, color: z.hatDaten ? 'var(--success)' : 'var(--error)' }}>
              {z.istCustom ? 'eigene Daten' : z.hatDaten ? 'Standard' : 'fehlt'}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
