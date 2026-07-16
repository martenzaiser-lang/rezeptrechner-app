// Byte-Vergleichstests: portierte Bon-Erzeugung vs. Original der Alt-App
// ueber alle 92 echten Rezepte (Standard-Bon-Konfiguration).
//
// Hinweis: Der Naehrwerte-Block wird nicht verglichen — die Alt-App hatte
// dort einen latenten Bug (berechneNaehrwerte liefert kein .vollstaendig,
// der Block druckte also NIE). Unsere Version druckt ihn korrekt, wenn die
// Option aktiv ist und alle Daten vorliegen. Standard-Konfig: Option aus.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  generateBonBytes, generateVorteigBonBytes, getVorteigZutaten,
  getFrischeZutaten, getFrischeZutatenGruppiert, teilerInfoText,
  textToBytes, padBonLine16, bonTruncate, getBonConfig,
} from './escpos.js';
import { skaliere } from '../calc/skalierung.js';

const INDEX_HTML = 'C:/Users/marte/Rezeptrechner/index.html';
const html = readFileSync(INDEX_HTML, 'utf8');
const dump = JSON.parse(readFileSync('C:/Users/marte/Rezeptrechner/app_daten_dump.json', 'utf8'));

function slice(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`Marker nicht gefunden: ${startMarker}`);
  return html.slice(s, e);
}

let original;

beforeAll(() => {
  const code = [
    'const localStorage = { getItem: () => null, setItem: () => {} };',
    slice('const NAEHRWERTE_DEFAULT={', 'let customNaehrwerte={};'),
    'let customNaehrwerte = {}; let customZutaten = [];',
    slice('function getNaehrwert(zutatName){', '// Allergene für ein Rezept ermitteln'),
    slice('const FLUESSIGKEITEN=', '// Cloud-Status-Anzeige aktualisieren'),
    slice('function padBonLine(left,right){', '// Schütttemperatur-Rechner'),
    slice('const EU_ALLERGENE', '// Allergen-Mapping für Zutaten'),
    slice('const ZUTAT_ALLERGENE', 'const MEISTERMARKEN_DATEN'),
    slice('const MEISTERMARKEN_DATEN', '// Lookup-Helper: findet Meistermarken-Eintrag').replace(/\/\/ Synonym-Map.*$/s, ''),
    slice('const MEISTERMARKEN_SYNONYME', '// Lookup-Helper'),
    slice('function findMeistermarke(zutatName){', '// Nährwerte pro 100g'),
    slice('const ZUTAT_NAEHRWERTE', '// ═══ ZUTAT PREISE'),
    slice('function getRezeptAllergene(rezept) {', '// LMIV-Helper: liefert pro Rezept-Zutat'),
    slice('function findNaehrwerte(zutatName) {', '// Funktion: Nährwerte für ein Rezept berechnen'),
    slice('function berechneNaehrwerte(rezept) {', '// PDF DATENBLATT IMPORT')
      .replace('const nutriScore = calcNutriScore(nwResult);', 'const nutriScore = null;')
      .replace(/\/\/ ═+\s*$/m, ''),
    slice('const ESC=0x1B', 'async function connectPrinter(){'),
    slice('function getBonConfig(rezept){', '// Zutaten die morgens frisch abgewogen'),
    slice('function getFrischeZutaten(rezept,skalierteZutaten){', '// Alias für Abwärtskompatibilität'),
    slice('function getFrischeZutatenGruppiert(rezept,skalierteZutaten){', '// Quellstück-Flüssigkeiten für separaten Bon'),
    slice('function getVorteigZutaten(rezept,skalierteZutaten,vorteigTyp){', '// Generischer Vorteig-Bon'),
    slice('function generateVorteigBonBytes(rezept,zutaten,produktInfo,titel,teilerInfo){', 'function generateBonText'),
    slice('function generateBonBytes(rezept,skalierteZutaten,produktInfo,teilerInfo){', '// Quellstück-Bon generieren'),
  ].join('\n');

  original = new Function(`
    ${code}
    return { generateBonBytes, generateVorteigBonBytes, getVorteigZutaten, getFrischeZutaten, getFrischeZutatenGruppiert, getBonConfig, textToBytes, padBonLine16, bonTruncate };
  `)();
});

