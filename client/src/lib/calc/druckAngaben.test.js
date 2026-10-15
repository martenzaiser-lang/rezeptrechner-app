import { describe, it, expect } from 'vitest';
import { produktAnzeigename } from './produktName.js';
import { produktRezept } from './produktion.js';
import { malzZuckerHinweis } from './zuckerHinweis.js';
import { rezeptZutaten } from './rezeptZutaten.js';
import { rezept, mehl, wasser, zutat } from '../../../test/fach-fixtures.js';

describe('Vollständige Produktnamen auf Ausdrucken', () => {
  const r = rezept([mehl(1),wasser(.6)],{name:'Joghurt-Dinkel',produkte:[{name:'mit Körnern',gewicht_g:1000},{name:'ohne Körner',gewicht_g:500}]});
  it('behält Grundname und Variante auch bei wiederholter Produktaufbereitung', () => {
    const p = produktRezept(r,'mit Körnern');
    expect(produktAnzeigename(p)).toBe('Joghurt-Dinkel – mit Körnern');
    expect(produktAnzeigename(produktRezept(p,'mit Körnern'))).toBe('Joghurt-Dinkel – mit Körnern');
    expect(produktAnzeigename(produktRezept(r,'ohne Körner'))).toBe('Joghurt-Dinkel – ohne Körner');
    expect(p.name).toBe('mit Körnern'); // Rechenschlüssel unverändert.
    expect(r.name).toBe('Joghurt-Dinkel');
  });
  it('verdoppelt bereits vollständige Produktnamen nicht', () => {
    expect(produktAnzeigename({...r,produkte:[{name:'Joghurt-Dinkel mit Körnern'}]})).toBe('Joghurt-Dinkel mit Körnern');
    expect(produktAnzeigename(rezept())).toBe('Testbrot');
    expect(produktAnzeigename({...r,produkte:[{name:'Joghurt-Dinkel'}]})).toBe('Joghurt-Dinkel');
  });
});

describe('Kleiner Malzhinweis nur für passende Rezepturen', () => {
  it.each(['Malz','Backmalz','Roggenmalz','Eismalz','Optimal'])('erkennt Malz aus %s und dessen Herstellerliste', name => {
    expect(malzZuckerHinweis(rezept([mehl(1),zutat(name,.02)]))).toBe('Enthält auch Zucker aus Getreidemalz.');
  });
  it.each(['Zucker','Joghurt','Maltodextrin','Schweineschmalz','Exzellent'])('behauptet bei %s kein Getreidemalz', name => {
    expect(malzZuckerHinweis(rezept([mehl(1),zutat(name,.1)]))).toBe('');
  });
  it('beachtet Varianten, Nullmengen und Kommentare', () => {
    const r=rezept([mehl(1),wasser(.6),zutat('Optimal',.02,{fuer_produkte:['mit Malz']})],{produkte:[{name:'mit Malz',gewicht_g:1000},{name:'ohne Malz',gewicht_g:1000}]});
    expect(malzZuckerHinweis(produktRezept(r,'mit Malz'))).not.toBe('');
    expect(malzZuckerHinweis(produktRezept(r,'ohne Malz'))).toBe('');
    expect(malzZuckerHinweis(rezept([mehl(1),zutat('Malz',0),zutat('Malz',1,{ist_kommentar:true})]))).toBe('');
  });
  it('verwendet die eigene tatsächliche Zusammensetzung vor einem Handelsnamen', () => {
    const custom=[{name:'Backmalz',data:{zucker:10,zutaten_lmiv:'Weizenmehl; Zucker'}}];
    expect(malzZuckerHinweis(rezept([zutat('Backmalz',1)]),custom)).toBe('');
    expect(malzZuckerHinweis(rezept([zutat('Neue Mischung',1)]),[{name:'Neue Mischung',data:{zucker:1,zutaten_lmiv:'<b>GERSTENmalzextrakt</b>; Wasser'}}])).not.toBe('');
    expect(malzZuckerHinweis(rezept([zutat('Malz',1)]),[{name:'Malz',data:{zucker:0}}])).toBe('');
  });
  it('vererbt belegtes Malz aus eigenen Unterrezepturen', () => {
    const mix=rezept([mehl(1),zutat('Optimal',.02)],{id:'mix',name:'Brotmischung'});
    const r=rezept([zutat('Brotmischung',1)]);
    expect(malzZuckerHinweis(r,rezeptZutaten([mix,r]))).not.toBe('');
    const ohneMalz={...mix,zutaten:[mehl(1),zutat('Exzellent',.02)]};
    expect(malzZuckerHinweis(r,rezeptZutaten([ohneMalz,r]))).toBe('');
  });
});
