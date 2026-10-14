// Custom-Zutaten: eigene Naehrwerte + Allergene pflegen (DB, geraete-
// uebergreifend — ehem. localStorage 'nw_custom'). Zeigt fehlende Zutaten
// (ohne Naehrwert-Daten) zuerst, wie das alte Zutat-Daten-Modal.

import { useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { findNaehrwerte, getRezeptAllergene } from '../../lib/calc/naehrwerteLookup.js';
import { EU_ALLERGENE } from '../../data/allergene.js';
import { validateCustomIngredient } from '../../../../shared/validation.js';

const NW_FELDER = [
  ['kj', 'kJ'],
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
  const [fehler, setFehler] = useState('');
  const [busy, setBusy] = useState(false);

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
      hatDaten: (() => { const d = findNaehrwerte(name, customIngredients); return d && !['ungeprueft','widerspruechlich'].includes(d.datenstatus) && NW_FELDER.every(([k]) => typeof d[k] === 'number'); })(),
      istCustom: !!customMap[name.toLowerCase()],
    }))
    .filter((z) => !filter || z.name.toLowerCase().includes(filter.toLowerCase()))
    .filter((z) => !nurFehlende || !z.hatDaten || z.istCustom);

  function bearbeiten(name, referenz = false) {
    const data = findNaehrwerte(name, referenz ? [] : customIngredients) || {};
    setFehler('');
    setBearbeite({
      ...data,
      name,
      quelle: data.quelle || (data.quelle_pdf ? `${data.quelle_pdf}, Seite ${data.quelle_seite}` : ''),
      kj: data.kj ?? '',
      kcal: data.kcal ?? '',
      eiweiss: data.eiweiss ?? data.protein ?? '',
      fett: data.fett ?? data.fat ?? '',
      gfs: data.gfs ?? '',
      kh: data.kh ?? data.carbs ?? '',
      zucker: data.zucker ?? '',
      ballaststoffe: data.ballaststoffe ?? '',
      salz: data.salz ?? '',
      allergene: referenz ? (customMap[name.toLowerCase()]?.allergene || customMap[name.toLowerCase()]?.a || getRezeptAllergene({ zutaten: [{ name, menge_kg: 1 }] })) : data.a || data.allergene || getRezeptAllergene({ zutaten: [{ name, menge_kg: 1 }] }),
    });
  }

  async function speichern() {
    const b = bearbeite;
    if (busy) return;
    if (NW_FELDER.some(([k]) => String(b[k]).trim() === '' || !Number.isFinite(Number(String(b[k]).replace(',', '.'))))) { setFehler('Alle Nährwerte einschließlich kJ und kcal eintragen. Bekannte Nullwerte bitte ausdrücklich als 0 erfassen.'); return; }
    const num = (v) => parseFloat(String(v).replace(',', '.')) || 0;
    // Beide Formate speichern: 8-Feld (LMIV) + kcal/protein/carbs/fat/a (Chips)
    const data = {
      ...customMap[b.name.toLowerCase()],
      quelle_url: b.quelle_url,
      quelle_pdf: b.quelle_pdf,
      quelle_seite: b.quelle_seite,
      quelle_sha256: b.quelle_sha256,
      bls_code: b.bls_code,
      rohstoff: b.rohstoff,
      kj: num(b.kj),
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
      quelle: b.quelle || '',
      datenstatus: 'eigene_angabe',
    };
    const errors = validateCustomIngredient(data);
    if (errors.length) { setFehler(errors.join(' ')); return; }
    setBusy(true);
    try { await onSave(b.name, data); setBearbeite(null); }
    catch (err) { setFehler(err.message); }
    finally { setBusy(false); }
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
                disabled={busy}
                onClick={async () => { setBusy(true); try { await onDelete(bearbeite.name); setBearbeite(null); } catch(err) { setFehler(err.message); } finally { setBusy(false); } }}
              >
                Eintrag löschen
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setBearbeite(null)}>Abbrechen</button>
            <button className="btn btn-primary" disabled={busy} onClick={speichern}>Speichern</button>
          </>
        }
      >
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Werte pro 100 g</p>
        {fehler && <p role="alert">{fehler}</p>}
        <div className="form-grid-4" style={{ gap: 8, marginBottom: 12 }}>
          {NW_FELDER.map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`naehrwert-${key}`} style={{ fontSize: 11 }}>{label}</label>
              <input
                id={`naehrwert-${key}`}
                type="text"
                inputMode="decimal"
                value={bearbeite[key]}
                onChange={(e) => setBearbeite({ ...bearbeite, [key]: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
          {bearbeite.rohstoff && <p className="muted">Referenzrohstoff: {bearbeite.rohstoff}</p>}
          {bearbeite.datenhinweise && <p className="muted">Quellenhinweise: {Object.entries(bearbeite.datenhinweise).map(([k,v]) => `${k}: ${v}`).join('; ')}. TR bedeutet Spuren, LOD/LOQ Nachweis-/Bestimmungsgrenze. Ohne Zahlenwert wird daraus keine Null.</p>}
          {customMap[bearbeite.name.toLowerCase()] && (() => {
            const ref = findNaehrwerte(bearbeite.name);
            return ref && !['ungeprueft','widerspruechlich'].includes(ref.datenstatus) && <button className="btn" type="button" disabled={busy} onClick={() => bearbeiten(bearbeite.name, true)}>Geprüfte Referenzwerte in den Entwurf übernehmen</button>;
          })()}
        <label style={{ display: 'block', marginBottom: 12 }}>Quelle / Produktdatenblatt
          <input value={bearbeite.quelle || ''} onChange={e => setBearbeite({ ...bearbeite, quelle: e.target.value })} style={{ width: '100%' }} />
        </label>
        <label>Allergene</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {Object.entries(EU_ALLERGENE).map(([code, a]) => (
            <label key={code} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <input
                type="checkbox"
                checked={bearbeite.allergene.some(c => c.charAt(0) === code)}
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
        {Object.entries(EU_ALLERGENE).filter(([code,a]) => a.sub && bearbeite.allergene.some(c => c.charAt(0) === code)).map(([code,a]) => <fieldset key={code} style={{ marginTop: 10 }}>
          <legend>{a.name}: Art angeben</legend>
          {Object.entries(a.sub).map(([sub,label]) => <label key={sub} style={{ display: 'inline-flex', gap: 4, marginRight: 12 }}>
            <input type="checkbox" checked={bearbeite.allergene.includes(code+sub)} onChange={e => setBearbeite({ ...bearbeite,
              allergene: e.target.checked ? [...bearbeite.allergene.filter(c => c !== code), code+sub] : bearbeite.allergene.filter(c => c !== code+sub),
            })} />{label}
          </label>)}
        </fieldset>)}
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
              {z.istCustom ? z.hatDaten ? 'eigene Daten' : 'eigene Daten unvollständig' : z.hatDaten ? 'Standard' : 'fehlt'}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
