import { istGewicht, taBilanz, kochstueckAusgleich } from './ta.js';

export function kochstuecke(rezept, sk) {
  const gruppen = new Map();
  rezept.zutaten.forEach((z, i) => {
    if (!istGewicht(z) || !(sk?.[i] > 0)) return;
    const abschnitt = /kochstück/i.test(z.bemerkung || '') ? z.bemerkung : /kochstück/i.test(z.name) ? z.name : null;
    if (!abschnitt) return;
    if (!gruppen.has(abschnitt)) gruppen.set(abschnitt, rezept.zutaten.map(() => 0));
    gruppen.get(abschnitt)[i] = sk[i];
  });
  return [...gruppen].map(([name, mengen]) => ({ name, sollKg: mengen.reduce((s, n) => s + n, 0), bilanz: taBilanz(rezept, mengen) }));
}

export function pruefeKochwaage(stufe, istKg) {
  const result = kochstueckAusgleich(stufe.sollKg, istKg);
  if (result.status !== 'korrekt') return { ...result, fehler: 'Istgewicht prüfen: Netto nach Abkühlen, ohne Gefäß.' };
  if (stufe.bilanz.fehler.length) return { status: 'unvollständig', fehler: 'Flüssigkeitsanteil der Vorstufe fehlt.' };
  if (result.wasserNachfuellenKg > stufe.bilanz.fluessigkeit + 1e-9) return { status: 'prüfen', fehler: 'Gewichtsverlust übersteigt die enthaltene Flüssigkeit. Waage und Charge prüfen.' };
  return result;
}
