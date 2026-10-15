import { describe, expect, it } from 'vitest';
import { skaliereMitBezug } from './prozentSkalierung.js';
import { skaliereMultiProdukt } from './multiprodukt.js';
import { taBilanz } from './ta.js';
import { mehl, wasser, rezept, zutat } from '../../../test/fach-fixtures.js';

// Mengen und Prozentbezüge aus der Produktionssicherung vor dem 14.10.2026.
const zusatz = (name,p,produkt,extra={}) => zutat(name,0,{zusatz_prozent:p,prozent_bezug:'endprodukt',fuer_produkte:[produkt],...extra});
const roggen = () => rezept([
  mehl(1.01),zutat('Brotmischung',.2,{ta_pro_kg:{mehl_kg:.8,fluessigkeit_kg:0}}),
  zutat('Roggensauerteig',1,{ta_pro_kg:{mehl_kg:1/2.02,fluessigkeit_kg:1/2.02}}),zutat('Frischhefe',.022),wasser(1),
  zusatz('Roggenkörner (Katenbrot)',12,'Katenbrot',{ta_pro_kg:{mehl_kg:1/3.5,fluessigkeit_kg:2.5/3.5}}),
  zusatz('Roggenkörner(Mehrkornbrot)',7.7,'Körnerbrot',{ta_pro_kg:{mehl_kg:1/3.5,fluessigkeit_kg:2.5/3.5}}),
  zusatz('Leinsaat',2.3,'Körnerbrot'),zusatz('Sesam',2.3,'Körnerbrot'),zusatz('Sonnenblumenkerne',6.3,'Körnerbrot'),zusatz('Wasser',5.4,'Körnerbrot',{ist_wasser:true}),
  zusatz('Kümmel',3,'Vinschgauer'),zusatz('Weizenmehl 550',12,'Vinschgauer',{ist_mehl:true}),zusatz('Stabilase',2.4,'Vinschgauer'),
],{name:'Roggenteig',produkte:[{name:'Katenbrot',gewicht_g:850},{name:'Körnerbrot',gewicht_g:850},{name:'Vinschgauer',gewicht_g:100}]});

describe('Belegte Roggenteigmengen bleiben unabhängig von der TA-Mehlbasis', () => {
  it.each([
    ['Katenbrot',5,[1.02]],
    ['Körnerbrot',6,[.6545,.1955,.1955,.5355,.459]],
    ['Vinschgauer',11,[.03,.12,.024]],
  ])('10 × %s entsprechen wieder der alten Produktionsberechnung', (name,start,erwartet) => {
    const r=roggen(),sk=skaliereMultiProdukt(r,{[name]:10});
    erwartet.forEach((kg,i)=>expect(sk[start+i]).toBeCloseTo(kg,10));
    expect(sk.reduce((s,n)=>s+n,0)).toBeCloseTo(name==='Vinschgauer'?1:8.5,10);
    const geaendert={...r,zutaten:r.zutaten.map(z=>z.name==='Brotmischung'?{...z,ta_pro_kg:{mehl_kg:0,fluessigkeit_kg:0}}:z)};
    expect(skaliereMultiProdukt(geaendert,{[name]:10})).toEqual(sk);
  });
  it('addiert gemischte Bestellungen ohne Wechsel des Prozentbezugs', () => {
    const r=roggen(),a=skaliereMultiProdukt(r,{Katenbrot:10}),b=skaliereMultiProdukt(r,{'Körnerbrot':10});
    const gemeinsam=skaliereMultiProdukt(r,{Katenbrot:10,'Körnerbrot':10});
    gemeinsam.forEach((v,i)=>expect(v).toBeCloseTo(a[i]+b[i],10));
  });
});

describe('Mehl-, Basisteig- und Produktgewichtsprozente', () => {
  it('kombiniert 2 % Salz vom Mehl mit 20 % Rosinen vom Produktgewicht', () => {
    const r=rezept([mehl(10),wasser(6),zutat('Salz',0,{zusatz_prozent:2,prozent_bezug:'mehl'}),zutat('Rosinen',0,{zusatz_prozent:20,prozent_bezug:'endprodukt'})]);
    const sk=skaliereMitBezug(r,{zielKg:20.25});
    [10,6,.2,4.05].forEach((v,i)=>expect(sk[i]).toBeCloseTo(v,10));
  });
  it('erhält den Basisteigbezug einer Stollenfüllung über 100 %', () => {
    const r=rezept([mehl(1),wasser(.6),zutat('Füllung',0,{zusatz_prozent:143,prozent_bezug:'basisteig'})]);
    const sk=skaliereMitBezug(r,{zielKg:3.888});
    expect(sk[2]).toBeCloseTo(2.288,10);
  });
  it('löst auch zusätzliches Mehl mit Produktgewichtsbezug korrekt auf', () => {
    const r=rezept([mehl(10),wasser(6),mehl(0,{zusatz_prozent:10,prozent_bezug:'endprodukt'}),zutat('Salz',0,{zusatz_prozent:2,prozent_bezug:'mehl'})]);
    const sk=skaliereMitBezug(r,{zielKg:20});
    expect(sk[2]).toBeCloseTo(2,10);
    expect(sk[3]/taBilanz(r,sk).mehl).toBeCloseTo(.02,10);
    expect(sk.reduce((s,n)=>s+n,0)).toBeCloseTo(20,10);
  });
  it('kann reine Bäckerprozentrezepte um einen Produktgewichtsanteil ergänzen', () => {
    const r=rezept([mehl(0,{zusatz_prozent:100,prozent_bezug:'mehl'}),wasser(0,{zusatz_prozent:60,prozent_bezug:'mehl'}),zutat('Rosinen',0,{zusatz_prozent:20,prozent_bezug:'endprodukt'})]);
    const sk=skaliereMitBezug(r,{zielKg:20});
    [10,6,4].forEach((v,i)=>expect(sk[i]).toBeCloseTo(v,10));
  });
  it('weist 100 % Produktzugaben und einen unklaren Bezug zurück', () => {
    for(const [prozent_bezug,zusatz_prozent] of [['endprodukt',100],['auflage',10]]) {
      const r=rezept([mehl(1),zutat('Rosinen',0,{zusatz_prozent,prozent_bezug})]);
      expect(()=>skaliereMitBezug(r,{zielKg:2})).toThrow(/Prozent|Produktgewicht/);
    }
  });
});
