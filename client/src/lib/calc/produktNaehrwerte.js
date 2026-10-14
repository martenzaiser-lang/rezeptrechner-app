import { berechneNaehrwerte, findNaehrwerte, getRezeptAllergenStatus, getRezeptZutatenStatus } from './naehrwerteLookup.js';

import { NAEHRWERT_FELDER } from './naehrwertFelder.js';
export { NAEHRWERT_FELDER } from './naehrwertFelder.js';
export function produktNaehrwerte(rezept, customZutaten = []) {
  const roh = berechneNaehrwerte(rezept, customZutaten);
  const vergleichsartikel = [...new Set(rezept.zutaten.filter(z => !z.ist_kommentar && z.menge_kg > 0).map(z => findNaehrwerte(z.name, customZutaten)?.referenz_artikel).filter(Boolean))];
  const hinweise = [...new Set([rezept.naehrwert_hinweis, ...rezept.zutaten.filter(z => !z.ist_kommentar && z.menge_kg > 0).map(z => findNaehrwerte(z.name, customZutaten)?.naehrwert_hinweis)].filter(Boolean))];
  const bv = rezept.backverlust_pct;
  const zahl = typeof bv === 'number' && Number.isFinite(bv) && bv >= 0 && bv < 100;
  const status = rezept.backverlust_status || 'unbestaetigt';
  const bekannt = zahl && ['gemessen', 'geschaetzt'].includes(status);
  const faktor = bekannt ? 100 / (100 - bv) : 1;
  const werte = roh && Object.fromEntries(NAEHRWERT_FELDER.map(k => [k, roh[k] == null ? null : roh[k] * faktor]));
  // Zucker gehört bereits zu KH, gesättigte FS bereits zu Fett. Nur disjunkte
  // Gruppen addieren; kleine Rundungsabweichungen der Quellen zulassen.
  const unplausibel = werte && ['eiweiss', 'fett', 'kh', 'ballaststoffe', 'salz'].reduce((s,k) => s + werte[k], 0) > 102;
  const fehlend = rezept.berechnungsfehler ? [rezept.berechnungsfehler] : [...(roh?.fehlend || [])];
  if (!roh && !fehlend.length) fehlend.push('Keine berechenbare Zutatenmenge');
  if (unplausibel) fehlend.push('Gewichtsverlust oder Produktdaten prüfen: unplausible Nährstoffsumme pro 100 g.');
  const allergenStatus = getRezeptAllergenStatus(rezept, customZutaten);
  const zutatenStatus = getRezeptZutatenStatus(rezept, customZutaten);
  const deklarationsFehler = [...fehlend];
  if (!allergenStatus.vollstaendig && allergenStatus.fehlend.length) {
    deklarationsFehler.push(`Allergenangaben ungeprüft: ${allergenStatus.fehlend.join(', ')}`);
  }
  if (zutatenStatus.fehlend.length) deklarationsFehler.push(`Zusammensetzung ungeprüft: ${zutatenStatus.fehlend.join(', ')}`);
  return { werte, vollstaendig: !!roh && fehlend.length === 0,
    deklarationVollstaendig: !!roh && fehlend.length === 0 && allergenStatus.vollstaendig && zutatenStatus.vollstaendig,
    deklarationsFehler,
    fehlend, fehlendeFelder: roh?.fehlendeFelder || [],
    bezug: (bekannt ? `pro 100 g ${status === 'geschaetzt' ? 'fertiges Produkt – Schätzung' : 'fertiges Produkt'} (Backverlust ${bv.toLocaleString('de-DE')} %)`
      : zahl ? `pro 100 g ungebackene Rezeptur (hinterlegter Backverlust ${bv.toLocaleString('de-DE')} % noch unbestätigt)`
      : 'pro 100 g ungebackene Rezeptur (Backverlust nicht hinterlegt)') + (hinweise.length ? ` · ${hinweise.join(' · ')}` : '') + (vergleichsartikel.length ? ` · Schätzung mit Vergleichsartikel: ${vergleichsartikel.join('; ')}` : ''),
  };
}
