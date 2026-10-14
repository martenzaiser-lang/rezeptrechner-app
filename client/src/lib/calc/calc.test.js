import { describe, it, expect } from 'vitest';
import { ta, taErgebnis, taBilanz, gesamt, bp, getSauerteigTA } from './ta.js';
import { skaliere, skaliereBlech } from './skalierung.js';
import { skaliereMultiProdukt } from './multiprodukt.js';
import { berechneBaker } from './bakerBerechnung.js';
import { kochstuecke, pruefeKochwaage } from './kochKontrolle.js';
import { produktRezept } from './produktion.js';
import { schuettTemperatur } from './schuettwasser.js';
import { zutat, mehl, wasser, rezept, koch, multi } from '../../../test/fach-fixtures.js';
const sum = xs => xs.reduce((a,b)=>a+b,0);

describe('Unabhängige TA-Fachregeln', () => {
  it('10 kg Mehl + 6 kg Wasser = TA 160', () => expect(ta(rezept())).toBe(160));
  it.each(['Kochstück','Brühstück','Quellstück','Vorteig','Sauerteig'])('%s zählt vollständig', abschnitt => {
    const r = rezept([mehl(9), wasser(5), mehl(1,{bemerkung:abschnitt}), wasser(2,{bemerkung:abschnitt})]);
    expect(ta(r)).toBe(170);
  });
  it.each(['Leinsaat','Eiszeit','Teigverbesserer','Milchpulver','Sonnenblumenkerne','Altbrot','Leinsamenmehl'])('%s zählt weder als Mehl noch Fl?ssigkeit', name => {
    const r = rezept([mehl(10),wasser(6),zutat(name,1,{ist_mehl:/mehl|Altbrot/.test(name)})]);
    expect(ta(r)).toBe(160);
  });
  it.each(['Paniermehl', 'Semmelbrösel', 'Semmelmehl', 'Brotbrösel', 'Paniermehl/Semmelbrösel/Semmelmehl'])('%s zählt auch ohne Mehlflag und bei alter Zuordnung wie Mehl', name => {
    for (const extra of [{}, { ist_mehl: true }, { ta_rolle: 'sonstiges' }]) {
      const r = rezept([mehl(10), wasser(7), zutat(name, 1, extra)]);
      expect(taBilanz(r).mehl).toBe(11);
      expect(ta(r)).toBe(163.6);
      expect(ta(r, [20, 14, 2])).toBe(163.6);
    }
  });
  it('Saaten-Quellwasser zählt, Saaten-Eigengewicht nicht', () => {
    expect(ta(rezept([mehl(10),wasser(6),zutat('Sonnenblumenkerne',2,{ist_mehl:true,bemerkung:'Quellstück'}),wasser(2,{bemerkung:'Quellstück'})]))).toBe(180);
  });
  it('Sauerteig wird genau einmal in Komponenten zerlegt', () => {
    for (const flag of [true,false]) {
      const r = rezept([mehl(10),wasser(6),zutat('Sauerteig TA 200',2,{ist_mehl:flag,vorstufe_nur_mehl_wasser:true})]);
      expect(ta(r)).toBe(163.6); expect(taBilanz(r).mehl).toBe(11); expect(taBilanz(r).fluessigkeit).toBe(7);
    }
  });
  it.each(['Sauerteig','Kochstück','Poolish','Biga','Brühstück'])('Unbekannte %s-Zusammensetzung verhindert Schein-TA', name => {
    expect(taErgebnis(rezept([mehl(1),zutat(name,1)]))).toMatchObject({ta:null,status:'unvollständig'});
  });
  it('Vorstufe mit Saaten und Salz braucht tatsächliche Anteile', () => {
    expect(ta(rezept([mehl(10),wasser(6),zutat('Quellstück',3,{ta_anteile:{mehl_kg:0,fluessigkeit_kg:2}})]))).toBe(180);
  });
  it.each(['Rührmasse','Biskuitmasse','Wiener Masse','Brandmasse','Mürbemasse','Mürbeteig'])('%s hat keine TA', name => {
    expect(taErgebnis(rezept([mehl(1),wasser(1)],{name}))).toMatchObject({status:'ignoriert',ta:null});
  });
  it('Hefekuchen kann explizit als Teig zugeordnet werden', () => expect(ta(rezept(undefined,{kategorie:'Kuchen',rezeptart:'teig'}))).toBe(160));
  it('Unklassifizierter Kuchen bleibt ohne TA', () => expect(ta(rezept(undefined,{kategorie:'Kuchen'}))).toBeNull());
  it('Massen: Mehl=100%, Butter=60%, Zucker=40%; proportional skalieren', () => {
    const r=rezept([mehl(1),zutat('Butter',.6),zutat('Zucker',.4)],{rezeptart:'masse',stueckgewicht_g:1000});
    expect(bp(r,r.zutaten[0])).toBe(100); expect(bp(r,r.zutaten[1])).toBe(60); expect(bp(r,r.zutaten[2])).toBe(40);
    expect(skaliere(r,4)).toEqual([2,1.2,.8]); expect(ta(r)).toBeNull();
  });
  it.each([0,-1,NaN,Infinity])('Ungültige Vorstufen-TA %s liefert keine Zahl', n => expect(getSauerteigTA({vorstufe_ta:n})).toBeNull());
  it('TA 180,5 wird vollständig geparst', () => expect(getSauerteigTA({name:'Sauerteig TA 180,5'})).toBe(180.5));
  it('Kommentare mit Restmenge z?hlen nirgends', () => {
    const r=rezept([mehl(10),wasser(6),zutat('Hinweis',4,{ist_kommentar:true})]);
    expect(gesamt(r)).toBe(16); expect(skaliere(r,16)).toEqual([10,6,0]); expect(ta(r)).toBe(160);
  });
});

