// Rezept-Editor: alle Stammdaten-Felder wie die alte App (#m-rezept):
// Name, Kategorie, aktiv, Stückkalkulation, Multi-Produkte, Berechnungs-
// modus (bei Kuchen), Blechmaße, Prozessparameter, Bedampfung, Anmerkungen.
// Zutaten werden in der Detail-Ansicht bearbeitet.

import { useState } from 'react';
import Modal from '../../components/Modal.jsx';

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
    berechnung: r.berechnung || ((r.kategorie || 'Brot') === 'Kuchen' ? 'blech' : 'stueck'),
    stueckgewicht_g: r.stueckgewicht_g ?? 1000,
    min_stueck: r.min_stueck ?? 1,
    max_stueck: r.max_stueck ?? 999,
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
  });
  const [multi, setMulti] = useState(Boolean(r.produkte && r.produkte.length > 1));
  const [produkte, setProdukte] = useState(r.produkte ? r.produkte.map((p) => ({ ...p })) : []);
  const [neuProdukt, setNeuProdukt] = useState({ name: '', gewicht_g: '', stueck_pro_presse: '' });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const istKuchen = form.kategorie === 'Kuchen';

  function addProdukt() {
    if (!neuProdukt.name.trim() || !num(neuProdukt.gewicht_g)) return;
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
      produkte: multi ? produkte : produkte.slice(0, 1),
    });
  }

  const feld = (label, key, props = {}) => (
    <div>
      <label style={{ fontSize: 13 }}>{label}</label>
      <input
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
      <div className="form-grid-2">
        <div>
          <label>Rezeptname</label>
          <input value={form.name} autoFocus onChange={(e) => set('name', e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label>Kategorie</label>
          <select value={form.kategorie} onChange={(e) => set('kategorie', e.target.value)} style={{ width: '100%' }}>
            {KATEGORIEN.map((k) => <option key={k}>{k}</option>)}
            {!KATEGORIEN.includes(form.kategorie) && <option>{form.kategorie}</option>}
          </select>
        </div>
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input type="checkbox" checked={form.aktiv} onChange={(e) => set('aktiv', e.target.checked)} />
        <span>Rezept aktiv</span>
      </label>

      <h3 style={{ fontSize: 14, margin: '12px 0 6px' }}>Stückkalkulation</h3>
      <div className="form-grid-3">
        {feld('Teiggewicht (g)', 'stueckgewicht_g', { type: 'number', step: 1 })}
        {feld('Min. Stückzahl', 'min_stueck', { type: 'number', min: 1 })}
        {feld('Max. Stückzahl', 'max_stueck', { type: 'number', min: 1 })}
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
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {p.gewicht_g} g{p.stueck_pro_presse > 0 ? ` · ${p.stueck_pro_presse} Stk/Presse` : ''}
              </span>
              <button className="btn btn-ghost" onClick={() => setProdukte(produkte.filter((_, j) => j !== i))}>✕</button>
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
