// Regressions-Check fuer die extrahierten statischen Datenbanken.
//
// Laedt die ORIGINAL-Konstanten zur Laufzeit aus der alten App
// (Rezeptrechner/index.html, gleicher Slice+eval-Ansatz wie
// gen-fixtures.mjs) und vergleicht sie per JSON.stringify (deep-equal)
// mit den neuen ESM-Modulen in src/data/. Bei Abweichung: Exit 1.
//
// Aufruf: node test/verify-data.mjs  (aus client/)

import { readFileSync } from 'node:fs';

import { EU_ALLERGENE, ZUTAT_ALLERGENE, ALLERGEN_NAMEN } from '../src/data/allergene.js';
import { MEISTERMARKEN_DATEN } from '../src/data/meistermarken.js';
import { MEISTERMARKEN_SYNONYME } from '../src/data/synonyme.js';
import { ZUTAT_NAEHRWERTE } from '../src/data/naehrwerte.js';
import { ZUTAT_PREISE } from '../src/data/baekoPreise.js';
import { NAEHRWERTE_DEFAULT } from '../src/data/naehrwerteDefault.js';

const INDEX_HTML = 'C:/Users/marte/Rezeptrechner/index.html';
const html = readFileSync(INDEX_HTML, 'utf8');

// Einen const-Block per Marker ausschneiden und evaluieren.
function extract(constName, endMarker) {
  const start = html.indexOf(`const ${constName}`);
  const end = html.indexOf(endMarker, start);
  if (start === -1 || end === -1 || end < start) {
    console.error(`Marker fuer ${constName} nicht gefunden — index.html geaendert?`);
    process.exit(1);
  }
  const code = html.slice(start, end);
  return new Function(`${code}; return ${constName};`)();
}

const original = {
  ALLERGEN_NAMEN: extract('ALLERGEN_NAMEN', '// Benutzerdefinierte Nährwerte'),
  EU_ALLERGENE: extract('EU_ALLERGENE', '// Allergen-Mapping für Zutaten'),
  ZUTAT_ALLERGENE: extract('ZUTAT_ALLERGENE', 'const MEISTERMARKEN_DATEN'),
  MEISTERMARKEN_DATEN: extract('MEISTERMARKEN_DATEN', '// Synonym-Map'),
  MEISTERMARKEN_SYNONYME: extract('MEISTERMARKEN_SYNONYME', '// Lookup-Helper'),
  ZUTAT_NAEHRWERTE: extract('ZUTAT_NAEHRWERTE', '// ═══ ZUTAT PREISE'),
  ZUTAT_PREISE: extract('ZUTAT_PREISE', '// Funktion: Preis für Zutat finden'),
  NAEHRWERTE_DEFAULT: extract('NAEHRWERTE_DEFAULT', 'let customNaehrwerte={};'),
};

const neu = {
  ALLERGEN_NAMEN, EU_ALLERGENE, ZUTAT_ALLERGENE,
  MEISTERMARKEN_DATEN, MEISTERMARKEN_SYNONYME,
  ZUTAT_NAEHRWERTE, ZUTAT_PREISE, NAEHRWERTE_DEFAULT,
};

let fehler = 0;
for (const name of Object.keys(original)) {
  const a = JSON.stringify(original[name]);
  const b = JSON.stringify(neu[name]);
  const n = Object.keys(original[name]).length;
  if (a === b) {
    console.log(`OK    ${name}: ${n} Eintraege, exakt identisch`);
  } else {
    fehler++;
    console.error(`FEHLT ${name}: ABWEICHUNG (Original ${n} Eintraege, neu ${Object.keys(neu[name]).length})`);
    // Ersten abweichenden Key anzeigen
    for (const k of new Set([...Object.keys(original[name]), ...Object.keys(neu[name])])) {
      if (JSON.stringify(original[name][k]) !== JSON.stringify(neu[name][k])) {
        console.error(`      erster Unterschied bei Key '${k}':`);
        console.error(`      Original: ${JSON.stringify(original[name][k])}`);
        console.error(`      Neu:      ${JSON.stringify(neu[name][k])}`);
        break;
      }
    }
  }
}

if (fehler) {
  console.error(`\n${fehler} Konstante(n) weichen ab!`);
  process.exit(1);
}
console.log('\nAlle Konstanten stimmen exakt mit der Alt-App ueberein.');
