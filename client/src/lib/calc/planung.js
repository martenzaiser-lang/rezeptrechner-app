// Produktionsplanung: Rohstoffbedarf ueber mehrere Rezepte — Datenteil
// 1:1 aus der alten App (index.html Z. 3577-3607 calcPlanung), ohne HTML.
//
// planungData = { rezeptId: stueckzahl }

import { berechneBaker } from './bakerBerechnung.js';
import { taBilanz, istGewicht, isFluessigkeit, istKeinTaMehl } from './ta.js';

export function berechnePlanung(rezepte, planungData) {
  const results = { zutaten: Object.create(null), koerner: Object.create(null), sauerteig: Object.create(null), teige: [], fehler: [], gesamtMehl: 0 };
  let totalTeig = 0;

  Object.entries(planungData).forEach(([id, menge]) => {
    const r = rezepte.find((x) => x.id === id);
    if (!r) return;
    const e = typeof menge === 'number' ? { stueck: menge, blechN: menge } : menge;
    const berechnet = berechneBaker(r, e);
    if (berechnet?.fehler) { results.fehler.push(`${r.name}: ${berechnet.fehler}`); return; }
    if (!berechnet || berechnet.teigGesamtKg <= 0) return;
    const { sk, teigGesamtKg: gt } = berechnet;
    const bilanz = taBilanz(r,sk);
    if (bilanz.fehler.length) results.gesamtMehl = null;
    else if (results.gesamtMehl != null) results.gesamtMehl += bilanz.mehl;
    totalTeig += gt;
    results.teige.push({ id: r.id, name: r.name, stueck: berechnet.stueckzahl, mengeText: berechnet.isBlech ? `${berechnet.blechAnzahl} Blech` : `${berechnet.stueckzahl} Stück`, gewicht: gt });
    r.zutaten.forEach((z, idx) => {
      const menge = sk[idx] || 0;
      if (!istGewicht(z) || menge <= 0) return;
      if (!results.zutaten[z.name]) {
        results.zutaten[z.name] = { menge: 0, ist_mehl: !istKeinTaMehl(z) && (z.ta_rolle === 'mehl' || (!z.ta_rolle && z.ist_mehl)), ist_wasser: isFluessigkeit(z) };
      }
      results.zutaten[z.name].menge += menge;
      const bem = (z.bemerkung || '').toLowerCase();
      if (bem.includes('quell') || bem.includes('koch') || bem.includes('brüh')) {
        if (!results.koerner[z.name]) results.koerner[z.name] = 0;
        results.koerner[z.name] += menge;
      }
      if (bem.includes('sauer') || z.name.toLowerCase().includes('sauer')) {
        if (!results.sauerteig[z.name]) results.sauerteig[z.name] = 0;
        results.sauerteig[z.name] += menge;
      }
    });
  });

  return { ...results, totalTeig };
}
