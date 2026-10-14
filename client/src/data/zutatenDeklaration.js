// Zusammengesetzte Rohstoffe benötigen eine belegte Zutatenliste.
// Reine Rohstoffe wie Mehl, Obst oder Zucker sind bereits durch ihren Namen
// beschrieben. Diese Liste ergänzt die automatisch erkannten Herstellerartikel.
export const ZUSAMMENGESETZTE_ZUTATEN = [
  'aroma', 'backerbse', 'backpulver', 'brotmischung', 'mischung', 'urstückteig',
  'streusel', 'currypulver', 'dunstäpfel', 'eierlikör', 'frischkäse', 'käsemix',
  'kartoffelflocken', 'kochcreme', 'krokant', 'kuvertüre', 'zartbitter-kuvertüre',
  'marzipan', 'oliven', 'orangeat', 'peperoni', 'röstzwiebeln', 'schinken',
  'schokoraspel', 'stachelbeeren', 'stollengewürz', 'tiroler brotgewürz',
  'vanillezucker', 'zitronat',
];

// Bereits im Projekt dokumentierte betriebliche Bestätigungen; keine
// Übernahme der Rezeptur eines bloßen Nährwert-Vergleichsartikels.
export const ZUTATEN_DEKLARATION = {
  peperoni: {
    zutaten_lmiv: 'Peperoni (56,09 %); Wasser (39,25 %); Branntweinessig (2,5 %); Speisesalz (2 %); Säuerungsmittel Citronensäure; Stabilisator Calciumchlorid',
    quelle: 'BÄKO-ZENTRALE Peperoni Ringe 5/1, Artikel 350683 gemäß KBO-Liste; Kundenspezifikation 63838, Version 2 vom 12.12.2022, Seite 3.',
    quelle_url: 'https://b2bfood.s3.eu-central-3.ionoscloud.com/b2bfood/documents/pdf/11484ae56c3b085880aecc3f2c75e3ea971b08ab335b256959bfabe6617f7b42.pdf',
  },
  käsemix: {
    zutaten_lmiv: 'Gouda (<b>MILCH</b>); Emmentaler (<b>MILCH</b>)',
    quelle: 'Betriebliche Mischung 1:1 laut Marten, 17.07.2026.',
  },
  currypulver: {
    zutaten_lmiv: 'Koriander; Kurkuma; Bockshornkleesaat; Fenchel; Chili; Kardamom; Anis',
    quelle: 'Fuchs Professional Curry Madras, Artikel 10161187; betriebliche Identität bestätigt 22.07.2026.',
    quelle_url: 'https://www.handelshof.de/eigenmarken/produkte/6653050001/fuchs-curry-madras-1kg',
  },
};