describe('Frische-Zutaten-Filter (Schuettwasser-Logik)', () => {
  for (const r of dump.rezepte) {
    it(r.name, () => {
      const sk = skaliere(r, 10);
      expect(getFrischeZutaten(r, sk)).toEqual(original.getFrischeZutaten(r, sk));
      expect(getFrischeZutatenGruppiert(r, sk)).toEqual(original.getFrischeZutatenGruppiert(r, sk));
      for (const typ of ['quellstück', 'brühstück', 'kochstück', 'sauerteig']) {
        expect(getVorteigZutaten(r, sk, typ), typ).toEqual(original.getVorteigZutaten(r, sk, typ));
      }
    });
  }
});

describe('Bon-Bytes: exakt wie Alt-App (Standard-Konfig, alle 92 Rezepte)', () => {
  for (const r of dump.rezepte) {
    it(r.name, () => {
      const sk = skaliere(r, 10);
      const produktInfo = '10 Stueck';
      const cfg = original.getBonConfig(r);
      const neu = generateBonBytes(r, sk, produktInfo, '', { cfg });
      const alt = original.generateBonBytes(r, sk, produktInfo, '');
      expect(neu).toEqual(alt);
    });
  }
});

describe('Vorteig-Bon-Bytes: exakt wie Alt-App', () => {
  const mitSauerteig = dump.rezepte.filter((r) => {
    const sk = skaliere(r, 10);
    return getVorteigZutaten(r, sk, 'sauerteig').length > 0;
  });
  it(`es gibt Rezepte mit Sauerteig-Bon (${mitSauerteig.length})`, () => {
    expect(mitSauerteig.length).toBeGreaterThan(0);
  });
  for (const r of mitSauerteig.slice(0, 10)) {
    it(r.name, () => {
      const sk = skaliere(r, 10);
      const zutaten = getVorteigZutaten(r, sk, 'sauerteig');
      const neu = generateVorteigBonBytes(r, zutaten, '10 Stueck', 'SAUERTEIG', '1/2 HALB');
      const alt = original.generateVorteigBonBytes(r, zutaten, '10 Stueck', 'SAUERTEIG', '1/2 HALB');
      expect(neu).toEqual(alt);
    });
  }
});

describe('Bon mit Teiler-Info', () => {
  it('Teiler-Kopfzeile identisch', () => {
    const r = dump.rezepte[0];
    const sk = skaliere(r, 7);
    const cfg = original.getBonConfig(r);
    expect(generateBonBytes(r, sk, '7 Stueck', teilerInfoText(0.5), { cfg }))
      .toEqual(original.generateBonBytes(r, sk, '7 Stueck', '1/2 HALB'));
  });
  it('teilerInfoText wie Alt-App-Mapping', () => {
    expect(teilerInfoText(1)).toBe('');
    expect(teilerInfoText(0.5)).toBe('1/2 HALB');
    expect(teilerInfoText(0.333)).toBe('1/3 DRITTEL');
    expect(teilerInfoText(0.25)).toBe('1/4 VIERTEL');
    expect(teilerInfoText(0.2)).toBe('1/5 FUENFTEL');
    expect(teilerInfoText(2)).toBe('2x DOPPELT');
  });
});

describe('Hilfsfunktionen', () => {
  it('textToBytes: CP858-Umlaute', () => {
    expect(textToBytes('äöüÄÖÜß€')).toEqual([0x84, 0x94, 0x81, 0x8e, 0x99, 0x9a, 0xe1, 0xd5]);
    expect(original.textToBytes('Brötchen 5,5kg')).toEqual(textToBytes('Brötchen 5,5kg'));
  });
  it('padBonLine16 / bonTruncate identisch', () => {
    expect(padBonLine16('GESAMT', '12,345')).toBe(original.padBonLine16('GESAMT', '12,345'));
    expect(bonTruncate('Roggenmischbrot mit Sauerteig extra', 16)).toBe(original.bonTruncate('Roggenmischbrot mit Sauerteig extra', 16));
  });
  it('getBonConfig-Defaults identisch (Allergene/Naehrwerte default aus)', () => {
    const cfg = getBonConfig(null);
    expect(cfg.allergene).toBe(false);
    expect(cfg.naehrwerte).toBe(false);
    expect(cfg.bonSauerteig).toBe(true);
  });
});