describe('Skalierung und Prozentbez?ge', () => {
  it('Mehrere Varianten sind additiv', () => expect(skaliereMultiProdukt(multi(),{A:1,B:1})).toEqual([2,2,1]));
  it('TA folgt der ausgewählten Variante', () => {
    const r = rezept([mehl(10),wasser(6),wasser(2,{fuer_produkte:['Feucht']})],{produkte:[{name:'Trocken',gewicht_g:1000},{name:'Feucht',gewicht_g:1000}]});
    expect(ta(r,skaliereMultiProdukt(r,{Trocken:1}))).toBe(160);
    expect(ta(r,skaliereMultiProdukt(r,{Feucht:1}))).toBe(180);
    expect(produktRezept(r,'Trocken').zutaten).toHaveLength(2);
  });
  it.each([.1,1,2,17,123])('Stückzahl %s erhält Mengenverhältnis und Zielgewicht', n => {
    const sk=skaliere(rezept(),n); expect(sum(sk)).toBeCloseTo(n,12); expect(sk[1]/sk[0]).toBeCloseTo(.6,12);
  });
  it('Kleinmengen bleiben auch mit Teiler erhalten', () => {
    const r=rezept([mehl(1),zutat('Salz',.0001)],{stueckgewicht_g:1000});
    const res=berechneBaker(r,{stueck:1,faktor:.25}); expect(res.sk[1]).toBeCloseTo(.00002499750025,14);
  });
  it('Blech 2×40×60 statt 50×80: Faktor 1,2', () => expect(skaliereBlech(rezept(),2,40,60)).toEqual([12,7.199999999999999]));
  it('10 % Zusatz beziehen sich immer auf Gesamtmehl, auch im Altbestand', () => {
    for (const flag of [undefined,'mehl']) {
      const r=rezept([mehl(1),wasser(1),zutat('Zucker',0,{zusatz_prozent:10,prozent_bezug:flag})]);
      const sk=skaliere(r,2); expect(sum(sk)).toBeCloseTo(2,12); expect(sk[2]/sk[0]).toBeCloseTo(.1,12);
    }
  });
  it('Mehl aus der Vorstufe ist Teil der Prozentbasis', () => {
    const r=rezept([mehl(9),wasser(6),zutat('Poolish',2,{ta_anteile:{mehl_kg:1,fluessigkeit_kg:1}}),zutat('Salz',0,{zusatz_prozent:2})]);
    const sk=skaliere(r,17.2); expect(sk[3]).toBeCloseTo(.2,12); expect(sum(sk)).toBeCloseTo(17.2,12);
  });
  it('Reines Prozentrezept: 100 % Mehl, 60 % Wasser, 2 % Salz', () => {
    const r=rezept([mehl(0,{zusatz_prozent:100}),wasser(0,{zusatz_prozent:60}),zutat('Salz',0,{zusatz_prozent:2})]);
    const sk=skaliere(r,16.2); [10,6,.2].forEach((v,i) => expect(sk[i]).toBeCloseTo(v,10)); expect(ta(r,sk)).toBe(160);
  });
  it('Teilweise prozentual erfasstes Mehl wird in die Gesamtmehlbasis aufgelöst',()=>{
    const r=rezept([mehl(.8),mehl(0,{zusatz_prozent:20}),wasser(0,{zusatz_prozent:60})]);
    const sk=skaliere(r,1.6); expect(sk[0]).toBeCloseTo(.8); expect(sk[1]).toBeCloseTo(.2); expect(sk[2]).toBeCloseTo(.6);
  });
  it('2 Pressen à 30 Stück sind 60 Stück', () => {
    const r=rezept([mehl(1)],{produkte:[{name:'A',gewicht_g:100,stueck_pro_presse:30},{name:'B',gewicht_g:100}]});
    expect(berechneBaker(r,{produktStueck:{A:2},faktor:1})).toMatchObject({stueckzahl:60,teigGesamtKg:6});
  });
  it('Prozentrezept ohne Mehl liefert einen Bedienhinweis statt NaN', () => {
    const r=rezept([zutat('Zucker',0,{zusatz_prozent:110})]);
    expect(berechneBaker(r,{stueck:1}).fehler).toContain('Mehl');
  });
});

describe('Kochstück und Rückwaage', () => {
  it('Soll 3 kg, Ist 2,8 kg: 200 g auff?llen, Rezept-TA bleibt 170', () => {
    const r=koch(), stufe=kochstuecke(r,r.zutaten.map(z=>z.menge_kg))[0];
    expect(stufe.sollKg).toBe(3); expect(pruefeKochwaage(stufe,2.8).wasserNachfuellenKg).toBeCloseTo(.2,12); expect(ta(r)).toBe(170);
  });
  it.each([-1,NaN,3.1,0])('Unplausibles Istgewicht %s wird abgewiesen', ist => {
    const r=koch(), stufe=kochstuecke(r,r.zutaten.map(z=>z.menge_kg))[0];
    expect(pruefeKochwaage(stufe,ist).status).not.toBe('korrekt');
  });
  it('Schütttemperatur bleibt korrekt', () => expect(schuettTemperatur({teig:26,raum:22,mehl:20,knet:8})).toBe(28));
});
