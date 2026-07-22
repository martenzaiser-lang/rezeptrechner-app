// Kosten-Block im Admin-Rezeptdetail: Zutatenkosten pro Stück (bzw. pro
// Basis-Blech bei Kuchen), aufklappbar wie der LMIV-Block. Eigene Preise
// (DB, u.a. KBO-Import) haben Vorrang vor den BÄKO-Standardpreisen.
// Zutaten ohne Preis werden deutlich markiert, damit die Summe nicht
// stillschweigend zu niedrig ausfällt (Wasser zählt bewusst als 0 €).

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { skaliere, skaliereBlech } from '../../lib/calc/skalierung.js';
import { findZutatPreis } from '../../lib/preise.js';

const de = (v, dez = 2) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: dez, maximumFractionDigits: dez });

export default function KostenBlock({ rezept, eigenePreise = {} }) {
  const [offen, setOffen] = useState(false);

  const istBlech = rezept.berechnung === 'blech';
  const sk = istBlech ? skaliereBlech(rezept, 1) : skaliere(rezept, 1);
  const bezug = istBlech
    ? `pro Blech ${rezept.blech_breite_cm || 50}×${rezept.blech_laenge_cm || 80} cm`
    : `pro Stück (${rezept.stueckgewicht_g || 1000} g Teig)`;

  const zeilen = [];
  let summe = 0;
  const ohnePreis = [];
  rezept.zutaten.forEach((z, idx) => {
    if (z.ist_kommentar || !z.name || z.name.toLowerCase() === 'gesamt') return;
    const kg = sk[idx] || 0;
    if (kg <= 0) return;
    const eigen = eigenePreise[z.name];
    const preisKg = eigen?.preis_kg ?? findZutatPreis(z.name);
    const istWasser = z.name.toLowerCase().includes('wasser');
    const kosten = preisKg != null ? kg * preisKg : 0;
    summe += kosten;
    if (preisKg == null && !istWasser) ohnePreis.push(z.name);
    zeilen.push({
      name: z.name,
      gramm: kg * 1000,
      preisKg,
      kosten,
      quelle: eigen?.preis_kg != null ? 'eigen' : preisKg != null ? 'bäko' : istWasser ? 'wasser' : 'fehlt',
    });
  });

  return (
    <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <button
        className="btn btn-ghost"
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}
        onClick={() => setOffen(!offen)}
      >
        <strong>
          Kosten: {de(summe)} € {bezug}
          {ohnePreis.length > 0 && (
            <span style={{ color: 'var(--error)', fontWeight: 400 }}> — {ohnePreis.length} Zutat{ohnePreis.length > 1 ? 'en' : ''} ohne Preis!</span>
          )}
        </strong>
        {offen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {offen && (
        <div style={{ padding: '0 14px 14px' }}>
          {zeilen.map((z, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 8, fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border)' }}
            >
              <span style={{ flex: 1, fontWeight: 600 }}>{z.name}</span>
              <span className="muted" style={{ width: 70, textAlign: 'right' }}>{de(z.gramm, z.gramm < 10 ? 1 : 0)} g</span>
              <span className="muted" style={{ width: 110, textAlign: 'right' }}>
                {z.quelle === 'fehlt' ? (
                  <span style={{ color: 'var(--error)' }}>kein Preis!</span>
                ) : z.quelle === 'wasser' ? (
                  '—'
                ) : (
                  <span title={z.quelle === 'eigen' ? 'eigener Preis (Preisliste/DB)' : 'BÄKO-Standardpreis (App-intern)'}>
                    {de(z.preisKg)} €/kg{z.quelle === 'bäko' ? '*' : ''}
                  </span>
                )}
              </span>
              <span style={{ width: 80, textAlign: 'right' }}>{z.quelle === 'fehlt' ? '?' : `${de(z.kosten, 3)} €`}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, paddingTop: 8 }}>
            <span>Summe {bezug}</span>
            <span>{de(summe)} €{ohnePreis.length > 0 ? ' + ?' : ''}</span>
          </div>
          {!istBlech && (rezept.stueckgewicht_g || 0) > 0 && (
            <div className="muted" style={{ fontSize: 13 }}>
              = {de((summe / rezept.stueckgewicht_g) * 1000)} € pro kg Teig
            </div>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
            * BÄKO-Standardpreis (Stand 03/2026, App-intern) — eigener Preis in der DB fehlt.
            {ohnePreis.length > 0 && (
              <> Ohne Preis: {ohnePreis.join(', ')} — die Summe ist entsprechend zu niedrig.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
