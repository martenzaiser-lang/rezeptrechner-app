// Hersteller-Datenblätter, die NICHT aus den verbatim-verifizierten
// Basisdateien (meistermarken.js/ireks.js aus den Original-PDFs) stammen,
// sondern nachträglich ergänzt wurden. Gleiches Format wie IREKS_DATEN.
// Wird in naehrwerteLookup.js in HERSTELLER_DATEN gemergt.

export const HERSTELLER_ERGAENZUNGEN = {
  'spicy topping': {
    produkt: 'IREKS SPICY TOPPING', art_nr: '137900 (DE), Referenz 137990DK',
    kj: 1549, kcal: 366, fett: 3.6, gfs: 0.6, kh: 73.5, zucker: 1.5,
    ballaststoffe: 4.4, eiweiss: 7.7, salz: 3.9,
    allergene: [], allergene_geprueft: true, spuren: ['A', 'C', 'F', 'G', 'I', 'K'],
    zutaten_lmiv: 'Maisextrudat; Knoblauch; Pfeffer; Salz; Rapsöl; Zwiebel',
    datenstatus: 'referenzwert', geprueft_am: '2026-10-14',
    referenz_artikel: 'IREKS SPICY TOPPING 137990DK (Vergleich zur deutschen Variante)',
    quelle: 'IREKS Qualitätszertifikat 137990DK, 08.04.2019, Seite 2; Vergleichsprofil der dänischen Variante. Deutsche Zutatenliste: IREKS Toppingmappe 2024. Kein aktueller Analysenwert des deutschen Artikels 137900.',
    quelle_url: 'https://www.lcl.dk/.0/pp-static/prodimages/Datablade/datablad_372183.pdf',
    datenhinweise: { identitaet: 'Hersteller IREKS vom Betrieb bestätigt. Nährwerte als Referenz der DK-Variante; deutsches Qualitätszertifikat für 137900 fehlt.' },
  },
  'kochcreme': {
    produkt: 'KOMPLET Bourbon Kochcreme', art_nr: '21396.01', gtin: '3232940007024',
    kj: 1483, kcal: 354, fett: .2, gfs: .1, kh: 85.9, zucker: .3,
    ballaststoffe: 1, eiweiss: .4, salz: .01,
    allergene: ['Aa'], allergene_geprueft: true, spuren: ['C', 'G'], datenstatus: 'recherchiert',
    zutaten_lmiv: '<b>WEIZENstärke</b>; modifizierte Stärke; Karottenkonzentrat; Carthamuskonzentrat; natürliches Bourbon-Vanille-Aroma',
    quelle: 'Abel + Schäfer / KOMPLET, Produktspezifikation 21396.01, Version 14 vom 24.11.2021, Seiten 3–4; GTIN identisch mit KBO-Einkaufsartikel 200725. Unzubereitetes Pulver.',
    quelle_url: 'https://b2bfood.s3.eu-central-3.ionoscloud.com/b2bfood/documents/pdf/61bae53dcec1ad1a696f058c14123c8e2c99b0e5c0bae592caaaa3dcc4710f61.pdf',
    quelle_sha256: '61bae53dcec1ad1a696f058c14123c8e2c99b0e5c0bae592caaaa3dcc4710f61', geprueft_am: '2026-10-14',
  },
  'stachelbeeren': {
    produkt: 'Steinhaus Stachelbeeren, sehr leicht gezuckert', art_nr: '2.019.0',
    kj: 234, kcal: 55, fett: 0.2, gfs: 0.1, kh: 10.7, zucker: 8, ballaststoffe: 2.9, eiweiss: 0.5, salz: 0,
    obergrenzen: { gfs: 0.1 }, allergene: [],
    quelle: 'Steinhaus & Co., Nährwerttabelle, Stand 02.12.2021, Seite 1. Produktzuordnung laut gespeicherter Bestätigung vom 22.07.2026.',
    quelle_url: 'https://steinhaus-fruchtkonserven.de/images/naehrwerttabelle/Naehrwerttabelle_web.pdf',
    geprueft_am: '2026-10-14',
  },
  // 'Homann Creme' = CSM Homann Creme PO MB (Art. 10096417) — die
  // Creme-Margarine (Rezept Schlemmerriegel; dort stand fälschlich
  // "Creme-Marzipan", von Marten geklärt 2026-07-22). Daten aus der
  // CSM-Produktspezifikation (Downloads/meistermarken/Spezi Homann
  // Creme.pdf, Stand 05.08.2025). Allergene laut Datenblatt: KEINE
  // (auch Sulfite 0 ppm), Kreuzkontamination: "Kann Spuren enthalten
  // von: -" → keine Spuren.
  'homann creme': {
    kj: 2960.0,
    quelle_pdf: "Spezi Homann Creme.pdf",
    quelle_seite: 1,
    quelle_sha256: "e0518a9fe6a9b241f3070cc4ef1777fd80174cb33adb622951f8d5cebf819ee1",
    geprueft_am: "2026-10-14",

    produkt: 'Homann Creme PO MB', art_nr: '10096417',
    bezeichnung: 'Margarine (pflanzliche Backmargarine)',
    zutaten_lmiv: 'Pflanzliche Fette: Palm, Kokos, Ganz gehärtetes Palm, in veränderlichen Gewichtsanteilen; Wasser; Pflanzliche Öle: Raps, Sonnenblume, in veränderlichen Gewichtsanteilen, Palm; Emulgator: Mono- und Diglyceride von Speisefettsäuren, Lecithine; Speisesalz; Säureregulator: Citronensäure.',
    allergene: [], spuren: [],
    kcal: 720, eiweiss: 0.0, fett: 80.0, gfs: 47.5, kh: 0.0, zucker: 0.0,
    ballaststoffe: 0.0, salz: 0.1033,
    quelle: 'CSM-Produktspezifikation 10096417 (PDF, Stand 05.08.2025)',
  },

  // 'Silvia' = Dawn Silvia Soft Meringue (Art. 2.03652.114). Daten aus
  // der offiziellen Dawn-Produktspezifikation (Version 1.5, PDF von
  // Marten 2026-07-17: Downloads/SILVIA05 DAWN SILVIA FRUIT TART SOFT
  // MERINGUE COVERING.pdf) — ersetzt die frühere Schätzung.
  // Spuren laut Spezifikation: Gluten/Weizen "may contain", Milch
  // "may contain" — alle anderen Allergene explizit "absent".
  'silvia': {
    kj: 1675.0,
    quelle_pdf: "SILVIA05 DAWN SILVIA FRUIT TART SOFT MERINGUE COVERING.pdf",
    quelle_seite: 2,
    quelle_sha256: "ca8ef32a263796898312f2046188fada413a41b65117238cbbaf522c9ef55b3e",
    geprueft_am: "2026-10-14",

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

  // 'Exzellent' / 'Optimal' = Brotgewürze der Nährmittelfabrik
  // Dr. Schweigmann & Co. Nachf. e.K. (bezogen über Rinne — PDFs unter
  // Downloads/rinne/: Produktspezifikation 25.04.2025 + Allergen-Liste EU).
  // Ballaststoffe sind in beiden Datenblättern NICHT ausgewiesen: null.
  // Pflichtangaben sind vollständig; unbekannte Ballaststoffe werden nicht ausgewiesen.
  // Spuren = "Kreuzkontamination"-Spalte der Allergen-Liste.
  'exzellent': {
    kj: 1455.0,
    quelle_pdf: "ANA-EXZELLENT.pdf",
    quelle_seite: 1,
    quelle_sha256: "ffa6f1edc271ba4ed92cf36a021bc5ea4d3e99e7508deb855454a08f29e00112",
    geprueft_am: "2026-10-14",

    produkt: 'Dr. Schweigmann Exzellent-Brotgewürz (Art. 1100/1101/1102)',
    bezeichnung: 'Brotgewürz für helle Mischbrote, Bauern- und Landbrote (Zugabe 0,5-1 % auf Mehl)',
    kcal: 347, eiweiss: 9.0, fett: 2.6, gfs: 0.4, kh: 66.3, zucker: 1.4,
    ballaststoffe: null, salz: 0.5,
    zutaten_lmiv: 'Kartoffelmehl; Koriander; Kümmel; Fenchel.',
    allergene: [],
    spuren: ['Aa','Ab','Ac','Ad','Ae','F','G','K','M'],
    quelle: 'Produktspezifikation + Allergen-Liste EU Dr. Schweigmann (Stand 25.04.2025, PDFs Downloads/rinne/)',
  },
  'optimal': {
    kj: 1285.0,
    quelle_pdf: "ANA-OPTIMAL.pdf",
    quelle_seite: 1,
    quelle_sha256: "7a01c331a18d48161106a993d43c3abaa81e845d5b6114918f744f9dd536e3cd",
    geprueft_am: "2026-10-14",

    produkt: 'Dr. Schweigmann Optimal-Brotgewürz (Art. 1300/1301/1302)',
    bezeichnung: 'Brotgewürz für Bauern-/Landbrote, Körner- und Roggengebäcke (Zugabe 0,5-1 % auf Mehl)',
    kcal: 307, eiweiss: 11.0, fett: 4.1, gfs: 0.58, kh: 55.1, zucker: 2.89,
    ballaststoffe: null, salz: 0.02,
    zutaten_lmiv: '<b>WEIZENröstmalzmehl</b> (inaktiv); <b>GERSTENmalzmehl</b> (inaktiv); <b>WEIZENkleie</b>; Koriander; Kümmel; Fenchel.',
    allergene: ['Aa','Ac'],
    spuren: ['Ab','Ad','Ae','F','G','K','M'],
    quelle: 'Produktspezifikation + Allergen-Liste EU Dr. Schweigmann (Stand 25.04.2025, PDFs Downloads/rinne/)',
  },
};
