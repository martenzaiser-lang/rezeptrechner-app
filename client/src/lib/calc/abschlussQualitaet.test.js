import { describe, expect, it } from 'vitest';
import { findNaehrwerte, getRezeptAllergene, getRezeptAllergenStatus, getRezeptSpuren } from './naehrwerteLookup.js';
import { getRezeptKenntlichmachung } from './verkaufsZutaten.js';
import { rezeptZutaten } from './rezeptZutaten.js';
import { produktNaehrwerte } from './produktNaehrwerte.js';
import { taErgebnis, taLabel } from './ta.js';
import { berechneRohstoffkosten } from '../preise.js';
import { validateRecipe } from '../../../../shared/validation.js';
import { rezept, zutat } from '../../../test/fach-fixtures.js';

describe('Abschlussprüfung: belegte Werte und vollständige Ausgaben', () => {
  it('übernimmt Stollen fein aus dem Packungsfoto einschließlich Milch und richtigem Zuckerwert', () => {
    const r = rezept([zutat('Stollengewürz', 1)]), p = produktNaehrwerte(r);
    expect(p.deklarationVollstaendig).toBe(true);
    expect(p.werte).toMatchObject({kj:1694,kcal:400,fett:2.8,gfs:1.5,kh:90,zucker:88.7,eiweiss:1,salz:.3,ballaststoffe:.6});
    expect(getRezeptAllergene(r)).toEqual(['G']);
    expect(findNaehrwerte('Stollengewürz').quelle_sha256).toBe('1f88b11f1cfdb82574deda40d13d0cbe052256dc30df166ff9d0873e6bb7ca7a');
  });
  it('berechnet KOMPLET-Kochcreme aus dem Pulver und übernimmt Weizen sowie Ei-/Milchspuren', () => {
    const r = rezept([zutat('Kochcreme',1)]), p = produktNaehrwerte(r);
    expect(p.deklarationVollstaendig).toBe(true);
    expect(p.werte).toMatchObject({kj:1483,kcal:354,kh:85.9,zucker:.3,salz:.01,ballaststoffe:1});
    expect(getRezeptAllergene(r)).toEqual(['Aa']);
    expect(getRezeptSpuren(r)).toEqual(['C','G']);
  });
  it('gibt vollständige Nährwertzahlen bei ungeprüften Allergenen nicht zur Deklaration frei', () => {
    const r = rezept([zutat('Kochcreme',1)]);
    const custom = [{name:'Kochcreme',data:{...findNaehrwerte('Kochcreme'),allergene:[],allergene_geprueft:false}}];
    const p = produktNaehrwerte(r,custom);
    expect(p.vollstaendig).toBe(true);
    expect(p.deklarationVollstaendig).toBe(false);
    expect(p.deklarationsFehler).toEqual(['Allergenangaben ungeprüft: Kochcreme']);
  });
  it('meldet beim leeren Rezept eine fehlende Grundlage statt vollständiger Nullkosten oder Nährwerte', () => {
    const r = rezept([], {berechnung:'blech'});
    expect(berechneRohstoffkosten(r).fehler).toBe('Keine berechenbare Zutatenmenge');
    expect(produktNaehrwerte(r).deklarationVollstaendig).toBe(false);
    expect(produktNaehrwerte(r).deklarationsFehler).toContain('Keine berechenbare Zutatenmenge');
  });
  it('unterscheidet die Trockenmischung fachlich von Teigen, ohne eine TA zu erfinden', () => {
    const r = rezept([zutat('Paniermehl',20),zutat('Salz',7.2)],{rezeptart:'mischung'});
    expect(validateRecipe(r)).toEqual([]);
    expect(taErgebnis(r)).toEqual({status:'ignoriert',kategorie:'Trockenmischung',ta:null});
    expect(taLabel(r)).toBe('');
  });
  it('gibt einen ungeprüften eigenen Backerbsen-Altbestand trotz bestätigter Referenz nicht automatisch frei', () => {
    const r = rezept([zutat('Backerbse',1)]);
    const custom = [{name:'Backerbse',data:{...findNaehrwerte('Backerbse'),allergene_geprueft:false,zutaten_geprueft:false}}];
    expect(getRezeptAllergenStatus(r,custom).vollstaendig).toBe(false);
    expect(produktNaehrwerte(r,custom).deklarationVollstaendig).toBe(false);
  });
  it('sperrt fehlende Unterzutaten auch durch eine eigene Mischung hindurch', () => {
    const quelle = rezept([zutat('Neue Füllung',1)], {id:'streusel',name:'Streusel'});
    const ziel = rezept([zutat('Streusel',1)]);
    const d = {...findNaehrwerte('Kochcreme'),zusammengesetzt:true,zutaten_lmiv:''};
    const custom = rezeptZutaten([quelle,ziel],[{name:'Neue Füllung',data:d}]);
    const p = produktNaehrwerte(ziel,custom);
    expect(p.vollstaendig).toBe(true);
    expect(p.deklarationVollstaendig).toBe(false);
    expect(p.deklarationsFehler).toContain('Zusammensetzung ungeprüft: Streusel');
  });
  it('verwendet für Zusatzstoffhinweise dieselbe vorrangige eigene Zutatenliste', () => {
    const r = rezept([zutat('Kochcreme',1)]);
    expect(getRezeptKenntlichmachung(r,[{name:'Kochcreme',data:{zutaten_lmiv:'Stärke; Farbstoff: Carotin'}}])).toEqual(['mit Farbstoff']);
  });
  it('fordert für neue Artikel auch bei vollständigen Zahlen eine Rohstoffzuordnung oder Zutatenliste', () => {
    const r = rezept([zutat('Neuer Artikel',1)]);
    const d = {...findNaehrwerte('Kochcreme'),zutaten_lmiv:''};
    expect(produktNaehrwerte(r,[{name:'Neuer Artikel',data:d}]).deklarationVollstaendig).toBe(false);
    expect(produktNaehrwerte(r,[{name:'Neuer Artikel',data:{...d,zusammengesetzt:false}}]).deklarationVollstaendig).toBe(true);
  });
});
