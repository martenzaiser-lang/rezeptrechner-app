// Fixture-Generator fuer die Berechnungs-Vergleichstests.
//
// Liest die ORIGINAL-Funktionen zur Laufzeit aus der alten App
// (Rezeptrechner/index.html) und wertet sie ueber alle Rezepte des
// Migrations-Dumps aus. Ergebnis: test/fixtures/calc-fixtures.json —
// die portierten Module in src/lib/calc/ muessen diese Werte EXAKT treffen.
//
// Aufruf: node test/gen-fixtures.mjs
// (Nach Rezeptaenderungen in der Alt-App neu generieren.)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = 'C:/Users/marte/Rezeptrechner/index.html';
const DUMP = 'C:/Users/marte/Rezeptrechner/app_daten_dump.json';

const html = readFileSync(INDEX_HTML, 'utf8');

// Berechnungs-Block ausschneiden: von FLUESSIGKEITEN bis vor den
// Cloud-Status-Kommentar (enthaelt ta/mehlkg/wasserkg/skaliere/
// skaliereByFactor/skaliereMultiProdukt/getEinzelGewicht).
const start = html.indexOf('const FLUESSIGKEITEN=');
const end = html.indexOf('// Cloud-Status-Anzeige aktualisieren');
if (start === -1 || end === -1 || end < start) {
  console.error('Marker im Original nicht gefunden — index.html geaendert?');
  process.exit(1);
}
const code = html.slice(start, end);

// Original-Code in einer Funktion evaluieren und die Funktionen zurueckgeben.
const original = new Function(`
  ${code}
  return { ta, mehlkg, wasserkg, gesamt, bp, rohgew, getEinzelGewicht, skaliere, skaliereByFactor, skaliereMultiProdukt, getSauerteigTA };
`)();

// Blech-Skalierung: im Original inline in calcBaker (Z. 2812) — hier
// VERBATIM uebernommen (gleiche Formel wie an allen 3 Stellen im Original).
function originalSkaliereBlech(r, neuN, neuB, neuL) {
  const basisB = r.blech_breite_cm > 0 ? r.blech_breite_cm : 50;
  const basisL = r.blech_laenge_cm > 0 ? r.blech_laenge_cm : 80;
  neuB = neuB || basisB;
  neuL = neuL || basisL;
  neuN = Math.max(1, parseInt(neuN) || 1);
  const blechFaktor = (neuN * neuB * neuL) / (basisB * basisL);
  const basisGInKg = r.zutaten.filter(z => z.menge_kg > 0 && !z.ist_kommentar && z.name.toLowerCase() !== 'gesamt').reduce((s, z) => s + z.menge_kg, 0);
  return r.zutaten.map(z => { if (z.ist_kommentar || z.name.toLowerCase() === 'gesamt') return 0; if (z.menge_kg > 0) return +(z.menge_kg * blechFaktor).toFixed(4); if (z.zusatz_prozent > 0) return +(basisGInKg * blechFaktor * z.zusatz_prozent / 100).toFixed(4); return 0; });
}

const dump = JSON.parse(readFileSync(DUMP, 'utf8'));
const rezepte = dump.rezepte;
console.log(`Original-Funktionen geladen, ${rezepte.length} Rezepte aus Dump.`);

const fixtures = [];
for (const r of rezepte) {
  const fx = {
    id: r.id,
    name: r.name,
    kategorie: r.kategorie,
    ta: original.ta(r),
    mehlkg: original.mehlkg(r),
    wasserkg: original.wasserkg(r),
    gesamt: original.gesamt(r),
    einzelGewicht: original.getEinzelGewicht(r),
    skaliere: {},
    blech: {},
    multi: {},
  };
  for (const n of [1, r.min_stueck || 1, 7, 25]) {
    fx.skaliere[n] = original.skaliere(r, n);
  }
  if (r.berechnung === 'blech') {
    fx.blech['1|0|0'] = originalSkaliereBlech(r, 1, 0, 0);
    fx.blech['2|40|60'] = originalSkaliereBlech(r, 2, 40, 60);
    fx.blech['3|60|80'] = originalSkaliereBlech(r, 3, 60, 80);
  }
  if (r.produkte && r.produkte.length > 1) {
    const alle2 = Object.fromEntries(r.produkte.map((p) => [p.name, 2]));
    const nurErstes = Object.fromEntries(r.produkte.map((p, i) => [p.name, i === 0 ? 3 : 0]));
    const gemischt = Object.fromEntries(r.produkte.map((p, i) => [p.name, i + 1]));
    fx.multi['alle2'] = { map: alle2, result: original.skaliereMultiProdukt(r, alle2) };
    fx.multi['nurErstes'] = { map: nurErstes, result: original.skaliereMultiProdukt(r, nurErstes) };
    fx.multi['gemischt'] = { map: gemischt, result: original.skaliereMultiProdukt(r, gemischt) };
  }
  fixtures.push(fx);
}

const multiCount = fixtures.filter((f) => Object.keys(f.multi).length).length;
const blechCount = fixtures.filter((f) => Object.keys(f.blech).length).length;
mkdirSync(join(__dirname, 'fixtures'), { recursive: true });
writeFileSync(
  join(__dirname, 'fixtures', 'calc-fixtures.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), source: INDEX_HTML, fixtures }, null, 1)
);
console.log(`OK: ${fixtures.length} Rezept-Fixtures (${blechCount} Blech, ${multiCount} Multi-Produkt) → test/fixtures/calc-fixtures.json`);
