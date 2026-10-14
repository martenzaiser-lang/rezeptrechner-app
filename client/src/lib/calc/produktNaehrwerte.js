import { berechneNaehrwerte } from './naehrwerteLookup.js';

export const NAEHRWERT_FELDER = ['kj', 'kcal', 'fett', 'gfs', 'kh', 'zucker', 'ballaststoffe', 'eiweiss', 'salz'];
export function produktNaehrwerte(rezept, customZutaten = []) {
  const roh = berechneNaehrwerte(rezept, customZutaten);
  const bv = rezept.backverlust_pct;
  const bekannt = typeof bv === 'number' && Number.isFinite(bv) && bv >= 0 && bv < 100;
  const faktor = bekannt ? 100 / (100 - bv) : 1;
  const werte = roh && Object.fromEntries(NAEHRWERT_FELDER.map(k => [k, roh[k] * faktor]));
  // Zucker gehört bereits zu KH, gesättigte FS bereits zu Fett. Nur disjunkte
  // Gruppen addieren; kleine Rundungsabweichungen der Quellen zulassen.
  const unplausibel = werte && ['eiweiss', 'fett', 'kh', 'ballaststoffe', 'salz'].reduce((s,k) => s + werte[k], 0) > 102;
  const fehlend = rezept.berechnungsfehler ? [rezept.berechnungsfehler] : [...(roh?.fehlend || [])];
  if (unplausibel) fehlend.push('Gewichtsverlust oder Produktdaten prüfen: unplausible Nährstoffsumme pro 100 g.');
  return { werte, vollstaendig: !!roh && fehlend.length === 0,
    fehlend,
    bezug: bekannt ? `pro 100 g fertiges Produkt (Backverlust ${bv.toLocaleString('de-DE')} %)` : 'pro 100 g ungebackene Rezeptur (Backverlust nicht hinterlegt)',
  };
}
