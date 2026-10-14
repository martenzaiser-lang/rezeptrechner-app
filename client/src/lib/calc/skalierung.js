import { skaliereMitBezug } from './prozentSkalierung.js';

export const getEinzelGewicht = r => r.produkte?.length === 1 && r.produkte[0].gewicht_g > 0 ? r.produkte[0].gewicht_g : r.stueckgewicht_g || 1000;
export const skaliere = (r, n) => n > 0 ? skaliereMitBezug(r, { zielKg: n * getEinzelGewicht(r) / 1000,
  pressen: r.produkte?.length === 1 && r.produkte[0].stueck_pro_presse > 0 ? n / r.produkte[0].stueck_pro_presse : 0,
  produktName: r.produkte?.length === 1 ? r.produkte[0].name : undefined,
}) : r.zutaten.map(() => 0);
export const skaliereByFactor = (r, f) => f > 0 ? skaliereMitBezug(r, { faktor: f }) : r.zutaten.map(() => 0);
export const blechFaktor = (r, anzahl = 1, breite, laenge) => {
  const b = r.blech_breite_cm > 0 ? r.blech_breite_cm : 50;
  const l = r.blech_laenge_cm > 0 ? r.blech_laenge_cm : 80;
  const n = Number(anzahl), neuB = breite ?? b, neuL = laenge ?? l;
  if (!Number.isFinite(n) || n < 0 || !Number.isFinite(neuB) || neuB <= 0 || !Number.isFinite(neuL) || neuL <= 0) throw new Error('Blechanzahl und positive Blechmaße prüfen.');
  return n * neuB * neuL / (b * l);
};
export const skaliereBlech = (r, n = 1, b, l) => skaliereMitBezug(r, { faktor: blechFaktor(r, n, b, l) });
export const schluesselzahl = (r, n) => {
  const charge = skaliereMitBezug(r, { faktor: 1 }).reduce((s,v) => s+v,0);
  return charge > 0 ? n * getEinzelGewicht(r) / 1000 / charge : 0;
};
