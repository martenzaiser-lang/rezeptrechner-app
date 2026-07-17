// Globale Anzeige-Einstellungen fuer den Backen-Screen.
// Der Admin steuert in den Einstellungen (DB, geraeteuebergreifend),
// welche Infos Teigmacher/Kuchenmacher sehen. Der Admin selbst sieht
// im Backen-Screen immer alles.

export const ANZEIGE_OPTIONEN = [
  ['ta', 'TA (Teigausbeute)'],
  ['knetzeiten', 'Knetzeiten'],
  ['teigtemp', 'Teigtemperatur'],
  ['garezeiten', 'Stock-/Stückgare'],
  ['backdaten', 'Backzeit & Temperatur'],
  ['bedampfung', 'Bedampfung'],
  ['naehrwerte', 'Nährwerte (kcal)'],
  ['allergene', 'Allergene'],
  ['kosten', 'Kosten'],
];

export const ANZEIGE_DEFAULTS = Object.fromEntries(ANZEIGE_OPTIONEN.map(([k]) => [k, true]));

// settings.bakerAnzeige (aus der DB) mit Defaults mergen; Admin sieht alles.
export function getAnzeige(settings, role) {
  if (role === 'admin') return { ...ANZEIGE_DEFAULTS };
  return { ...ANZEIGE_DEFAULTS, ...(settings?.bakerAnzeige || {}) };
}
