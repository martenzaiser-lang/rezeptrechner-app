// VO (EU) 1169/2011, Art. 30: Ballaststoffe sind eine freiwillige Ergänzung.
// Fehlende Werte dürfen weder Pflichtangaben ersetzen noch als null Gramm gelten.
export const NAEHRWERT_LABEL = {
  kj: 'Energie (kJ)', kcal: 'Energie (kcal)', fett: 'Fett (g)',
  gfs: 'Gesättigte Fettsäuren (g)', kh: 'Kohlenhydrate (g)', zucker: 'Zucker (g)',
  ballaststoffe: 'Ballaststoffe (g, freiwillig)', eiweiss: 'Eiweiß (g)', salz: 'Salz (g)',
};
export const NAEHRWERT_FELDER = Object.keys(NAEHRWERT_LABEL);
export const PFLICHT_FELDER = NAEHRWERT_FELDER.filter(k => k !== 'ballaststoffe');
export const istNaehrwert = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function naehrwertStatus(daten) {
  const fehlend = PFLICHT_FELDER.filter(k => !istNaehrwert(daten?.[k]));
  const quelleOffen = ['ungeprueft', 'widerspruechlich'].includes(daten?.datenstatus);
  return { vollstaendig: fehlend.length === 0 && !quelleOffen, fehlend, quelleOffen };
}
export const formatNaehrwert = (n, stellen = 1) => istNaehrwert(n)
  ? n.toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen }) : '—';
