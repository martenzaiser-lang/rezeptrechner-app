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

  // 'Spicy Topping' = Hobbybäcker-Versand Kaufprodukt Art. 500355
  // (Amazon-Link von Marten, 2026-07-17: amazon.de/dp/B06XPLN8CM).
  // Würzgranulat auf Maisextrudat-Basis. Nährwerte + Zutaten + Spuren
  // aus dem Amazon-Listing (Herstellerangaben).
  // ACHTUNG Namenskollision: es gibt AUCH ein hauseigenes Rezept
  // 'Spicy Topping' (Gouda/Sesam/Kaufprodukt/Kürbiskerne/Curry/Chili).
  // Dieser Eintrag hier greift für die ZUTAT 'Spicy Topping' — sowohl
  // im Rezept Spicygebäck als auch für die Kaufprodukt-Zeile im
  // hauseigenen Topping-Rezept selbst. Falls im Spicygebäck in
  // Wahrheit die HAUSEIGENE Mischung (mit Käse/Sesam → Allergene G, K!)
  // gemeint ist, muss das umgestellt werden — Rückfrage an Marten läuft.
  'spicy topping': {
    produkt: 'Hobbybäcker Spicy Topping (Art. 500355)',
    bezeichnung: 'Würz-Topping auf Maisextrudat-Basis (Knoblauch-Pfeffer)',
    kcal: 370, eiweiss: 7.7, fett: 3.6, gfs: 0.6, kh: 73.5, zucker: 1.5,
    // Ballaststoffe im Listing nicht ausgewiesen → 0 angesetzt
    ballaststoffe: 0, salz: 3.9,
    zutaten_lmiv: 'Maisextrudat, Knoblauch, Pfeffer, jodiertes Speisesalz, Rapsöl, Zwiebel',
    allergene: [],
    spuren: ['A', 'C', 'F', 'G', 'I', 'K'],
    quelle: 'Amazon-Listing Hobbybäcker Art. 500355 (Herstellerangaben, Stand 2026-07-17)',
  },
};
