// Vergleichstests: portierte Berechnungen vs. Original-Funktionen der
// alten App. Die Fixtures (test/fixtures/calc-fixtures.json) wurden mit
// test/gen-fixtures.mjs direkt aus Rezeptrechner/index.html erzeugt und
// ueber alle 92 echten Rezepte ausgewertet — die Ports muessen EXAKT treffen.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ta, mehlkg, wasserkg, gesamt, getSauerteigTA } from './ta.js';
import { skaliere, skaliereBlech, getEinzelGewicht } from './skalierung.js';
import { skaliereMultiProdukt } from './multiprodukt.js';
import { schuettTemperatur, schuettHinweis } from './schuettwasser.js';
import { berechnePlanung } from './planung.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { fixtures } = JSON.parse(
  readFileSync(join(__dirname, '../../../test/fixtures/calc-fixtures.json'), 'utf8')
);
const dump = JSON.parse(readFileSync('C:/Users/marte/Rezeptrechner/app_daten_dump.json', 'utf8'));
const rezepteById = new Map(dump.rezepte.map((r) => [r.id, r]));

describe('TA / Mehl / Wasser / Gesamt (92 echte Rezepte)', () => {
  for (const fx of fixtures) {
    it(`${fx.name}`, () => {
      const r = rezepteById.get(fx.id);
      expect(ta(r)).toBe(fx.ta);
      expect(mehlkg(r)).toBeCloseTo(fx.mehlkg, 10);
      expect(wasserkg(r)).toBeCloseTo(fx.wasserkg, 10);
      expect(gesamt(r)).toBeCloseTo(fx.gesamt, 10);
      expect(getEinzelGewicht(r)).toBe(fx.einzelGewicht);
    });
  }
});

describe('Stueck-Skalierung', () => {
  for (const fx of fixtures) {
    it(`${fx.name}`, () => {
      const r = rezepteById.get(fx.id);
      for (const [n, expected] of Object.entries(fx.skaliere)) {
        expect(skaliere(r, Number(n)), `n=${n}`).toEqual(expected);
      }
    });
  }
});

describe('Blech-Skalierung (Kuchen)', () => {
  for (const fx of fixtures.filter((f) => Object.keys(f.blech).length)) {
    it(`${fx.name}`, () => {
      const r = rezepteById.get(fx.id);
      for (const [key, expected] of Object.entries(fx.blech)) {
        const [n, b, l] = key.split('|').map(Number);
        expect(skaliereBlech(r, n, b, l), key).toEqual(expected);
      }
    });
  }
});

describe('Multi-Produkt-Skalierung', () => {
  for (const fx of fixtures.filter((f) => Object.keys(f.multi).length)) {
    it(`${fx.name}`, () => {
      const r = rezepteById.get(fx.id);
      for (const [key, { map, result }] of Object.entries(fx.multi)) {
        expect(skaliereMultiProdukt(r, map), key).toEqual(result);
      }
    });
  }
});

describe('Sauerteig-TA-Parsing', () => {
  it('extrahiert TA aus dem Namen, Default 200', () => {
    expect(getSauerteigTA({ name: 'Roggensauerteig TA 180' })).toBe(180);
    expect(getSauerteigTA({ name: 'Sauerteig ta150' })).toBe(150);
    expect(getSauerteigTA({ name: 'Salzsauerteig' })).toBe(200);
  });
});

describe('Schuetttemperatur', () => {
  it('Formel: Teig×3 − Raum − Mehl − Knet (Original Z. 3554)', () => {
    // Defaults der alten App: 26/22/20/8 → 28 °C
    expect(schuettTemperatur({})).toBe(28);
    expect(schuettTemperatur({ teig: 26, raum: 22, mehl: 20, knet: 8 })).toBe(28);
    expect(schuettTemperatur({ teig: 24, raum: 28, mehl: 26, knet: 10 })).toBe(8);
    expect(schuettTemperatur({ teig: 22, raum: 30, mehl: 28, knet: 12 })).toBe(-4);
  });
  it('Hinweistexte wie Original', () => {
    expect(schuettHinweis(-1)).toContain('Eiswasser');
    expect(schuettHinweis(3)).toContain('Sehr kaltes');
    expect(schuettHinweis(10)).toContain('Kaltes Wasser');
    expect(schuettHinweis(28)).toContain('normalen Bereich');
    expect(schuettHinweis(45)).toContain('Zu warm');
  });
});

describe('Produktionsplanung', () => {
  it('summiert Teige/Koerner/Sauerteig ueber mehrere Rezepte', () => {
    const rezepte = dump.rezepte;
    const [r1, r2] = rezepte.filter((r) => r.berechnung !== 'blech').slice(0, 2);
    const result = berechnePlanung(rezepte, { [r1.id]: 10, [r2.id]: 5 });
    expect(result.teige).toHaveLength(2);
    const erwartet1 = skaliere(r1, 10).reduce((a, b) => a + b, 0);
    const erwartet2 = skaliere(r2, 5).reduce((a, b) => a + b, 0);
    expect(result.totalTeig).toBeCloseTo(erwartet1 + erwartet2, 10);
  });
});
