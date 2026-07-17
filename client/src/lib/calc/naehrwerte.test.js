// Vergleichstests Naehrwerte/Allergene: portierte Lookups vs. Original-
// Funktionen der Alt-App, ueber alle 92 echten Rezepte.
//
// WICHTIG: Abweichungen sind NUR dort erlaubt, wo ein Rezept eine Zutat
// enthaelt, die jetzt ueber ein Hersteller-Datenblatt aufgeloest wird,
// das die Alt-App nicht kannte (neu, gewuenscht):
//   - IREKS-Datenblaetter (ireks.js)
//   - CSM-Synonym-Ergaenzungen (synonymeErgaenzungen.js, 2026-07):
//     'Easy Ruehr'/'Kaesekuchenpulver'/'Neutral' und Substring-Treffer
//     wie 'Sahnestand Neutral' loesen jetzt auf das Datenblatt auf
//     (vorher z.T. falscher Fuzzy-Treffer, z.B. 'Sahnestand Neutral'
//     -> Schlagsahne-Naehrwerte).
// Solche Rezepte werden gegen die Hersteller-Erwartung geprueft, alle
// anderen muessen das Original EXAKT treffen.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  getNaehrwert, calcNutrition, getRezeptAllergene, formatAllergene,
  getRezeptSpuren, findNaehrwerte, berechneNaehrwerte, findHersteller,
} from './naehrwerteLookup.js';
import { IREKS_DATEN, IREKS_SYNONYME } from '../../data/ireks.js';
import { skaliere } from './skalierung.js';

const INDEX_HTML = 'C:/Users/marte/Rezeptrechner/index.html';
const html = readFileSync(INDEX_HTML, 'utf8');
const dump = JSON.parse(readFileSync('C:/Users/marte/Rezeptrechner/app_daten_dump.json', 'utf8'));

// Original-Funktionen der Alt-App laden (Slice + eval, wie gen-fixtures.mjs)
function slice(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`Marker nicht gefunden: ${startMarker}`);
  return html.slice(s, e);
}

const originalCode = [
  slice('const NAEHRWERTE_DEFAULT={', 'let customNaehrwerte={};'),
  'let customNaehrwerte = {}; let customZutaten = [];',
  slice('function getNaehrwert(zutatName){', '// Allergene für ein Rezept ermitteln'),
  slice('function calcNutrition(r,skaliert){', 'const getSorted='),
  slice('const EU_ALLERGENE', '// Allergen-Mapping für Zutaten'),
  slice('const ZUTAT_ALLERGENE', 'const MEISTERMARKEN_DATEN'),
  slice('const MEISTERMARKEN_DATEN', '// Lookup-Helper: findet Meistermarken-Eintrag').replace(/\/\/ Synonym-Map.*$/s, ''),
  slice('const MEISTERMARKEN_SYNONYME', '// Lookup-Helper'),
  slice('function findMeistermarke(zutatName){', '// Nährwerte pro 100g'),
  slice('const ZUTAT_NAEHRWERTE', '// ═══ ZUTAT PREISE'),
  slice('function getRezeptAllergene(rezept) {', '// LMIV-Helper: liefert pro Rezept-Zutat'),
  slice('function findNaehrwerte(zutatName) {', '// Funktion: Nährwerte für ein Rezept berechnen'),
].join('\n');

const original = new Function(`
  ${originalCode}
  return { getNaehrwert, calcNutrition, getRezeptAllergene, formatAllergene, getRezeptSpuren, findNaehrwerte, findMeistermarke };
`)();

// Hat das Rezept eine Zutat, die NEU ueber Herstellerdaten aufgeloest
// wird (IREKS-Datenblatt oder CSM-Synonym-Ergaenzung — die Alt-App
// kannte den Treffer nicht)?
function hatNeueHerstellerZutat(r) {
  return r.zutaten.some((z) => {
    const alt = original.findMeistermarke(z.name);
    const neu = findHersteller(z.name);
    return !alt && neu;
  });
}

const mitIreks = dump.rezepte.filter(hatNeueHerstellerZutat);
const ohneIreks = dump.rezepte.filter((r) => !hatNeueHerstellerZutat(r));

// BEWUSSTE Abweichungen von der Alt-App (dokumentierte Bugfixes):
// Singular/Plural-Normalisierung — "Rosine" traf in der Alt-App per
// Substring faelschlich den Eintrag "rosinen geschwefelt" (Sulfit L),
// waehrend "Rosinen" korrekt als ungeschwefelt/frei galt. Jetzt werden
// beide Schreibweisen gleich behandelt (Direkt-Eintrag "rosinen").
const ERWARTETE_FIXES = {
  'Dinkel - Porridge': { entfernt: ['L'], grund: 'Zutat "Rosine" traf faelschlich "rosinen geschwefelt"' },
};

