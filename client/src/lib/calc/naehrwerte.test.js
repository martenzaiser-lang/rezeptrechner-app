import { describe, it, expect } from 'vitest';
import { getNaehrwert, calcNutrition, getRezeptAllergene, formatAllergene, getRezeptSpuren, findNaehrwerte, berechneNaehrwerte, findHersteller } from './naehrwerteLookup.js';
import { IREKS_DATEN, IREKS_SYNONYME } from '../../data/ireks.js';
import { produktNaehrwerte } from './produktNaehrwerte.js';
import { produktRezept } from './produktion.js';
import { zutat, mehl, wasser, rezept } from '../../../test/fach-fixtures.js';
const custom = [{name:'Weizenmehl 550',kj:523,kcal:123,eiweiss:10,fett:2,gfs:.4,kh:60,zucker:2,ballaststoffe:3,salz:.02,allergene:['Aa']}];
it('Eigene Werte gelten in beiden Ausgabepfaden',()=>{
  expect(findNaehrwerte('Weizenmehl 550',custom).kcal).toBe(123);
  expect(getNaehrwert('Weizenmehl 550',{'weizenmehl 550':custom[0]}).kcal).toBe(123);
});
it('Unvollständiger Datensatz wird nicht als 0 ergänzt',()=>{
  expect(berechneNaehrwerte(rezept([mehl(1)]),[{name:'Weizenmehl 550',kcal:123}]).fehlend).toEqual(['Weizenmehl 550']);
});
it('99 % Abdeckung ist nicht vollständig',()=>{
  const r=rezept([mehl(.99),zutat('Unbekannte Testzutat',.01)]);
  expect(calcNutrition(r,[.99,.01]).vollstaendig).toBe(false);
  expect(produktNaehrwerte(r).vollstaendig).toBe(false);
});
it('Kommentar verändert weder Nährwerte noch Allergene',()=>{
  const r=rezept([mehl(1),zutat('Milch',1,{ist_kommentar:true})]);
  expect(berechneNaehrwerte(r,custom).kcal).toBe(123);
  expect(getRezeptAllergene(r,custom)).not.toContain('G');
});
it.each([0,10,20])('Backverlust %s wird nur auf fertige Nährwerte angewendet',bv=>{
  const r=rezept([mehl(1)],{backverlust_pct:bv});
  const result=produktNaehrwerte(r,custom);
  expect(result.werte.kcal).toBeCloseTo(123*100/(100-bv),10); expect(result.bezug).toContain('fertiges Produkt');
});
it('Ohne gemessenen Backverlust lautet der Bezug ungebackene Rezeptur',()=>{
  expect(produktNaehrwerte(rezept([mehl(1)]),custom).bezug).toContain('ungebackene');
});
it('Nur gewählte Variante trägt ihre Allergene bei',()=>{
  const r=rezept([mehl(1),wasser(1),zutat('Sesam',.1,{fuer_produkte:['Sesam']})],{produkte:[{name:'Natur',gewicht_g:100},{name:'Sesam',gewicht_g:100}]});
  expect(getRezeptAllergene(produktRezept(r,'Natur'))).not.toContain('K');
  expect(getRezeptAllergene(produktRezept(r,'Sesam'))).toContain('K');
});
it('Eigene Spuren und ausdrücklich leere Allergene schlagen Herstellerwerte',()=>{
  expect(getRezeptAllergene(rezept([mehl(1)]),[{name:'Weizenmehl 550',allergene:[]}])).toEqual([]);
  expect(getRezeptSpuren(rezept([mehl(1)]),[{name:'Weizenmehl 550',spuren:['K']}])).toEqual(['K']);
});
it('Unbekanntes Saatenmehl wird nicht als Weizen deklariert',()=>expect(findNaehrwerte('Fantasiemehl')).toBeNull());
describe('IREKS-Integration', () => {
  it(`alle ${Object.keys(IREKS_DATEN).length} IREKS-Produkte werden per Name gefunden`, () => {
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
