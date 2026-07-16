// Produktionsplanung: Rohstoffbedarf ueber mehrere Rezepte — Datenteil
// 1:1 aus der alten App (index.html Z. 3577-3607 calcPlanung), ohne HTML.
//
// planungData = { rezeptId: stueckzahl }

import { skaliere } from './skalierung.js';

export function berechnePlanung(rezepte, planungData) {
  const results = { zutaten: {}, koerner: {}, sauerteig: {}, teige: [] };
  let totalTeig = 0;

  Object.entries(planungData).forEach(([id, stueck]) => {
    if (stueck <= 0) return;
    const r = rezepte.find((x) => x.id === id);
    if (!r) return;
    const sk = skaliere(r, stueck);
    const gt = sk.reduce((a, b) => a + b, 0);
    totalTeig += gt;
    results.teige.push({ name: r.name, stueck, gewicht: gt });
    r.zutaten.forEach((z, idx) => {
      const menge = sk[idx] || 0;
      if (!results.zutaten[z.name]) {
        results.zutaten[z.name] = { menge: 0, ist_mehl: z.ist_mehl, ist_wasser: z.ist_wasser };
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
