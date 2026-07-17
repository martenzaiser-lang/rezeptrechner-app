// Hersteller-Datenblätter, die NICHT aus den verbatim-verifizierten
// Basisdateien (meistermarken.js/ireks.js aus den Original-PDFs) stammen,
// sondern nachträglich ergänzt wurden. Gleiches Format wie IREKS_DATEN.
// Wird in naehrwerteLookup.js in HERSTELLER_DATEN gemergt.

export const HERSTELLER_ERGAENZUNGEN = {
  // 'Silvia' = Dawn Silvia Soft Meringue (Art. 2.03652.114). Daten aus
  // der offiziellen Dawn-Produktspezifikation (Version 1.5, PDF von
  // Marten 2026-07-17: Downloads/SILVIA05 DAWN SILVIA FRUIT TART SOFT
  // MERINGUE COVERING.pdf) — ersetzt die frühere Schätzung.
  // Spuren laut Spezifikation: Gluten/Weizen "may contain", Milch
  // "may contain" — alle anderen Allergene explizit "absent".
  'silvia': {
    produkt: 'Dawn Silvia Soft Meringue (Art. 2.03652.114)',
    bezeichnung: 'Pulvermix für Soft-Meringue-/Baiser-Auflagen',
    kcal: 394, eiweiss: 5.1, fett: 0.01, gfs: 0.01, kh: 93, zucker: 88,
    ballaststoffe: 0, salz: 0.22,
    zutaten_lmiv: 'Zucker; <b>HühnerEIweißpulver</b>; modifizierte Stärke (Kartoffel); Säuerungsmittel Citronensäure; natürliches Zitronenaroma mit anderen natürlichen Aromen.',
    allergene: ['C'],
    spuren: ['Aa', 'G'],
    quelle: 'Dawn-Produktspezifikation 2.03652.114 Version 1.5 (PDF, 2026-07-17)',
  },

  // 'Spicy Topping' = IREKS Spicy Topping, bezogen über backstars.de
  // (IREKS-Shop; Link von Marten 2026-07-17:
  // backstars.de/neue-artikel/spicy-topping_15216_3325). Zutatenliste
  // Backstars = identisch mit dem Hobbybäcker-Listing (gleiches
  // IREKS-Produkt, umverpackt): Maisextrudat, Knoblauch, Pfeffer,
  // jodiertes Speisesalz, Rapsöl, Zwiebel. Nährwerte aus dem
  // Hobbybäcker-Listing; falls mehr Präzision nötig:
  // IREKS-Qualitätszertifikat anfordern (wie die anderen 11 Produkte).
  // Hinweis: das hauseigene REZEPT 'Spicy Topping' (Gouda/Sesam/...)
  // nutzt diese Zutat als Kaufprodukt-Zeile — Zuordnung von Marten
  // bestätigt.
  'spicy topping': {
    produkt: 'IREKS Spicy Topping (via Backstars)',
    bezeichnung: 'Würz-Topping auf Maisextrudat-Basis (Knoblauch-Pfeffer)',
    kcal: 370, eiweiss: 7.7, fett: 3.6, gfs: 0.6, kh: 73.5, zucker: 1.5,
    // Ballaststoffe im Listing nicht ausgewiesen → 0 angesetzt
    ballaststoffe: 0, salz: 3.9,
    zutaten_lmiv: 'Maisextrudat, Knoblauch, Pfeffer, jodiertes Speisesalz, Rapsöl, Zwiebel',
    allergene: [],
    spuren: ['A', 'C', 'F', 'G', 'I', 'K'],
    quelle: 'Amazon-Listing Hobbybäcker Art. 500355 (Herstellerangaben, Stand 2026-07-17)',
  },

  // 'Exzellent' / 'Optimal' = Brotgewürze der Nährmittelfabrik
  // Dr. Schweigmann & Co. Nachf. e.K. (bezogen über Rinne — PDFs unter
  // Downloads/rinne/: Produktspezifikation 25.04.2025 + Allergen-Liste EU).
  // Ballaststoffe sind in beiden Datenblättern NICHT ausgewiesen → 0
  // angesetzt (bei 0,5-1 % Zugabemenge auf Mehl vernachlässigbar).
  // Spuren = "Kreuzkontamination"-Spalte der Allergen-Liste.
  'exzellent': {
    produkt: 'Dr. Schweigmann Exzellent-Brotgewürz (Art. 1100/1101/1102)',
    bezeichnung: 'Brotgewürz für helle Mischbrote, Bauern- und Landbrote (Zugabe 0,5-1 % auf Mehl)',
    kcal: 347, eiweiss: 9.0, fett: 2.6, gfs: 0.4, kh: 66.3, zucker: 1.4,
    ballaststoffe: 0, salz: 0.5,
    zutaten_lmiv: 'Kartoffelmehl; Koriander; Kümmel; Fenchel.',
    allergene: [],
    spuren: ['Aa','Ab','Ac','Ad','Ae','F','G','K','M'],
    quelle: 'Produktspezifikation + Allergen-Liste EU Dr. Schweigmann (Stand 25.04.2025, PDFs Downloads/rinne/)',
  },
  'optimal': {
    produkt: 'Dr. Schweigmann Optimal-Brotgewürz (Art. 1300/1301/1302)',
    bezeichnung: 'Brotgewürz für Bauern-/Landbrote, Körner- und Roggengebäcke (Zugabe 0,5-1 % auf Mehl)',
    kcal: 307, eiweiss: 11.0, fett: 4.1, gfs: 0.58, kh: 55.1, zucker: 2.89,
    ballaststoffe: 0, salz: 0.02,
    zutaten_lmiv: '<b>WEIZENröstmalzmehl</b> (inaktiv); <b>GERSTENmalzmehl</b> (inaktiv); <b>WEIZENkleie</b>; Koriander; Kümmel; Fenchel.',
    allergene: ['Aa','Ac'],
    spuren: ['Ab','Ad','Ae','F','G','K','M'],
    quelle: 'Produktspezifikation + Allergen-Liste EU Dr. Schweigmann (Stand 25.04.2025, PDFs Downloads/rinne/)',
  },
};
