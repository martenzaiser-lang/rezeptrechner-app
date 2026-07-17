// Audit: Wie loest die App Naehrwerte und Allergene fuer JEDE real
// verwendete Zutat auf? Deckt riskante Fuzzy-Treffer und Luecken auf.
// Aufruf: node test/audit-naehrwerte.mjs   (aus client/)

import { readFileSync } from 'node:fs';
import { ZUTAT_NAEHRWERTE } from '../src/data/naehrwerte.js';
import { NAEHRWERTE_DEFAULT } from '../src/data/naehrwerteDefault.js';
import { EU_ALLERGENE, ZUTAT_ALLERGENE } from '../src/data/allergene.js';
import { MEISTERMARKEN_DATEN } from '../src/data/meistermarken.js';
import { IREKS_DATEN, IREKS_SYNONYME } from '../src/data/ireks.js';
import { MEISTERMARKEN_SYNONYME } from '../src/data/synonyme.js';
import { findHersteller, findNaehrwerte, getNaehrwert, getRezeptAllergene, berechneNaehrwerte } from '../src/lib/calc/naehrwerteLookup.js';
// Spiegel der DB-Tabelle custom_ingredients (Seed-Daten, siehe
// server/scripts/seed-naehrwerte-ergaenzungen.js). Die App laedt diese
// Eintraege zur Laufzeit aus der DB; das Audit hat keinen DB-Zugriff und
// nutzt daher den Seed-Export. ACHTUNG: von Marten NACHTRAEGLICH ueber das
// Zutat-Daten-Modal gepflegte Eintraege kennt das Audit nicht.
import { NAEHRWERT_ERGAENZUNGEN } from '../../server/scripts/seed-naehrwerte-ergaenzungen.js';

const CUSTOM = Object.fromEntries(
  Object.entries(NAEHRWERT_ERGAENZUNGEN).map(([k, v]) => [k.toLowerCase(), v])
);

const dump = JSON.parse(readFileSync('C:/Users/marte/Rezeptrechner/app_daten_dump.json', 'utf8'));

// EU-Allergen-Hauptgruppen pruefen (Soll: Anhang II VO 1169/2011, 14 Stueck)
console.log('=== EU_ALLERGENE Hauptgruppen ===');
for (const [code, a] of Object.entries(EU_ALLERGENE)) {
  console.log(code, '=', a.name, a.sub ? `(Sub: ${Object.values(a.sub).join(', ')})` : '');
}

// Alle real verwendeten Zutaten sammeln
const zutaten = new Map();
dump.rezepte.forEach((r) =>
  r.zutaten.forEach((z) => {
    if (z.ist_kommentar || !z.name || z.name.toLowerCase() === 'gesamt') return;
    if (!zutaten.has(z.name)) zutaten.set(z.name, 0);
    zutaten.set(z.name, zutaten.get(z.name) + 1);
  })
);
console.log(`\n=== ${zutaten.size} eindeutige Zutaten in ${dump.rezepte.length} Rezepten ===`);

// Aufloesungsweg fuer findNaehrwerte nachbilden (zur Diagnose)
function nwWeg(name) {
  const n = name.toLowerCase().trim();
  if (findHersteller(n)) return 'HERSTELLER';
  if (ZUTAT_NAEHRWERTE[n]) return 'direkt';
  // custom_ingredients (DB) — Position wie in findNaehrwerte():
  // nach Hersteller/direkt, vor Substring-Matching
  if (CUSTOM[n]) return 'custom (DB-Seed)';
  for (const key of Object.keys(ZUTAT_NAEHRWERTE)) {
    if (n.includes(key) || key.includes(n)) return `substring→"${key}"`;
  }
  const mehlMatch = n.match(/(weizen|roggen|dinkel)(voll)?korn?(mehl)?\s*(\d+)?/);
  if (mehlMatch) return 'mehl-regex';
  if (n.includes('mehl') || n.includes('schrot')) return 'fallback→weizenmehl550';
  if (n.includes('wasser')) return 'fallback→wasser';
  if (n.includes('salz')) return 'fallback→salz';
  if (n.includes('hefe')) return 'fallback→hefe';
  if (n.includes('zucker')) return 'fallback→zucker';
  if (n.includes('butter')) return 'fallback→butter';
  if (n.includes('öl')) return 'fallback→rapsöl';
  return 'FEHLT';
}

