import { it, expect } from 'vitest';
import { generateBonBytes, generateVorteigBonBytes, textToBytes, getBonConfig, getFrischeZutaten, teilerInfoText } from './escpos.js';
import { produktRezept } from '../calc/produktion.js';
import { koch, rezept, mehl, wasser, zutat } from '../../../test/fach-fixtures.js';
import { skaliereMultiProdukt } from '../calc/multiprodukt.js';
const plain = bytes => String.fromCharCode(...bytes);
it('druckt Grundname und Variante auf Haupt- und Vorstufenbons', () => {
  const r=produktRezept(rezept([mehl(1)],{name:'Joghurt-Dinkel',produkte:[{name:'mit Körnern',gewicht_g:1000}]}),'mit Körnern');
  const titel=plain(textToBytes('Joghurt-Dinkel - mit Körnern'));
  expect(plain(generateBonBytes(r,[1],'1 Stück',''))).toContain(titel);
  expect(plain(generateVorteigBonBytes(r,[],'1 Stück','Vorteig',''))).toContain(titel);
});
it('bricht lange Rezeptnamen um, ohne das Namensende abzuschneiden', () => {
  const name='Langes Joghurt Dinkel Spezialbrot mit Sonnenblumenkernen';
  const bon=plain(generateBonBytes(rezept([mehl(1)],{name}),[1],'1 Stück',''));
  expect(bon.replace(/\n/g,' ')).toContain(name);
});
it('CP858 kodiert Umlaute und Euro für den Bondrucker',()=>expect(textToBytes('äöüÄÖÜß€')).toEqual([0x84,0x94,0x81,0x8e,0x99,0x9a,0xe1,0xd5]));
it('Bon-TA enthält Kochstückwasser, frische Flüssigkeit bleibt separat',()=>{
  const r=koch(), sk=r.zutaten.map(z=>z.menge_kg);
  const bytes=plain(generateBonBytes(r,sk,'17 Stück',''));
  expect(bytes).toContain('TA: 170'); expect(bytes).not.toContain('TA: 170%');
  expect(bytes).not.toContain('TA: 150');
});
it.each(['Rührmasse','Mürbeteig','Biskuitmasse'])('%s druckt keine TA',name=>{
  const r=rezept([mehl(1),wasser(1)],{name}); expect(plain(generateBonBytes(r,[1,1],'2 Stück',''))).not.toContain('TA:');
});
it('Bon verwendet gewählte Variante',()=>{
  const r=rezept([mehl(10),wasser(6),wasser(2,{fuer_produkte:['Feucht']})],{produkte:[{name:'Trocken',gewicht_g:1000},{name:'Feucht',gewicht_g:1000}]});
  expect(plain(generateBonBytes(r,skaliereMultiProdukt(r,{Trocken:1}),'1 Trocken',''))).toContain('TA: 160');
});
it('Unvollständige Nährwerte werden nicht gedruckt',()=>{
  const r=rezept([mehl(1),zutat('Unbekannte Testzutat',.01)]);
  expect(plain(generateBonBytes(r,[1,.01],'1 Stück','',{cfg:{...getBonConfig(r),naehrwerte:true}}))).not.toContain('Naehrwerte/100g');
});
it('Voreinstellung und Teiler sind erhalten',()=>{
  expect(getBonConfig(null)).toMatchObject({allergene:false,naehrwerte:false,bonSauerteig:true});
  expect(teilerInfoText(.5)).toBe('1/2 HALB'); expect(teilerInfoText(.25)).toBe('1/4 VIERTEL');
});
