// Custom-Zutaten: eigene Naehrwerte + Allergene pflegen (DB, geraete-
// uebergreifend — ehem. localStorage 'nw_custom'). Zeigt fehlende Zutaten
// (ohne Naehrwert-Daten) zuerst, wie das alte Zutat-Daten-Modal.

import { useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { findNaehrwerte, getRezeptAllergene, getRezeptAllergenStatus, getRezeptZutatenStatus, getRezeptLmivZutaten, istZusammengesetzteZutat } from '../../lib/calc/naehrwerteLookup.js';
import { NAEHRWERT_LABEL, naehrwertStatus, formatNaehrwert } from '../../lib/calc/naehrwertFelder.js';
import { EU_ALLERGENE } from '../../data/allergene.js';
import { validateCustomIngredient } from '../../../../shared/validation.js';

const NW_FELDER = Object.entries(NAEHRWERT_LABEL);

export default function ZutatDatenModal({ recipes, customIngredients, calculationIngredients = customIngredients, onSave, onDelete, onClose }) {
  const [filter, setFilter] = useState('');
  const [nurFehlende, setNurFehlende] = useState(true);
  const [bearbeite, setBearbeite] = useState(null); // { name, ...felder, allergene[] }
  const [fehler, setFehler] = useState('');
  const [busy, setBusy] = useState(false);

  const customMap = useMemo(() => {
    const m = {};
    customIngredients.forEach((c) => { m[c.name.toLowerCase().trim()] = c.data || c; });
    return m;
  }, [customIngredients]);

  const alleZutaten = useMemo(() => {
    const set = new Set();
    recipes.forEach((r) => r.zutaten?.forEach((z) => !z.ist_kommentar && z.name && z.name.trim().toLowerCase() !== 'gesamt' && set.add(z.name)));
    return [...set].sort((a, b) => a.localeCompare(b, 'de'));
  }, [recipes]);

  const liste = alleZutaten
    .map((name) => ({
      name,
      hatDaten: naehrwertStatus(findNaehrwerte(name, calculationIngredients)).vollstaendig
        && getRezeptAllergenStatus({zutaten:[{name,menge_kg:1}]}, calculationIngredients).vollstaendig
        && getRezeptZutatenStatus({zutaten:[{name,menge_kg:1}]}, calculationIngredients).vollstaendig,
      istCustom: !!customMap[name.toLowerCase()],
    }))
    .filter((z) => !filter || z.name.toLowerCase().includes(filter.toLowerCase()))
    .filter((z) => !nurFehlende || !z.hatDaten);

  function bearbeiten(name, referenz = false) {
    const berechnet = findNaehrwerte(name, calculationIngredients);
    const data = berechnet?.rezept_name ? berechnet : findNaehrwerte(name, referenz ? [] : customIngredients) || {};
    setFehler('');
    setBearbeite({
      ...data,
      name,
      zusammengesetzt: istZusammengesetzteZutat(name, data),
      zutaten_lmiv: getRezeptLmivZutaten({zutaten:[{name,menge_kg:1}]}, referenz ? [] : customIngredients)[0]?.lmiv || '',
      zutaten_geprueft: getRezeptZutatenStatus({zutaten:[{name,menge_kg:1}]}, referenz ? [] : customIngredients).vollstaendig,
      allergene_geprueft: getRezeptAllergenStatus({ zutaten: [{ name, menge_kg: 1 }] }, customIngredients).vollstaendig,
      quelle_geprueft: !['ungeprueft', 'widerspruechlich'].includes(data.datenstatus),
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
    if (NW_FELDER.some(([k]) => String(b[k]).trim() !== '' && !Number.isFinite(Number(String(b[k]).replace(',', '.'))))) { setFehler('Bitte gültige Zahlen eintragen oder unbekannte Werte leer lassen.'); return; }
    const num = (v) => String(v).trim() === '' ? null : Number(String(v).replace(',', '.'));
    // Beide Formate speichern: 8-Feld (LMIV) + kcal/protein/carbs/fat/a (Chips)
    const data = {
      ...customMap[b.name.toLowerCase()],
      quelle_url: b.quelle_url,
      quelle_pdf: b.quelle_pdf,
      quelle_seite: b.quelle_seite,
      quelle_sha256: b.quelle_sha256,
      bls_code: b.bls_code,
      rohstoff: b.rohstoff,
      datenhinweise: b.datenhinweise,
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
      allergene_geprueft: b.allergene_geprueft,
      zusammengesetzt: b.zusammengesetzt,
      zutaten_lmiv: b.zutaten_lmiv || '',
      zutaten_geprueft: b.zutaten_geprueft,
      quelle: b.quelle || '',
      datenstatus: b.quelle_geprueft ? 'eigene_angabe' : 'ungeprueft',
    };
    const errors = validateCustomIngredient(data);
    if (errors.length) { setFehler(errors.join(' ')); return; }
    setBusy(true);
    try { await onSave(b.name, data); setBearbeite(null); }
    catch (err) { setFehler(err.message); }
    finally { setBusy(false); }
  }

  if (bearbeite?.rezept_name) return <Modal title={`Eigene Mischung: ${bearbeite.name}`} onClose={() => setBearbeite(null)}>
    <p>Diese Zutat wird aus dem aktuellen Rezept „{bearbeite.rezept_name}“ berechnet. Mengen und Zutaten bitte im Quellrezept bearbeiten.</p>
    <p className="muted">{bearbeite.quelle}</p>
    {bearbeite.datenhinweise?.zutaten && <p>Fehlende Nährwertdaten: {bearbeite.datenhinweise.zutaten}</p>}
    <button className="btn" onClick={() => setBearbeite(null)}>Zurück zu den Zutaten</button>
  </Modal>;

  if (bearbeite) {
    return (
      <Modal
        title={`Nährwerte: ${bearbeite.name}`}
        onClose={() => { if (!busy) setBearbeite(null); }}
        maxWidth={640}
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
            <button className="btn btn-ghost" disabled={busy} onClick={() => setBearbeite(null)}>Abbrechen</button>
            <button className="btn btn-primary" disabled={busy} onClick={speichern}>Speichern</button>
          </>
        }
      >
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Werte pro 100 g der Zutat. Unbekannte Werte leer lassen, bekannte Nullwerte als 0 erfassen. Ballaststoffe sind freiwillig. Unvollständige Angaben können gespeichert werden; die Nährwertausgabe bleibt bis zur vollständigen Erfassung der Pflichtangaben gesperrt.</p>
        {fehler && <p role="alert">{fehler}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
          {NW_FELDER.map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`naehrwert-${key}`} style={{ fontSize: 11 }}>{label}</label>
              <input
                id={`naehrwert-${key}`}
                type="text"
                inputMode="decimal"
                placeholder="unbekannt"
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
            return ref && !naehrwertStatus(ref).quelleOffen && <details style={{ marginBottom: 12 }}>
              <summary>Eigene Werte mit der Referenz vergleichen</summary>
              <p className="muted">{ref.quelle || ref.quelle_pdf || ref.rohstoff || 'Hinterlegte Referenz'}</p>
              <table style={{ width: '100%', fontSize: 12 }}><thead><tr><th>Je 100 g</th><th>Entwurf</th><th>Referenz</th></tr></thead><tbody>
                {NW_FELDER.map(([k, label]) => <tr key={k}><th scope="row" style={{ textAlign: 'left' }}>{label}</th>
                  <td>{bearbeite[k] === '' ? '—' : formatNaehrwert(Number(String(bearbeite[k]).replace(',', '.')), 2)}</td><td>{formatNaehrwert(ref[k], 2)}</td></tr>)}
              </tbody></table>
              <p className="muted">Die Übernahme füllt den Entwurf. Gespeichert wird erst mit „Speichern“. Eigene Allergenangaben bleiben erhalten.</p>
              <button className="btn" type="button" disabled={busy} onClick={() => bearbeiten(bearbeite.name, true)}>Referenzwerte in den Entwurf übernehmen</button>
            </details>;
          })()}
        <label style={{ display: 'block', marginBottom: 12 }}>Quelle / Produktdatenblatt
          <input value={bearbeite.quelle || ''} onChange={e => setBearbeite({ ...bearbeite, quelle: e.target.value })} style={{ width: '100%' }} />
        </label>
        {!bearbeite.quelle_geprueft && <p role="status" style={{ color: 'var(--warning)' }}>Produktzuordnung oder Quelle ist noch ungeprüft. Die Werte werden bis zur Bestätigung nicht für die Deklaration verwendet.</p>}
        <label style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={bearbeite.quelle_geprueft} onChange={e => setBearbeite({ ...bearbeite, quelle_geprueft: e.target.checked })} />Produktzuordnung und Nährwertquelle geprüft
        </label>
        <label>Enthaltene Allergene</label>
        <p className="muted">Erkannte Allergene sind zunächst Vorschläge. Eine leere Auswahl bestätigt erst nach Prüfung, dass keine kennzeichnungspflichtigen Allergene enthalten sind.</p>
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
        <label style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input type="checkbox" checked={bearbeite.allergene_geprueft} onChange={e => setBearbeite({ ...bearbeite, allergene_geprueft: e.target.checked })} />Allergenangaben anhand der Quelle vollständig geprüft
        </label>
        <label style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input type="checkbox" checked={bearbeite.zusammengesetzt} onChange={e => setBearbeite({ ...bearbeite, zusammengesetzt: e.target.checked, zutaten_geprueft: false })} />Zusammengesetzte Zutat (z. B. Backmittel oder Füllung)
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>
          Zutatenliste laut Etikett / Hersteller
          <textarea value={bearbeite.zutaten_lmiv} onChange={e => setBearbeite({ ...bearbeite, zutaten_lmiv: e.target.value, zutaten_geprueft: false })} rows={4} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input type="checkbox" checked={bearbeite.zutaten_geprueft} onChange={e => setBearbeite({ ...bearbeite, zutaten_geprueft: e.target.checked })} />Zusammensetzung vollständig geprüft (bei reinen Rohstoffen genügt der eindeutige Name)
        </label>
      </Modal>
    );
  }

  return (
    <Modal title="Zutat-Daten (Nährwerte & Allergene)" onClose={onClose} maxWidth={560}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <input
          type="search"
          aria-label="Zutat filtern"
          placeholder="Zutat filtern…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1 }}
        />
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={nurFehlende} onChange={(e) => setNurFehlende(e.target.checked)} />
          Nur unvollständige Angaben
        </label>
      </div>
      <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        <p className="muted" role="status">{liste.length} von {alleZutaten.length} Zutaten angezeigt</p>
        {liste.length === 0 && <p className="muted">{filter.trim() ? 'Keine Zutat passt zu dieser Suche und Filterauswahl.' : 'Nährwert-Pflichtangaben, Allergene und Zusammensetzungen sind vollständig.'}</p>}
        {liste.map((z) => (
          <button
            key={z.name}
            className="btn btn-ghost"
            style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 10px', color: 'var(--text)' }}
            onClick={() => bearbeiten(z.name)}
          >
            <span style={{ fontWeight: 600 }}>{z.name}</span>
            <span style={{ fontSize: 12, color: z.hatDaten ? 'var(--success)' : 'var(--error)' }}>
              {z.istCustom ? z.hatDaten ? 'eigene Daten' : 'eigene Daten unvollständig' : z.hatDaten ? 'Referenzwerte vollständig' : 'Angaben fehlen'}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
