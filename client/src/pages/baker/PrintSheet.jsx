// A4-Rezeptblatt (nur im Druck sichtbar, styles/print.css).
// Wie printRezept() der alten App: Kopf (Name, Menge, TA, Datum) +
// skalierte Zutaten mit Abschnitten/Zwischensummen/Dosen/Arbeitsschritten
// + TEIG GESAMT. Bewusst KEINE Backparameter/Allergene/Naehrwerte.

import { gruppiereZutaten, fmtSektionsSumme } from '../../lib/calc/sektionen.js';
import { ta } from '../../lib/calc/ta.js';
import '../../styles/print.css';

export default function PrintSheet({ rezept, sk, teigGesamtKg, mengeInfo }) {
  if (!rezept || !sk) return <div id="print-sheet" />;
  const sections = gruppiereZutaten(rezept, sk);
  const gtG = Math.round(teigGesamtKg * 1000);
  const gesamtStr =
    gtG >= 1000
      ? `${(gtG / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
      : `${gtG.toLocaleString('de-DE')} g`;

  return (
    <div id="print-sheet">
      <div className="print-kopf">
        <h1>{rezept.name}</h1>
        <div className="print-meta">
          <span>{mengeInfo}</span>
          <span>TA {ta(rezept)}</span>
          <span>{new Date().toLocaleDateString('de-DE')}</span>
        </div>
      </div>
      {sections.map((sec, si) => (
        <div key={si}>
          <div className="print-sec-header">{sec.name}</div>
          {sec.rows.map((row) =>
            row.typ === 'kommentar' ? (
              <div className="print-comment" key={row.idx}>» {row.zutat.name}</div>
            ) : (
              <div className="print-row" key={row.idx}>
                <span>{row.zutat.name}</span>
                <span className="menge">
                  {row.dosenStr ? `${row.dosenStr} (${row.mengeStr})` : row.mengeStr}
                </span>
              </div>
            )
          )}
          {sec.count > 1 && (
            <div className="print-row print-sum">
              <span>Σ {sec.name}</span>
              <span className="menge">{fmtSektionsSumme(sec.sum)}</span>
            </div>
          )}
        </div>
      ))}
      <div className="print-gesamt">
        <span>TEIG GESAMT</span>
        <span className="menge">{gesamtStr}</span>
      </div>
    </div>
  );
}
