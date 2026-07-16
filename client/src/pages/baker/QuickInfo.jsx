// Quick-Info-Chips: TA, Knetzeiten, Teigtemperatur, Garezeiten, Backzeit,
// Backtemperatur, Bedampfung + Naehrwert-/Allergen-Chips — wie die alte
// App (Z. 2908-2930).

import { ta } from '../../lib/calc/ta.js';
import { calcNutrition, getRezeptAllergene, formatAllergene } from '../../lib/calc/naehrwerteLookup.js';

export default function QuickInfo({ rezept, sk }) {
  const r = rezept;
  const nw = sk ? calcNutrition(r, sk) : null;
  const allergene = getRezeptAllergene(r);

  return (
    <div className="baker-quick-info">
      <span className="quick-chip highlight"><span className="chip-val">TA {ta(r)}</span></span>
      {(r.kz_langsam || r.kz_schnell) ? (
        <span className="quick-chip">🥣 <span className="chip-val">{r.kz_langsam || 0}/{r.kz_schnell || 0} min</span></span>
      ) : null}
      {r.teigtemp_c ? (
        <span className="quick-chip">🌡️ <span className="chip-val">{Number(r.teigtemp_c).toFixed(0)}°C</span></span>
      ) : null}
      {r.stockgare ? (
        <span className="quick-chip">⏱️ Stock <span className="chip-val">{r.stockgare} min</span></span>
      ) : null}
      {r.stueckgare ? (
        <span className="quick-chip">⏱️ Stück <span className="chip-val">{r.stueckgare} min</span></span>
      ) : null}
      {r.backzeit ? (
        <span className="quick-chip">🔥 <span className="chip-val">{r.backzeit} min</span></span>
      ) : null}
      {(r.back_ober || r.back_unter) ? (
        <span className="quick-chip">{r.back_ober || '–'}°/{r.back_unter || '–'}°</span>
      ) : null}
      {r.bedampfung ? (
        <span className="quick-chip chip-dampf">💨 {r.bedampf_hinweis || 'Dampf'}</span>
      ) : null}
      {nw?.vollstaendig && nw.gesamt > 0 && (
        <span className="quick-chip highlight">
          🔥 <span className="chip-val">{Math.round(nw.kcal / (nw.gesamt / 100))}</span> kcal/100g
        </span>
      )}
      {nw && !nw.vollstaendig && nw.fehlend.length > 0 && (
        <span className="quick-chip chip-warn" title={nw.fehlend.join(', ')}>
          ⚠️ {nw.fehlend.length} Zutaten ohne Daten
        </span>
      )}
      {allergene.length > 0 && (
        <span className="quick-chip chip-warn" title={formatAllergene(allergene, true)}>
          ⚠️ {allergene.length} Allergene
        </span>
      )}
    </div>
  );
}
