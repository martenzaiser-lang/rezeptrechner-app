import { skaliereMitBezug } from './prozentSkalierung.js';

// Jede Variante separat berechnen, dann addieren: A+B = A einzeln + B einzeln.
export function skaliereMultiProdukt(r, map = {}) {
  return (r.produkte || []).reduce((summe, p) => {
    const n = Number(map[p.name]) || 0;
    if (n <= 0) return summe;
    const pressen = p.stueck_pro_presse > 0 ? n : 0;
    const stueck = pressen ? pressen * p.stueck_pro_presse : n;
    const sk = skaliereMitBezug(r, { zielKg: stueck * p.gewicht_g / 1000,
      pressen, produktName: p.name });
    return summe.map((v, i) => v + sk[i]);
  }, r.zutaten.map(() => 0));
}
export function multiSchluesselzahl(r, map) {
  const sk = skaliereMultiProdukt(r, map);
  const i = r.zutaten.findIndex(z => !z.ist_kommentar && z.name.toLowerCase() !== 'gesamt' && z.menge_kg > 0 && !z.menge_pro_presse && !z.fuer_produkte?.length);
  return i < 0 ? 0 : sk[i] / r.zutaten[i].menge_kg;
}
