import { describe, it, expect } from 'vitest';
import { parseBaekoCSV, fehlendePreise, findZutatPreis } from './preise.js';
import { kalkuliereVk } from './kalkulation.js';
import { berechneBaker } from './calc/bakerBerechnung.js';
import { berechnePlanung } from './calc/planung.js';
import { skaliereMultiProdukt } from './calc/multiprodukt.js';
import { skaliere } from './calc/skalierung.js';
import { taBilanz, ta, rezeptart } from './calc/ta.js';
import { berechneNaehrwerte, findHersteller, findNaehrwerte } from './calc/naehrwerteLookup.js';
import { produktNaehrwerte } from './calc/produktNaehrwerte.js';
import { produktRezept } from './calc/produktion.js';
import { berechneKochzettel } from './print/zettel.js';
import { validateBackup } from '../../../shared/backup.js';
import { mehl, wasser, zutat, rezept, koch } from '../../test/fach-fixtures.js';

describe('Bäckerprozente in allen Mengenmodi', () => {
  it('behält einen Berechnungsfehler bei wiederholter Produktaufbereitung', () => {
    const r = rezept([mehl(1), zutat('Roggensauerteig', .5), zutat('Sesam', 0, { zusatz_prozent: 10 })]);
    const p = produktRezept(r);
    expect(p.berechnungsfehler).toBeTruthy();
    expect(produktRezept(p)).toBe(p);
    expect(p.deklarationsZutaten.map(z => z.name)).toContain('Sesam');
    expect(produktNaehrwerte(produktRezept(p)).vollstaendig).toBe(false);
  });
  it('physikalisch unmöglicher Gewichtsverlust erzeugt keine druckbaren Nährwerte', () => {
    const p=produktNaehrwerte(rezept([mehl(1),wasser(.6)],{backverlust_pct:90}));
    expect(p.vollstaendig).toBe(false); expect(p.fehlend.join(' ')).toContain('Nährstoffsumme');
  });
  it.each(['Rum', 'Classic Baguette', 'Gluten', 'Brotmischung'])('falsches Mehlflag bei %s ergibt keine scheinbar korrekte TA', name => {
    expect(ta(rezept([mehl(1), wasser(.6), zutat(name,.1,{ist_mehl:true})]))).toBeNull();
  });
  it('ungültige Blechmaße skalieren nicht versehentlich ein ganzes Blech', () => {
    const r=rezept(undefined,{berechnung:'blech'});
    expect(berechneBaker(r,{blechN:1,blechB:0,blechL:80}).fehler).toContain('Blech');
  });
  it('Preis-Teilwörter und unzulässige Kalkulationsquoten werden nicht geraten', () => {
    expect(findZutatPreis('Mehl')).toBeNull();
    expect(fehlendePreise(rezept([zutat('Rosenwasser',1)]),[1])).toEqual(['Rosenwasser']);
    expect(kalkuliereVk(1,{personalPct:-10})).toBeNull();
    expect(kalkuliereVk(1,{gewinnPct:NaN})).toBeNull();
  });
  it('auch Mehl einer Pressen-Festmenge gehört zur Prozentbasis', () => {
    const r=rezept([mehl(1), wasser(1), mehl(0,{menge_pro_presse:.2}), zutat('Salz',0,{zusatz_prozent:2})], { produkte:[{name:'A',gewicht_g:100,stueck_pro_presse:30},{name:'B',gewicht_g:100}] });
    const sk=skaliereMultiProdukt(r,{A:2});
    expect(sk.reduce((s,n)=>s+n,0)).toBeCloseTo(6,12);
    expect(sk[3]/taBilanz(r,sk).mehl).toBeCloseTo(.02,12);
  });
  it('Massen skalieren ebenfalls mit 100 % Gesamtmehl', () => {
    const r=rezept([mehl(0,{zusatz_prozent:100}),zutat('Butter',0,{zusatz_prozent:60}),zutat('Zucker',0,{zusatz_prozent:40})],{rezeptart:'masse'});
    expect(skaliere(r,2)).toEqual([1,.6,.4]); expect(ta(r)).toBeNull();
  });
  it.each(['Chiasamen','Mohn','Walnüsse','Mandeln','Altbrot','Paniermehl'])('%s wird selbst bei falschem Mehlflag ausgeschlossen',name=>{
    const r=rezept([mehl(1),wasser(1),zutat(name,1,{ist_mehl:true})]);expect(ta(r)).toBe(200);
  });
  it('ausdrücklich ungeklärte Rezeptart wird nicht automatisch überschrieben',()=>expect(rezeptart(rezept(undefined,{rezeptart:'unbekannt'}))).toBe('unbekannt'));
});

