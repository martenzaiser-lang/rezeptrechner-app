// Rezept-Editor: alle Stammdaten-Felder wie die alte App (#m-rezept):
// Name, Kategorie, aktiv, Stückkalkulation, Multi-Produkte, Berechnungs-
// modus (bei Kuchen), Blechmaße, Prozessparameter, Bedampfung, Anmerkungen.
// Zutaten werden in der Detail-Ansicht bearbeitet.

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { rezeptart } from '../../lib/calc/ta.js';

const KATEGORIEN = ['Brot', 'Brötchen', 'Feingebäck', 'Berliner / Krapfen', 'Plunder', 'Kuchen', 'Sonstiges'];

const num = (v, fallback = 0) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};

export default function RezeptEditorModal({ rezept, onSave, onClose }) {
  const isNew = !rezept;
  const r = rezept || {};
  const [form, setForm] = useState({
    name: r.name || '',
    kategorie: r.kategorie || 'Brot',
    aktiv: r.aktiv !== false,
    rezeptart: r.rezeptart || rezeptart(r),
    berechnung: r.berechnung || ((r.kategorie || 'Brot') === 'Kuchen' ? 'blech' : 'stueck'),
    stueckgewicht_g: r.produkte?.length === 1 ? r.produkte[0].gewicht_g : r.stueckgewicht_g ?? 1000,
    min_stueck: r.min_stueck ?? 1,
    max_stueck: r.max_stueck ?? 999,
    backverlust_pct: (r.produkte?.length === 1 ? r.produkte[0].backverlust_pct : null) ?? r.backverlust_pct ?? '',
    backverlust_status: r.produkte?.length === 1 && r.produkte[0].backverlust_pct != null ? r.produkte[0].backverlust_status || 'unbestaetigt' : r.backverlust_status || 'unbestaetigt',
    blech_breite_cm: r.blech_breite_cm || '',
    blech_laenge_cm: r.blech_laenge_cm || '',
    teigtemp_c: r.teigtemp_c ?? 26,
    kz_langsam: r.kz_langsam ?? 5,
    kz_schnell: r.kz_schnell ?? 8,
    stockgare: r.stockgare ?? 30,
    stueckgare: r.stueckgare ?? 45,
    back_ober: r.back_ober ?? 230,
    back_unter: r.back_unter ?? 230,
    backzeit: r.backzeit ?? 35,
    bedampfung: !!r.bedampfung,
    bedampf_hinweis: r.bedampf_hinweis || '',
    anmerkungen: r.anmerkungen || '',
    naehrwert_hinweis: r.naehrwert_hinweis || '',
  });
  const [multi, setMulti] = useState(Boolean(r.produkte && r.produkte.length > 1));
  const [produkte, setProdukte] = useState(r.produkte ? r.produkte.map((p) => ({ ...p })) : []);
  const [neuProdukt, setNeuProdukt] = useState({ name: '', gewicht_g: '', stueck_pro_presse: '' });
  const [fehler, setFehler] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const istKuchen = form.kategorie === 'Kuchen';

  function addProdukt() {
    if (!neuProdukt.name.trim() || !num(neuProdukt.gewicht_g)) return;
    if (produkte.some(p => p.name.toLowerCase() === neuProdukt.name.trim().toLowerCase())) {
      setFehler('Produktnamen müssen innerhalb eines Rezepts eindeutig sein.'); return;
    }
    setFehler('');
    setProdukte([
      ...produkte,
      {
        name: neuProdukt.name.trim(),
        gewicht_g: num(neuProdukt.gewicht_g),
        stueck_pro_presse: parseInt(neuProdukt.stueck_pro_presse) || 0,
      },
    ]);
    setNeuProdukt({ name: '', gewicht_g: '', stueck_pro_presse: '' });
  }

  function speichern() {
    if (!form.name.trim()) return;
    if (num(form.stueckgewicht_g) <= 0 || num(form.backverlust_pct) < 0 || num(form.backverlust_pct) >= 100 || num(form.min_stueck) > num(form.max_stueck)) {
      setFehler('Gewicht muss positiv sein; Backverlust liegt zwischen 0 und unter 100 %. Mindestmenge darf die Höchstmenge nicht überschreiten.'); return;
    }
    if (multi && produkte.length < 2) { setFehler('Mindestens zwei Produkte anlegen oder „Mehrere Produkte“ ausschalten.'); return; }
    if (!multi && (r.produkte?.length || 0) > 1 && r.zutaten?.some(z => z.fuer_produkte?.length)) { setFehler('Vor dem Ausschalten der Produktvarianten zuerst deren Zutatenzuordnungen entfernen.'); return; }
    const entfernt = (r.produkte || []).filter(p => !produkte.some(q => q.name === p.name));
    if (multi && entfernt.some(p => r.zutaten?.some(z => z.fuer_produkte?.includes(p.name)))) {
      setFehler('Entfernte Produkte sind noch Zutaten zugeordnet. Zuerst die Zutatenzuordnung bearbeiten.'); return;
    }
    onSave({
      ...r,
      id: r.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      zutaten: r.zutaten || [],
      ...form,
      name: form.name.trim(),
      berechnung: istKuchen ? form.berechnung : 'stueck',
      stueckgewicht_g: num(form.stueckgewicht_g, 1000),
      min_stueck: parseInt(form.min_stueck) || 1,
      max_stueck: parseInt(form.max_stueck) || 999,
      backverlust_pct: form.backverlust_pct === '' ? null : num(form.backverlust_pct),
      blech_breite_cm: num(form.blech_breite_cm),
      blech_laenge_cm: num(form.blech_laenge_cm),
      teigtemp_c: num(form.teigtemp_c, 26),
      kz_langsam: parseInt(form.kz_langsam) || 0,
      kz_schnell: parseInt(form.kz_schnell) || 0,
      stockgare: parseInt(form.stockgare) || 0,
      stueckgare: parseInt(form.stueckgare) || 0,
      back_ober: parseInt(form.back_ober) || 0,
      back_unter: parseInt(form.back_unter) || 0,
      backzeit: parseInt(form.backzeit) || 0,
      produkte: multi ? produkte : r.produkte?.length === 1 ? [{ ...r.produkte[0], gewicht_g: num(form.stueckgewicht_g, 1000), backverlust_pct: form.backverlust_pct === '' ? null : num(form.backverlust_pct), backverlust_status: form.backverlust_status }] : [],
    });
  }

  const feld = (label, key, props = {}) => (
    <div>
      <label htmlFor={`rezept-${key}`} style={{ fontSize: 13 }}>{label}</label>
      <input
        id={`rezept-${key}`}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        style={{ width: '100%' }}
        {...props}
      />
    </div>
  );

  return (
    <Modal
      title={isNew ? 'Neues Rezept' : `Rezept: ${r.name}`}
      onClose={onClose}
      maxWidth={640}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={speichern}>Speichern</button>
        </>
      }
    >
      {fehler && <p role="alert" style={{ color: 'var(--error)' }}>{fehler}</p>}
      <div className="form-grid-2">
        <div>
          <label>Rezeptname</label>
            <input aria-label="Rezeptname" value={form.name} autoFocus onChange={(e) => set('name', e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label>Kategorie</label>
            <select aria-label="Kategorie" value={form.kategorie} onChange={(e) => set('kategorie', e.target.value)} style={{ width: '100%' }}>
            {KATEGORIEN.map((k) => <option key={k}>{k}</option>)}
            {!KATEGORIEN.includes(form.kategorie) && <option>{form.kategorie}</option>}
          </select>
        </div>
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input type="checkbox" checked={form.aktiv} onChange={(e) => set('aktiv', e.target.checked)} />
        <span>Rezept aktiv</span>
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>Rezeptart
        <select aria-label="Rezeptart" value={form.rezeptart} onChange={e => set('rezeptart', e.target.value)} style={{ width: '100%' }}>
          <option value="unbekannt">Noch nicht zugeordnet – keine TA</option>
          <option value="teig">Teig – TA berechnen</option>
          <option value="masse">Masse / Mürbeteig – keine TA</option>
          <option value="mischung">Trockenmischung – keine TA</option>
        </select>
      </label>

      <h3 style={{ fontSize: 14, margin: '12px 0 6px' }}>Stückkalkulation</h3>
      <div className="form-grid-4">
        {feld('Teiggewicht (g)', 'stueckgewicht_g', { type: 'number', step: 1 })}
        {feld('Min. Stückzahl', 'min_stueck', { type: 'number', min: 1 })}
        {feld('Max. Stückzahl', 'max_stueck', { type: 'number', min: 1 })}
        {feld('Gewichtsverlust (%)', 'backverlust_pct', { type: 'number', min: 0, max: 99.9, placeholder: 'z.B. 12', title: 'Verlust gegenüber der gesamten eingesetzten Rezeptur einschließlich Füllung und Glasur' })}
        <label style={{ gridColumn: '1 / -1' }}>Grundlage des Gewichtsverlusts
          <select aria-label="Grundlage des Gewichtsverlusts" value={form.backverlust_status} onChange={e => set('backverlust_status', e.target.value)} style={{ width: '100%' }}>
            <option value="unbestaetigt">Unbestätigt – Nährwerte der ungebackenen Rezeptur</option>
            <option value="geschaetzt">Schätzung – ausdrücklich als Schätzung ausweisen</option>
            <option value="gemessen">Gemessen – abgekühltes Verkaufsgewicht</option>
          </select>
        </label>
        <p className="muted" style={{ gridColumn: '1 / -1', fontSize: 12 }}>Bezug: gesamte eingesetzte Rezeptur einschließlich späterer Füllungen und Glasuren gegenüber dem abgekühlten Verkaufsgewicht. Die Berechnung setzt Wasserverlust voraus. Aufgenommenes Frittierfett als eigene Zutatenmenge erfassen; bei Fettverlust oder veränderter Zusammensetzung sind angepasste Produktdaten erforderlich.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Produkte aus diesem Teig</h3>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
          <span>Mehrere Produkte</span>
        </label>
      </div>
      {multi ? (
        <div style={{ marginBottom: 10 }}>
          {produkte.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {p.gewicht_g} g{p.stueck_pro_presse > 0 ? ` · ${p.stueck_pro_presse} Stk/Presse` : ''}
              </span>
              <button className="btn btn-ghost" aria-label={`${p.name} entfernen`} onClick={() => setProdukte(produkte.filter((_, j) => j !== i))}>✕</button>
              <div style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <label style={{ flex: '1 1 150px' }}>Gewichtsverlust (%)
                  <input aria-label={`Gewichtsverlust ${p.name}`} type="number" min="0" max="99.9" step="any" placeholder="Wert des Rezepts" value={p.backverlust_pct ?? ''}
                    onChange={e => setProdukte(produkte.map((q, j) => j === i ? { ...q, backverlust_pct: e.target.value === '' ? null : Number(e.target.value) } : q))} style={{ width: '100%' }} />
                </label>
                <label style={{ flex: '2 1 200px' }}>Grundlage
                  <select aria-label={`Verlustgrundlage ${p.name}`} disabled={p.backverlust_pct == null} value={p.backverlust_status || 'unbestaetigt'}
                    onChange={e => setProdukte(produkte.map((q, j) => j === i ? { ...q, backverlust_status: e.target.value } : q))} style={{ width: '100%' }}>
                    <option value="unbestaetigt">Unbestätigt</option><option value="geschaetzt">Schätzung</option><option value="gemessen">Gemessen</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ fontSize: 12 }}>Produkt</label>
              <input value={neuProdukt.name} onChange={(e) => setNeuProdukt({ ...neuProdukt, name: e.target.value })} style={{ width: '100%' }} placeholder="z.B. Sesambrötchen" />
            </div>
            <div style={{ width: 90 }}>
              <label style={{ fontSize: 12 }}>Teig (g)</label>
              <input type="number" min="1" value={neuProdukt.gewicht_g} onChange={(e) => setNeuProdukt({ ...neuProdukt, gewicht_g: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ width: 90 }}>
              <label style={{ fontSize: 12 }}>Stk/Presse</label>
              <input type="number" min="0" value={neuProdukt.stueck_pro_presse} onChange={(e) => setNeuProdukt({ ...neuProdukt, stueck_pro_presse: e.target.value })} style={{ width: '100%' }} placeholder="0" />
            </div>
            <button className="btn btn-primary" onClick={addProdukt}>+</button>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>
          Standard: Ein Produkt mit dem oben angegebenen Teiggewicht
        </p>
      )}

      {istKuchen && (
        <>
          <h3 style={{ fontSize: 14, margin: '12px 0 6px' }}>Berechnungsmodus</h3>
          <select value={form.berechnung} onChange={(e) => set('berechnung', e.target.value)} style={{ width: '100%', marginBottom: 10 }}>
            <option value="blech">Blechgröße (Fläche)</option>
            <option value="stueck">Stückzahl (Gewicht)</option>
          </select>
        </>
      )}

      <h3 style={{ fontSize: 14, margin: '12px 0 6px' }}>Backform / Blech</h3>
      <div className="form-grid-2">
        {feld('Breite (cm)', 'blech_breite_cm', { type: 'number', min: 0, placeholder: 'z.B. 50' })}
        {feld('Länge (cm)', 'blech_laenge_cm', { type: 'number', min: 0, placeholder: 'z.B. 80' })}
      </div>

      <h3 style={{ fontSize: 14, margin: '12px 0 6px' }}>Prozessparameter</h3>
      <div className="form-grid-4">
        {feld('Teigtemp. °C', 'teigtemp_c', { type: 'number', step: 0.1 })}
        {feld('Kneten l. (min)', 'kz_langsam', { type: 'number', min: 0 })}
        {feld('Kneten s. (min)', 'kz_schnell', { type: 'number', min: 0 })}
        {feld('Stockgare (min)', 'stockgare', { type: 'number', min: 0 })}
      </div>
      <div className="form-grid-4">
        {feld('Stückgare (min)', 'stueckgare', { type: 'number', min: 0 })}
        {feld('Ober °C', 'back_ober', { type: 'number', step: 5 })}
        {feld('Unter °C', 'back_unter', { type: 'number', step: 5 })}
        {feld('Backzeit (min)', 'backzeit', { type: 'number', min: 0 })}
      </div>
      <div className="form-grid-2" style={{ alignItems: 'end' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={form.bedampfung} onChange={(e) => set('bedampfung', e.target.checked)} />
          <span>Bedampfung</span>
        </label>
        {feld('Bedampfungs-Hinweis', 'bedampf_hinweis', { placeholder: 'z.B. 2× stoßen' })}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Hinweis zur Nährwertberechnung
          <textarea value={form.naehrwert_hinweis || ''} onChange={e => set('naehrwert_hinweis', e.target.value)} rows={2} style={{ width: '100%' }} placeholder="z. B. Streuselmenge nach Augenmaß – Berechnung ist eine Schätzung" />
        </label>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label>Anmerkungen für Teigmacher</label>
        <textarea
          value={form.anmerkungen}
          onChange={(e) => set('anmerkungen', e.target.value)}
          rows={3}
          style={{ width: '100%' }}
          placeholder="z.B. Teig nicht über 28 °C"
        />
      </div>
    </Modal>
  );
}
