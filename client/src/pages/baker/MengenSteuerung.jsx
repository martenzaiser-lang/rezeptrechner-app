// Mengensteuerung: Stueck-Stepper / Blech-Eingaben / Multi-Produkt-Cards
// + Teiler-Auswahl + Teig-Gesamt-Box. Verhalten wie alte App.

import { parseLocaleFloat } from '../../lib/format.js';

const TEILER = [
  { v: 1, label: '1× (Voll)' },
  { v: 0.5, label: '½ (Halb)' },
  { v: 0.333, label: '⅓ (Drittel)' },
  { v: 0.25, label: '¼ (Viertel)' },
  { v: 0.2, label: '⅕ (Fünftel)' },
  { v: 2, label: '2× (Doppelt)' },
];

export default function MengenSteuerung({ rezept, eingabe, onChange, ergebnis }) {
  const isBlech = rezept.berechnung === 'blech';
  const hasMulti = rezept.produkte && rezept.produkte.length > 1;

  const set = (patch) => onChange({ ...eingabe, ...patch });

  const setStueck = (v) => {
    const max = rezept.max_stueck || 999;
    set({ stueck: Math.max(0, Math.min(max, v)) });
  };

  const setProdukt = (name, v) => {
    set({ produktStueck: { ...eingabe.produktStueck, [name]: Math.max(0, v) } });
  };

  const teigStr = ergebnis
    ? (() => {
        const gtG = Math.round(ergebnis.teigGesamtKg * 1000);
        const s = gtG >= 1000 ? ergebnis.teigGesamtKg.toFixed(2).replace('.', ',') + ' kg' : gtG + ' g';
        return s + (ergebnis.faktor !== 1 ? ` (×${ergebnis.faktor})` : '');
      })()
    : '–';

  return (
    <div>
      {hasMulti && (
        <div className="mp-wrap">
          {rezept.produkte.map((p, i) => {
            const isPresse = p.stueck_pro_presse > 0;
            const val = eingabe.produktStueck?.[p.name] || 0;
            return (
              <div className="mp-card" key={i} title={`${p.name} (${p.gewicht_g}g${isPresse ? ' · ' + p.stueck_pro_presse + ' Stk/Presse' : ''})`}>
                <span className="mp-name">{p.name}</span>
                <span className="mp-weight">{isPresse ? `${p.stueck_pro_presse}×${p.gewicht_g}g` : `${p.gewicht_g}g`}</span>
                <div className="mp-controls">
                  <button onClick={() => setProdukt(p.name, val - 1)}>−</button>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={String(val).replace('.', ',')}
                    placeholder={isPresse ? 'Pressen' : 'Stück'}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setProdukt(p.name, parseLocaleFloat(e.target.value))}
                  />
                  <button onClick={() => setProdukt(p.name, val + 1)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="baker-ctrl">
        {isBlech && (
          <>
            <div className="stepper">
              <button onClick={() => set({ blechN: Math.max(1, (eingabe.blechN || 1) - 1) })}>−</button>
              <input
                type="text"
                inputMode="numeric"
                value={eingabe.blechN || 1}
                onFocus={(e) => e.target.select()}
                onChange={(e) => set({ blechN: Math.max(1, parseInt(e.target.value) || 1) })}
              />
              <button onClick={() => set({ blechN: (eingabe.blechN || 1) + 1 })}>+</button>
            </div>
            <span style={{ fontWeight: 700 }}>×</span>
            <input
              className="blech-input"
              type="text"
              inputMode="decimal"
              value={eingabe.blechB || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => set({ blechB: parseLocaleFloat(e.target.value) })}
              aria-label="Blechbreite (cm)"
            />
            <span style={{ fontWeight: 700 }}>×</span>
            <input
              className="blech-input"
              type="text"
              inputMode="decimal"
              value={eingabe.blechL || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => set({ blechL: parseLocaleFloat(e.target.value) })}
              aria-label="Blechlänge (cm)"
            />
            <span className="muted" style={{ fontSize: 13 }}>cm</span>
          </>
        )}

        {!isBlech && !hasMulti && (
          <div className="stepper">
            <button onClick={() => setStueck((eingabe.stueck || 0) - 1)}>−</button>
            <input
              type="text"
              inputMode="decimal"
              value={String(eingabe.stueck ?? 0).replace('.', ',')}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setStueck(parseLocaleFloat(e.target.value))}
              aria-label="Stückzahl"
            />
            <button onClick={() => setStueck((eingabe.stueck || 0) + 1)}>+</button>
            <span className="muted" style={{ fontSize: 13, marginLeft: 4 }}>Stück</span>
          </div>
        )}

        {!isBlech && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
            Teiler
            <select
              value={eingabe.faktor || 1}
              onChange={(e) => set({ faktor: parseFloat(e.target.value) || 1 })}
              style={{ minHeight: 40 }}
            >
              {TEILER.map((t) => (
                <option key={t.v} value={t.v}>{t.label}</option>
              ))}
            </select>
          </label>
        )}

        <div className="teig-box">
          <div className="teig-lbl">Teig</div>
          <div className="teig-val">
            {teigStr}
            {ergebnis?.proBlechKg != null && (
              <div className="pro-blech">
                {Math.round(ergebnis.proBlechKg * 1000) >= 1000
                  ? ergebnis.proBlechKg.toFixed(2).replace('.', ',') + ' kg'
                  : Math.round(ergebnis.proBlechKg * 1000) + ' g'}{' '}
                / Blech
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