describe('Produktionsplanung und Vorstufenzettel', () => {
  it('auch Kleinchargen stehen vollständig auf dem Kochzettel', () => {
    const r=koch();
    expect(berechneKochzettel([r],{test:{datum:'heute',stueck:2,faktor:1}},'heute').gesamt).toBeGreaterThan(0);
  });
  it('fehlende Vorstufenanteile verschwinden nicht still aus dem Tageszettel', () => {
    const r=koch(); r.zutaten.push(zutat('Roggensauerteig',1),zutat('Salz',0,{zusatz_prozent:2}));
    const z=berechneKochzettel([r],{test:{datum:'heute',stueck:10,faktor:1}},'heute');
    expect(z.fehler).toHaveLength(1); expect(z.data).toEqual([]);
  });
  it('Bleche, Varianten, Teiler und Stücke verwenden dieselben Mengen', () => {
    const r=rezept(undefined,{id:'a'}), b=rezept(undefined,{id:'b',berechnung:'blech',blech_breite_cm:50,blech_laenge_cm:80});
    const result=berechnePlanung([r,b],{a:{stueck:4,faktor:.5},b:{blechN:2,blechB:40,blechL:60}});
    expect(result.totalTeig).toBeCloseTo(21.2);expect(result.teige[0].stueck).toBe(2);expect(result.teige[1].mengeText).toBe('2 Blech');
  });
  it('Kochzettel nimmt 2 Pressen à 30 Stück auf und beachtet den Teiler',()=>{
    const r={...koch(),produkte:[{name:'A',gewicht_g:100,stueck_pro_presse:30},{name:'B',gewicht_g:100}]};
    const result=berechneKochzettel([r],{test:{datum:'heute',produktStueck:{A:2},faktor:.5}},'heute');
    expect(result.gesamt).toBeCloseTo(3*3/17,12);
  });
  it('keine Mengen oder nur Kommentare erzeugen keine Produktionssumme',()=>{
    const result=berechnePlanung([rezept([zutat('Hinweis',10,{ist_kommentar:true})])],{test:0});expect(result.totalTeig).toBe(0);expect(result.teige).toEqual([]);
  });
});

describe('Nährstoffbilanz und Quellen', () => {
  const reference=[{name:'Testmehl',kj:1400,kcal:330,eiweiss:10,fett:2,gfs:.4,kh:65,zucker:1,ballaststoffe:4,salz:.01}];
  it('Wasser zählt zum Nenner; nur das gemessene Fertiggewicht ändert den Bezug',()=>{
    const r=rezept([zutat('Testmehl',1,{ist_mehl:true}),wasser(1)],{backverlust_pct:20});
    const raw=berechneNaehrwerte(r,reference), end=produktNaehrwerte(r,reference);
    expect(raw.kcal).toBe(165);expect(raw.kj).toBe(700);
    expect(end.werte.kcal).toBeCloseTo(206.25);expect(end.werte.kj).toBe(875);
  });
  it('kJ kommt aus der Deklaration, nicht aus kcal × 4,184',()=>{
    expect(findNaehrwerte('Eiszeit').kj).toBe(1373);expect(findNaehrwerte('Eiszeit').kcal).toBe(327);
  });
  it('Hersteller-Teilwörter dürfen kein fremdes Produkt zuordnen',()=>{
    expect(findHersteller('Unbekanntes Dinkelbackmittel')).toBeNull();expect(findHersteller('MELLA SANDBISKUIT')).toBeTruthy();
  });
  it.each(['Exzellent','Optimal','Spicy Topping','Delfia Effekt','SL-Creme'])('%s liefert mit ungeklärten Angaben keine vollständige Deklaration',name=>{
    expect(produktNaehrwerte(rezept([zutat(name,1)])).vollstaendig).toBe(false);
  });
  it('BLS-Werte haben eine überprüfbare Rohstoffzuordnung',()=>{
    const d=findNaehrwerte('Weizenmehl 550');expect(d.bls_code).toBe('C214200');expect(d.quelle_url).toContain('10.25826');
  });
});

describe('CSV-Preise und Sicherungsvalidierung',()=>{
  it('KBO Preis 62 € pro 100 kg ergibt 0,62 €/kg',()=>{
    expect(parseBaekoCSV('Artikelbezeichnung;Preis;PE;Gr.\nWeizenmehl 550;62,00;100;kg',['Weizenmehl 550'])[0].preis_eur_kg).toBe(.62);
  });
  it('null Euro, Tausendertrennzeichen und Anführungszeichen bleiben korrekt',()=>{
    const r=parseBaekoCSV('Name;€/kg\n"Zutat; speziell";1.234,50\nWasser;0',['Zutat; speziell','Wasser']);
    expect(r.map(x=>x.preis_eur_kg)).toEqual([1234.5,0]);
  });
  it.each(['Name;Preis\nMehl;10','Name;Preis;Gr.\nMehl;10;Stück','Name;€/kg\nMehl;-1','Name;€/kg\nMehl;1\nMehl;2'])('mehrdeutige oder ungültige Preise werden abgewiesen',csv=>{
    expect(()=>parseBaekoCSV(csv,['Mehl'])).toThrow();
  });
  it('fremde Artikel werden nicht per Teilwort automatisch übernommen',()=>expect(parseBaekoCSV('Name;€/kg\nRoggenmehl;1',['Mehl'])).toEqual([]));
  it('defekte Rezeptzeilen im Backup melden Fehler statt Absturz',()=>expect(validateBackup({rezepte:[null]}).length).toBeGreaterThan(0));
});