// Aufloesungsweg fuer Allergene nachbilden
function allergenWeg(name) {
  const n = name.toLowerCase().trim();
  // custom_ingredients (DB) haben in getRezeptAllergene() hoechste
  // Prioritaet — aber nur, wenn der Eintrag a/allergene setzt
  if (CUSTOM[n] && (CUSTOM[n].a || CUSTOM[n].allergene)) return 'custom (DB-Seed)';
  if (findHersteller(n)) return 'HERSTELLER';
  if (ZUTAT_ALLERGENE[n]) return 'direkt';
  for (const key of Object.keys(ZUTAT_ALLERGENE)) {
    if (n.includes(key) || key.includes(n)) return `substring→"${key}"`;
  }
  return 'pattern/keins';
}

const probleme = { fehlt: [], fragwuerdigNw: [], fragwuerdigAllergen: [] };
for (const [name] of [...zutaten.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'))) {
  const wegN = nwWeg(name);
  const wegA = allergenWeg(name);
  if (wegN === 'FEHLT') probleme.fehlt.push(name);
  // Riskant: Substring-Treffer, bei denen der Key sehr kurz ist oder
  // wenig mit dem Namen zu tun hat
  if (wegN.startsWith('substring')) {
    const key = wegN.match(/"(.+)"/)[1];
    if (key.length <= 4 || !name.toLowerCase().includes(key.slice(0, 4))) {
      probleme.fragwuerdigNw.push(`${name} → ${key}`);
    }
  }
  if (wegA.startsWith('substring')) {
    const key = wegA.match(/"(.+)"/)[1];
    if (key.length <= 4 || !name.toLowerCase().includes(key.slice(0, 4))) {
      probleme.fragwuerdigAllergen.push(`${name} → ${key}`);
    }
  }
  console.log(`${name.padEnd(38)} | NW: ${wegN.padEnd(28)} | Allergen: ${wegA}`);
}

console.log('\n=== OHNE Naehrwert-Daten ===');
console.log(probleme.fehlt.join('\n') || '(keine)');
console.log('\n=== Fragwuerdige Substring-Treffer NW ===');
console.log(probleme.fragwuerdigNw.join('\n') || '(keine)');
console.log('\n=== Fragwuerdige Substring-Treffer Allergene ===');
console.log(probleme.fragwuerdigAllergen.join('\n') || '(keine)');

// Naehrwert-Summen: Wird der Backverlust beruecksichtigt? (LMIV: pro 100 g
// des verkaufsfertigen Produkts, nicht des Rohteigs!)
console.log('\n=== Backverlust-Check (Beispiele) ===');
for (const r of dump.rezepte.slice(0, 3)) {
  const nw = berechneNaehrwerte(r);
  if (!nw) continue;
  const bv = r.backverlust_pct || 0;
  const faktor = bv ? 100 / (100 - bv) : 1;
  console.log(`${r.name}: kcal/100g Teig=${Math.round(nw.kcal)} | backverlust_pct=${bv} | kcal/100g GEBACKEN wäre ≈${Math.round(nw.kcal * faktor)}`);
}

// Geschwefelte Trockenfruechte (Sulfit-Frage)
console.log('\n=== Trockenfruechte/Sulfit-Kandidaten in Rezepten ===');
const sulfitKandidaten = ['rosine', 'sultanine', 'aprikose', 'cranberr', 'feige', 'dattel', 'pflaume', 'korinthe'];
for (const [name] of zutaten) {
  if (sulfitKandidaten.some((k) => name.toLowerCase().includes(k))) {
    const r = { zutaten: [{ name, menge_kg: 1 }] };
    console.log(`${name} → erkannte Allergene: [${getRezeptAllergene(r).join(', ') || 'KEINE'}]`);
  }
}
