import { describe, expect, it } from 'vitest';
import { NAEHRWERT_RECHERCHE } from '../../data/naehrwertRecherche.js';
import { findNaehrwerte, getRezeptAllergene, getRezeptAllergenStatus, getRezeptLmivZutaten } from './naehrwerteLookup.js';
import { naehrwertStatus } from './naehrwertFelder.js';
import { produktNaehrwerte } from './produktNaehrwerte.js';
import { rezeptZutaten } from './rezeptZutaten.js';
import { validateCustomIngredient } from '../../../../shared/validation.js';
import { rezept, zutat, mehl, wasser } from '../../../test/fach-fixtures.js';

describe('Recherche und bestätigte Produktzuordnungen Oktober 2026', () => {
  it('hat belegte Pflichtfelder und widerspruchsfreie Teilmengen in allen neuen Profilen', () => {
    for (const [name, p] of Object.entries(NAEHRWERT_RECHERCHE)) {
      expect(naehrwertStatus(p).vollstaendig, name).toBe(true);
      expect(validateCustomIngredient(p), name).toEqual([]);
      expect(p.quelle, name).toBeTruthy(); expect(p.quelle_url, name).toMatch(/^https:/);
      expect(p.fett + p.kh + p.eiweiss + (p.ballaststoffe || 0) + p.salz, name).toBeLessThanOrEqual(102);
    }
  });
  it('verwendet für Malz reines Aromatic-Roggenmalz und übernimmt Obergrenzen sichtbar', () => {
    const p = produktNaehrwerte(rezept([zutat('Malz', 1)]));
    expect(p.werte.kcal).toBe(353);
    expect(p.bezug).toContain('<0,5 g');
    expect(getRezeptAllergene(rezept([zutat('Malz', 1)]))).toEqual(['Ab']);
    expect(findNaehrwerte('Roggenmalz')).toEqual(findNaehrwerte('Malz'));
  });
  it('berechnet die Semmel-Aromamischung nach gleichen Gewichten und erkennt Milch', () => {
    const aroma = findNaehrwerte('Aroma');
    expect(aroma.kcal).toBeCloseTo((81 + 114 + 2.6) / 3);
    expect(aroma.kh).toBeCloseTo((19.1 + 26.9) / 3);
    expect(aroma.ballaststoffe).toBeCloseTo(.9);
    const r = rezept([zutat('Aroma', .015)]);
    expect(getRezeptAllergene(r)).toEqual(['G']);
    expect(getRezeptLmivZutaten(r)[0].lmiv).toContain('<b>MILCH</b>');
    expect(getRezeptAllergenStatus(r).vollstaendig).toBe(true);
    expect(produktNaehrwerte(r).bezug).toContain('15 g insgesamt');
  });
  it('ordnet bestätigte Öl-/Sahnestandnamen zu, ohne beliebige Produktzusätze zu erraten', () => {
    expect(findNaehrwerte('Öl')).toEqual(findNaehrwerte('Rapsöl'));
    expect(findNaehrwerte('Sahnestand Neutral')).toEqual(findNaehrwerte('Sahnessa Neutral'));
    expect(findNaehrwerte('Malz unbekannte Mischung')).toBeNull();
    expect(findNaehrwerte('Oliven').referenz_artikel).toContain('Grüne Oliven');
  });
  it('erhält eigene offene Daten sowie Allergenunsicherheit trotz vollständiger Referenz', () => {
    const custom = [{name:'Kochcreme',data:{...findNaehrwerte('Kochcreme'),salz:null,allergene:[],allergene_geprueft:false}}];
    const r = rezept([zutat('Kochcreme', 1)]);
    expect(produktNaehrwerte(r,custom).vollstaendig).toBe(false);
    expect(getRezeptAllergenStatus(r,custom).vollstaendig).toBe(false);
  });
  it('löst eindeutige Allergen-Schreibweisen auf und beachtet eigene Sperren', () => {
    const r = rezept([zutat('Wasser (Schüttwasser)', .5),zutat('Mandeln gehobelt',.1)]);
    expect(getRezeptAllergene(r)).toEqual(['Ha']);
    expect(getRezeptAllergenStatus(r).vollstaendig).toBe(true);
    expect(getRezeptAllergenStatus(r,[{name:'Mandeln gehobelt',data:{allergene:[],allergene_geprueft:false}}]).vollstaendig).toBe(false);
  });
  it('gibt Vergleichsquellen und Rechenannahmen durch verschachtelte Rezeptmischungen weiter', () => {
    const mix = rezept([mehl(1),wasser(.5),zutat('Hopfenmehl',.01)],{id:'mix',name:'Brotmischung'});
    const ur = rezept([zutat('Mischung',1),zutat('Malz',.01)],{id:'ur',name:'Urstück'});
    const end = rezept([zutat('Urstückteig',1)]);
    const custom = rezeptZutaten([mix,ur,end]);
    const p = produktNaehrwerte(end,custom);
    expect(p.vollstaendig).toBe(true);
    expect(p.bezug).toContain('Getrockneter Hopfen');
    expect(p.bezug).toContain('trockenen Blüten');
    expect(p.bezug).toContain('Obergrenzen');
  });
});
