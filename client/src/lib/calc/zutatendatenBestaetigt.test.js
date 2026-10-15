import { describe, expect, it } from 'vitest';
import { ZUTATENDATEN_BESTAETIGT } from '../../data/zutatendatenBestaetigt.js';
import { NAEHRWERT_FELDER, naehrwertStatus } from './naehrwertFelder.js';
import { berechneNaehrwerte, calcNutrition, findNaehrwerte, getRezeptAllergene, getRezeptSpuren, getRezeptZutatenStatus } from './naehrwerteLookup.js';
import { verkaufsKomponenten } from './verkaufsZutaten.js';
import { validateCustomIngredient } from '../../../../shared/validation.js';
import { rezept, zutat } from '../../../test/fach-fixtures.js';

describe('Von Marten freigegebene Zutatendaten vom 15.10.2026', () => {
  it('hat vollständige Pflichtangaben oder eine ausdrückliche betriebliche Ausnahme', () => {
    for (const [name, d] of Object.entries(ZUTATENDATEN_BESTAETIGT)) {
      expect(validateCustomIngredient(d), name).toEqual([]);
      expect(naehrwertStatus(d).vollstaendig, name).toBe(true);
      expect(getRezeptZutatenStatus(rezept([zutat(name, 1)])).vollstaendig, name).toBe(true);
    }
  });
  it.each([['Kuvertüre','Zartbitter-Kuvertüre'],['O-Saft','Orangensaft'],['Lupinenschrot','Süßlupine']])('verwendet für %s und %s dieselben Werte', (a,b) => {
    for (const k of NAEHRWERT_FELDER) expect(findNaehrwerte(a)[k]).toEqual(findNaehrwerte(b)[k]);
  });
  it('behält bei Getränken den ml-Bezug und die freigegebene Dichtenäherung', () => {
    for (const n of ['Apfelsaft','Orangensaft','Rum']) {
      const d=findNaehrwerte(n);
      expect(d.original_bezug).toBe('100 ml');expect(d.dichte_kg_l).toBe(1);
      expect(d.dichte_status).toBe('betriebliche_naeherung');
    }
    expect(findNaehrwerte('Orangensaft').zucker).toBe(10);
    expect(findNaehrwerte('Rum').kcal).toBe(221);
  });
  it('lässt Kaffee ohne erfundene Werte aus und berücksichtigt weiterhin seine Masse', () => {
    const r=rezept([zutat('Zucker', .9),zutat('Kaffeepulver', .1)]);
    const d=findNaehrwerte('Kaffeepulver');expect(d.kcal).toBeNull();
    const p=berechneNaehrwerte(r);
    expect(p.fehlend).toEqual([]);expect(p.zucker).toBeCloseTo(90);
    expect(p.ballaststoffe).toBe(0);
    expect(p.kcal).toBeCloseTo(findNaehrwerte('Zucker').kcal*.9);
    const c=calcNutrition(r,[.9,.1],{kaffeepulver:{...d}});
    expect(c.vollstaendig).toBe(true);expect(Number.isFinite(c.protein)).toBe(true);
    expect(c.kcal).toBeCloseTo(findNaehrwerte('Zucker').kcal*9);
    expect(naehrwertStatus({kcal:null}).vollstaendig).toBe(false);
  });
  it('erhält Obergrenzen und unbekannte freiwillige Werte', () => {
    const d=findNaehrwerte('Dunstäpfel');expect(d.fett).toBe(.1);
    expect(d.datenhinweise.fett).toContain('<0,1');expect(d.ballaststoffe).toBeNull();
    expect(findNaehrwerte('Eierlikör').gfs).toBe(2.015);
  });
  it('trennt enthaltene Allergene von dokumentierten Spuren', () => {
    const r=rezept([zutat('Kuvertüre',1)]);
    expect(getRezeptAllergene(r)).toEqual(['G']);expect(getRezeptSpuren(r)).toContain('Hb');
    expect(getRezeptAllergene(rezept([zutat('Tomatenflocken',1)]))).not.toContain('L');
    expect(getRezeptAllergene(rezept([zutat('Stachelbeeren',1)]))).not.toContain('G');
    expect(getRezeptAllergene(rezept([zutat('Eierlikör',1)]))).toEqual(['C']);
  });
  it('erhält die Stärke beim Backpulver und hält Rechercheanmerkungen aus der Zutatenliste heraus', () => {
    expect(verkaufsKomponenten(findNaehrwerte('Backpulver').zutaten_lmiv)).toEqual(['Maisstärke']);
    expect(findNaehrwerte('Schmand').zutaten_lmiv).not.toContain('Produktseite');
    expect(findNaehrwerte('Backpulver').salz).toBe(43.8);
  });
  it('nimmt reine Gewürze aus, erhält aber Nährwerte zusammengesetzter Produkte', () => {
    for (const n of ['Chili','Hopfenmehl','Kümmel','Muskat','Rosmarin','Schabziger Klee','Zimt','Tiroler Brotgewürz','Paprika','Pfeffer','Currypulver','Schnittlauch']) {
      for (const k of NAEHRWERT_FELDER) expect(findNaehrwerte(n)[k],n+' '+k).toBe(0);
    }
    expect(findNaehrwerte('Spicy Topping').kcal).toBe(355);
    expect(findNaehrwerte('Stollengewürz').zucker).toBe(88.7);
  });
});