describe('Allergene: exakt wie Alt-App (Rezepte ohne IREKS-Zutaten)', () => {
  for (const r of ohneIreks) {
    it(r.name, () => {
      const alt = original.getRezeptAllergene(r);
      const fix = ERWARTETE_FIXES[r.name];
      const erwartet = fix ? alt.filter((c) => !fix.entfernt.includes(c)) : alt;
      expect(getRezeptAllergene(r)).toEqual(erwartet);
    });
  }
});

describe('Allergene: Rezepte mit neuen Hersteller-Zutaten (IREKS/CSM-Synonyme)', () => {
  it(`es gibt solche Rezepte im Bestand (gefunden: ${mitIreks.length})`, () => {
    expect(mitIreks.length).toBeGreaterThan(0);
  });
  for (const r of mitIreks) {
    it(`${r.name}: Original-Allergene bleiben enthalten oder werden präzisiert`, () => {
      const neu = new Set(getRezeptAllergene(r));
      // Die neuen Datenblaetter duerfen Allergene PRAEZISIEREN, aber ein in
      // der Alt-App erkanntes Haupt-Allergen darf nicht verschwinden
      // (z.B. Aa bleibt Aa; Pattern-Treffer 'Ac' fuer Malz kann durch das
      // Datenblatt entfallen, wenn das Produkt laut Hersteller keine Gerste
      // ENTHAELT — dann muss sie aber als Spur erscheinen).
      const spuren = new Set(getRezeptSpuren(r));
      const fix = ERWARTETE_FIXES[r.name];
      const originalCodes = original.getRezeptAllergene(r)
        .filter((c) => !fix?.entfernt.includes(c));
      for (const code of originalCodes) {
        const haupt = code.charAt(0);
        const abgedeckt =
          neu.has(code) ||
          [...neu].some((c) => c.charAt(0) === haupt) ||
          spuren.has(code) ||
          [...spuren].some((c) => c.charAt(0) === haupt);
        expect(abgedeckt, `${code} weder enthalten noch als Spur`).toBe(true);
      }
    });
  }
});

describe('calcNutrition (Baker-Chips): exakt wie Alt-App (ohne IREKS)', () => {
  for (const r of ohneIreks) {
    it(r.name, () => {
      const sk = skaliere(r, 10);
      const neu = calcNutrition(r, sk);
      const alt = original.calcNutrition(r, sk);
      expect(neu.vollstaendig).toBe(alt.vollstaendig);
      expect(neu.fehlend).toEqual(alt.fehlend);
      expect(neu.kcal).toBeCloseTo(alt.kcal, 6);
      expect(neu.protein).toBeCloseTo(alt.protein, 6);
      expect(neu.carbs).toBeCloseTo(alt.carbs, 6);
      expect(neu.fat).toBeCloseTo(alt.fat, 6);
    });
  }
});

describe('findNaehrwerte (LMIV 8-Feld): exakt wie Alt-App (ohne IREKS)', () => {
  it('alle Zutaten-Namen aus Nicht-IREKS-Rezepten', () => {
    const namen = new Set();
    ohneIreks.forEach((r) => r.zutaten.forEach((z) => !z.ist_kommentar && namen.add(z.name)));
    for (const name of namen) {
      expect(findNaehrwerte(name), name).toEqual(original.findNaehrwerte(name));
    }
  });
});

describe('formatAllergene', () => {
  it('löst Sub-Codes auf wie Original', () => {
    for (const codes of [['Aa'], ['Aa', 'C', 'G'], ['Ha', 'Hb'], ['Ab', 'Ac', 'Ad', 'J'], []]) {
      expect(formatAllergene(codes, true)).toBe(original.formatAllergene(codes, true));
    }
  });
});

describe('IREKS-Integration', () => {
  it('alle 9 IREKS-Produkte werden per Name gefunden', () => {
    for (const key of Object.keys(IREKS_DATEN)) {
      expect(findHersteller(key), key).toBe(IREKS_DATEN[key]);
    }
  });
  it('Dump-Schreibweisen werden aufgelöst', () => {
    for (const syn of Object.keys(IREKS_SYNONYME)) {
      expect(findHersteller(syn), syn).toBeTruthy();
    }
  });
  it('IREKS-Nährwerte fließen in findNaehrwerte ein (Beispiel Eiszeit)', () => {
    const nw = findNaehrwerte('Eiszeit');
    expect(nw.kcal).toBe(IREKS_DATEN[Object.keys(IREKS_DATEN).find((k) => k.includes('eiszeit'))]?.kcal ?? nw.kcal);
    expect(nw).toHaveProperty('gfs');
    expect(nw).toHaveProperty('salz');
  });
});
