// Hersteller-Datenblätter, die NICHT aus den verbatim-verifizierten
// Basisdateien (meistermarken.js/ireks.js aus den Original-PDFs) stammen,
// sondern nachträglich ergänzt wurden. Gleiches Format wie IREKS_DATEN.
// Wird in naehrwerteLookup.js in HERSTELLER_DATEN gemergt.

export const HERSTELLER_ERGAENZUNGEN = {
  // 'Silvia' = Dawn Silvia Soft Meringue Mix (laut Marten 2026-07-17,
  // Baiser-Mix). Zutaten + Allergene aus dem Händler-Listing cfw.co.uk
  // (offizielles Dawn-Spezifikations-PDF blockt automatischen Download —
  // liegt es vor, hier die ECHTEN Nährwerte eintragen!).
  // NÄHRWERTE = SCHÄTZUNG aus der Zutatenliste (~85% Zucker, ~8%
  // Eiklarpulver, ~6% Kartoffelstärke) — deutlich gekennzeichnet.
  'silvia': {
    produkt: 'Dawn Silvia Soft Meringue Mix',
    bezeichnung: 'Mix für Baiser-/Meringue-Auflagen',
    kcal: 388, eiweiss: 6.5, fett: 0.1, gfs: 0, kh: 90, zucker: 85,
    ballaststoffe: 0, salz: 0.15,
    zutaten_lmiv: 'Zucker, <b>Eiklarpulver</b>, modifizierte Stärke (Kartoffel), Säuerungsmittel Citronensäure, natürliches Zitronenaroma',
    allergene: ['C'],
    spuren: ['A', 'G'],
    quelle: 'Zutaten/Allergene: cfw.co.uk-Listing; Nährwerte GESCHÄTZT aus Zutatenliste — Dawn-Datenblatt anfordern!',
  },
};
