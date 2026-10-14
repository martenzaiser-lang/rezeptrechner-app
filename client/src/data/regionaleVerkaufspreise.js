// Öffentlich abgerufene Preisbeispiele, keine repräsentative Marktstatistik.
// Nur regional ansässige Anbieter; Versand-/Lieferpauschalen nicht enthalten.
export const REGIONALPREISE_ABRUF = '2026-10-15';
const hesse = (gruppe, produkt, preis, menge, gramm = null) => ({
  anbieter: 'Bäckerei Hesse', ort: 'Lüneburg', kanal: 'Bestellshop', gruppe, produkt, preis, menge, gramm,
  url: `https://backerei-konditorei-hesse.myshopify.com/collections/${gruppe === 'Brot' ? 'brot' : gruppe === 'Kuchen' ? 'kuchen-und-susses' : 'brotchen'}`,
});
const camp = (produkt, preis) => ({ anbieter: 'Camping Rote Schleuse', ort: 'Lüneburg', kanal: 'Brötchenservice', gruppe: 'Brötchen/Gebäck', produkt, preis, menge: '1 Stück', gramm: null, url: 'https://www.camproteschleuse.de/broetchenservice' });
export const REGIONALE_VERKAUFSPREISE = [
  hesse('Brot', 'Hausbrot', 2.15, '500 g', 500),
  hesse('Brot', 'Roggen-Dinkel-Brot', 4.70, '750 g', 750),
  hesse('Brot', 'Hakon', 3.90, '1.100 g', 1100),
  hesse('Brot', 'Finne, dunkles Vollkornbrot', 3.90, '550 g', 550),
  hesse('Brot', 'Dinkelvollkornbrot', 3.60, '500 g', 500),
  hesse('Brot', 'Roggenfeinbrot', 4.20, '1.250 g', 1250),
  hesse('Brot', 'Roggenvollkornbrot', 4.50, '1.400 g', 1400),
  hesse('Brötchen/Gebäck', 'Weizenecke', .51, '1 Stück'),
  hesse('Brötchen/Gebäck', 'Kraftkornbrötchen', .90, '1 Stück'),
  hesse('Brötchen/Gebäck', 'Weltmeisterbrötchen', .95, '1 Stück'),
  hesse('Brötchen/Gebäck', 'Großes Baguettebrötchen', 1.20, '1 Stück'),
  hesse('Brötchen/Gebäck', 'Croissant', 1.60, '1 Stück'),
  hesse('Brötchen/Gebäck', 'Käsebrötchen', 1.90, '1 Stück'),
  hesse('Kuchen', 'Omas Apfelkuchen', 1.95, '1 Portion laut Shop; Gewicht nicht angegeben'),
  hesse('Kuchen', 'Butterkuchen', 4.50, '1/8 Kuchen laut Shop; kein Einzelstückvergleich'),
  hesse('Kuchen', 'Streuselkuchen', 4.50, '1/8 Kuchen laut Shop; kein Einzelstückvergleich'),
  camp('Knackfrisch, normales Brötchen', .75),
  camp('Kraftkornbrötchen', 1.10),
  camp('Weltmeister', 1.10),
  camp('Rosinenbrötchen', 1.30),
  camp('Croissant', 1.90),
];
