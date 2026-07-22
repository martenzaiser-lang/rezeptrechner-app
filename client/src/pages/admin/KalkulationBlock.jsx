// Verkaufspreis-Kalkulation im Admin-Rezeptdetail (aufklappbar wie der
// Kosten-/LMIV-Block). Zielquoten-Kalkulation (lib/kalkulation.js) auf
// Basis der Rohstoffkosten; Quoten sind direkt im Block editierbar und
// werden in settings.kalkulation gespeichert (gelten für alle Rezepte).

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { berechneRohstoffkosten } from '../../lib/preise.js';
import { KALKULATION_DEFAULTS, kalkuliereVk } from '../../lib/kalkulation.js';

const de = (v, dez = 2) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: dez, maximumFractionDigits: dez });

const FELDER = [
  ['schwundPct', 'Retoure/Schwund %'],
  ['personalPct', 'Personal %'],
  ['energiePct', 'Energie %'],
  ['gemeinkostenPct', 'Gemeinkosten %'],
  ['gewinnPct', 'Gewinn %'],
  ['ustPct', 'USt %'],
];

export default function KalkulationBlock({ rezept, eigenePreise = {}, kalkulation, onSave }) {
  const [offen, setOffen] = useState(false);
  const [draft, setDraft] = useState(null); // nur gesetzt, solange editiert wird

  const gespeichert = { ...KALKULATION_DEFAULTS, ...(kalkulation || {}) };
  const num = (v) => parseFloat(String(v).replace(',', '.'));
  const aktiv = draft
    ? Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Number.isFinite(num(v)) ? num(v) : 0]))
    : gespeichert;

  const { summe: rohstoffe, ohnePreis, istBlech } = berechneRohstoffkosten(rezept, eigenePreise);
  const k = kalkuliereVk(rohstoffe, aktiv);
  const bezug = istBlech
    ? `pro Blech ${rezept.blech_breite_cm || 50}×${rezept.blech_laenge_cm || 80} cm`
    : `pro Stück (${rezept.stueckgewicht_g || 1000} g Teig)`;
  const fertigGramm = !istBlech && rezept.backverlust_pct > 0
    ? (rezept.stueckgewicht_g || 1000) * (1 - rezept.backverlust_pct / 100)
    : null;

  return (
    <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <button
        className="btn btn-ghost"
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}
        onClick={() => setOffen(!offen)}
      >
        <strong>
          Verkaufspreis: {k ? `${de(k.empfohlen)} €` : '—'} {bezug}
          {ohnePreis.length > 0 && (
            <span style={{ color: 'var(--error)', fontWeight: 400 }}> — Rohstoffe unvollständig!</span>
          )}
        </strong>
        {offen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {offen && (
        <div style={{ padding: '0 14px 14px', fontSize: 13 }}>
          {!k && (
            <p style={{ color: 'var(--error)' }}>
              Kalkulation nicht möglich — Quoten lassen keinen Materialanteil übrig oder Rohstoffkosten fehlen.
            </p>
          )}
          {k && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, maxWidth: 420 }}>
                <span>Rohstoffkosten {bezug}</span>
                <span style={{ textAlign: 'right' }}>{de(rohstoffe, 3)} €</span>
                <span className="muted">+ Retoure/Schwund {de(aktiv.schwundPct, 0)} %</span>
                <span className="muted" style={{ textAlign: 'right' }}>{de(k.rkEff, 3)} €</span>
                <span>
                  ÷ Materialanteil {de(k.materialPct, 0)} %
                  <span className="muted"> (100 − Personal − Energie − Gemeinkosten − Gewinn)</span>
                </span>
                <span style={{ textAlign: 'right' }}>{de(k.netto)} € netto</span>
                <span>+ {de(aktiv.ustPct, 0)} % USt</span>
                <span style={{ textAlign: 'right' }}>{de(k.brutto)} €</span>
                <span style={{ fontWeight: 700, fontSize: 15, paddingTop: 6 }}>Empfohlener VK (auf 5 ct aufgerundet)</span>
                <span style={{ fontWeight: 700, fontSize: 15, paddingTop: 6, textAlign: 'right' }}>{de(k.empfohlen)} €</span>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Kontrolle: Faktor {de(k.faktor, 1)} auf die Rohstoffe (netto)
                {fertigGramm ? ` · ${de(k.empfohlen / (fertigGramm / 1000))} €/kg verkaufsfertig` : ''}
              </div>
              {ohnePreis.length > 0 && (
                <p style={{ color: 'var(--error)', marginTop: 6, marginBottom: 0 }}>
                  Ohne Preis (Kalkulation zu niedrig): {ohnePreis.join(', ')}
                </p>
              )}
            </>
          )}

          <h4 style={{ fontSize: 13, margin: '14px 0 6px' }}>Zielquoten (Betrieb, gelten für alle Rezepte)</h4>
          <div className="form-grid-4" style={{ gap: 8, maxWidth: 560 }}>
            {FELDER.map(([key, label]) => (
              <div key={key}>
                <label style={{ fontSize: 11 }}>{label}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft ? draft[key] : String(gespeichert[key]).replace('.', ',')}
                  onChange={(e) =>
                    setDraft({
                      ...(draft || Object.fromEntries(FELDER.map(([f]) => [f, String(gespeichert[f]).replace('.', ',')]))),
                      [key]: e.target.value,
                    })
                  }
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>
          {draft && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await onSave(aktiv);
                  setDraft(null);
                }}
              >
                Quoten speichern
              </button>
              <button className="btn btn-ghost" onClick={() => setDraft(null)}>Verwerfen</button>
            </div>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
            Defaults = Branchenwerte Bäckerhandwerk 2026 (Betriebsvergleich: Wareneinsatz 27–31 %,
            Personal &gt; 40 %, Umsatzrendite 6–8 %). Mit eigenen Zahlen aus der BWA ersetzen,
            sobald verfügbar.
          </p>
        </div>
      )}
    </div>
  );
}
