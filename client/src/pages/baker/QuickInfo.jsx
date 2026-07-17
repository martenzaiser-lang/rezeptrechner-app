// Quick-Info-Chips: TA, Knetzeiten, Teigtemperatur, Garezeiten, Backzeit,
// Backtemperatur, Bedampfung + Naehrwert-/Allergen-Chips — wie die alte
// App (Z. 2908-2930). Sichtbarkeit pro Chip global steuerbar
// (Admin-Einstellungen → anzeige-Prop, lib/anzeige.js).

import { ta } from '../../lib/calc/ta.js';
import { calcNutrition, getRezeptAllergene, formatAllergene } from '../../lib/calc/naehrwerteLookup.js';
import { ANZEIGE_DEFAULTS } from '../../lib/anzeige.js';

export default function QuickInfo({ rezept, sk, anzeige = ANZEIGE_DEFAULTS, customZutaten = [] }) {
  const r = rezept;
  const nw = anzeige.naehrwerte && sk ? calcNutrition(r, sk) : null;
  const allergene = anzeige.allergene ? getRezeptAllergene(r, customZutaten) : [];

  return (
    <div className="baker-quick-info">
      {anzeige.ta && (
        <span className="quick-chip highlight"><span className="chip-val">TA {ta(r)}</span></span>
      )}
      {anzeige.knetzeiten && (r.kz_langsam || r.kz_schnell) ? (
        <span className="quick-chip">🥣 <span className="chip-val">{r.kz_langsam || 0}/{r.kz_schnell || 0} min</span></span>
      ) : null}
      {anzeige.teigtemp && r.teigtemp_c ? (
        <span className="quick-chip">🌡️ <span className="chip-val">{Number(r.teigtemp_c).toFixed(0)}°C</span></span>
      ) : null}
      {anzeige.garezeiten && r.stockgare ? (
        <span className="quick-chip">⏱️ Stock <span className="chip-val">{r.stockgare} min</span></span>
      ) : null}
      {anzeige.garezeiten && r.stueckgare ? (
        <span className="quick-chip">⏱️ Stück <span className="chip-val">{r.stueckgare} min</span></span>
      ) : null}
      {anzeige.backdaten && r.backzeit ? (
        <span className="quick-chip">🔥 <span className="chip-val">{r.backzeit} min</span></span>
      ) : null}
      {anzeige.backdaten && (r.back_ober || r.back_unter) ? (
        <span className="quick-chip">{r.back_ober || '–'}°/{r.back_unter || '–'}°</span>
      ) : null}
      {anzeige.bedampfung && r.bedampfung ? (
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
