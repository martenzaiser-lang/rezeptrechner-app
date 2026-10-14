import { it, expect } from 'vitest';
import { rezept, mehl, wasser, zutat } from '../../test/fach-fixtures.js';
import { rezeptPreise, berechneRohstoffkosten } from './preise.js';
import { sortimentsKalkulation, produktSchluessel, sortimentsCSV } from './sortimentskalkulation.js';
const parameter = { schwundPct: 0, personalPct: 40, energiePct: 5, gemeinkostenPct: 15, gewinnPct: 10, ustPct: 7 };
const preis = { 'Weizenmehl 550': { preis_kg: 1 } };
it('kalkuliert jede Variante getrennt und ignoriert inaktive Produkte', () => {
  const r = rezept([mehl(10), wasser(5)], { produkte: [{ name: 'Klein', gewicht_g: 500 }, { name: 'Groß', gewicht_g: 1000 }] });
  const rows = sortimentsKalkulation([r, { ...r, id:'inaktiv', aktiv:false }], preis, parameter);
  expect(rows).toHaveLength(2); expect(rows[0].rohstoffe).toBeCloseTo(1/3); expect(rows[1].rohstoffe).toBeCloseTo(2/3);
  expect(rows[0].vorgeschlagen).toBe(1.2); expect(rows[1].vorgeschlagen).toBe(2.4);
});
it('teilt einen Blechpreis durch Verkaufsstücke und berechnet den Preisvergleich', () => {
  const r = rezept([mehl(3)], { berechnung:'blech', blech_breite_cm:50, blech_laenge_cm:80 });
  const key = produktSchluessel(r,r.name);
  const [row] = sortimentsKalkulation([r], preis, parameter, { [key]:{portionen:'12',alterPreis:'1,00',neuerPreis:'1,20'} });
  expect(row.rohstoffe).toBe(.25); expect(row.vorgeschlagen).toBe(.9); expect(row.differenz).toBeCloseTo(20); expect(row.bezug).toContain('1/12');
});
it('exportiert bei fehlenden Kosten keinen scheinbar verlässlichen Verkaufspreis', () => {
  const r = rezept([zutat('Unbekannt',1)]);
  const [row] = sortimentsKalkulation([r],{},parameter,{[produktSchluessel(r,r.name)]:{neuerPreis:'2,50'}});
  expect(row.vorgeschlagen).toBeNull(); expect(row.fehler).toContain('Unbekannt'); expect(sortimentsCSV([row])).not.toContain('2,50');
  expect(sortimentsKalkulation([rezept([])],{},parameter)[0].fehler).toContain('Keine berechenbare Zutatenmenge');
});
it('prüft ungültige Stückzahlen und schützt Excel vor Produktnamen als Formel', () => {
  const r = rezept([mehl(1)], { name:'=1+1', berechnung:'blech' });
  const [row] = sortimentsKalkulation([r],preis,parameter,{[produktSchluessel(r,r.name)]:{portionen:'0'}});
  expect(row.fehler.join()).toContain('Stücke pro Blech'); expect(sortimentsCSV([row])).toContain("'=1+1");
});
it('eigene Mischungen folgen aktuellen Rohstoffpreisen; fehlende Quellen verdecken keine Kosten', () => {
  const mix = rezept([mehl(1),wasser(1)], { name:'Brotmischung', id:'mix' });
  const r = rezept([zutat('Brotmischung',1)], { id:'brot', stueckgewicht_g:1000 });
  const p = rezeptPreise([mix,r], [{zutat_name:'Weizenmehl 550',preis_eur_kg:2},{zutat_name:'Brotmischung',preis_eur_kg:99}]);
  expect(p.Brotmischung.preis_kg).toBe(1); expect(berechneRohstoffkosten(r,p).summe).toBe(1);
  const broken = rezeptPreise([r],[{zutat_name:'Brotmischung',preis_eur_kg:99}]);
  expect(berechneRohstoffkosten(r,broken).ohnePreis.join()).toContain('Quellrezept');
});
it('zyklische Quellrezepte lassen die App nicht abstürzen', () => {
  const a=rezept([zutat('Urstückteig',1)],{name:'Brotmischung'}), b=rezept([zutat('Brotmischung',1)],{name:'Urstück'});
  expect(rezeptPreise([a,b]).Brotmischung.fehler).toContain('Zirkuläre');
});
it('kennzeichnet Referenzpreise auch innerhalb verschachtelter eigener Mischungen', () => {
  const a=rezept([zutat('Roggenmehl 997',1,{ist_mehl:true})],{name:'Brotmischung'}), b=rezept([zutat('Brotmischung',1)],{name:'Urstück'});
  const r=rezept([zutat('Urstückteig',1)],{name:'Verkaufsbrot'});
  const prices=rezeptPreise([a,b,r]);
  expect(sortimentsKalkulation([r],prices,parameter)[0].referenzen).toContain('Roggenmehl 997');
  const eigene=rezeptPreise([a,b,r],[{zutat_name:'Roggenmehl 997',preis_eur_kg:1}]);
  expect(sortimentsKalkulation([r],eigene,parameter)[0].referenzen).toEqual([]);
});
it('kalkuliert gesalzenen Sauer mit 2,02 kg Ausbeute und erkennt Wasser mit Arbeitshinweis', () => {
  const r=rezept([zutat('Roggensauerteig',2.02),zutat('Wasser(heiß)',1)],{stueckgewicht_g:3020});
  const prices=rezeptPreise([r],[{zutat_name:'Roggenmehl 1370',preis_eur_kg:1},{zutat_name:'Salz',preis_eur_kg:2}]);
  const kosten=berechneRohstoffkosten(r,prices);
  expect(kosten.ohnePreis).toEqual([]); expect(kosten.summe).toBeCloseTo(1.04);
});
it('übernimmt Web-Richtwerte als sichtbare Schätzung und sperrt verwechselte Artikel', () => {
  const mix=rezept([zutat('Zucker',1)],{name:'Brotmischung'}),r=rezept([zutat('Brotmischung',1)]);
  const prices=rezeptPreise([mix,r],[{zutat_name:'Zucker',preis_eur_kg:1,lieferant:'Web-Richtwert (ca.)'}]);
  expect(sortimentsKalkulation([r],prices,parameter)[0].hinweise.join()).toContain('Web-Richtwert');
  for(const[zutat_name,lieferant]of [['Baguette-Backmittel','IREKS Classic Baguette']]) {
    const p=rezeptPreise([],[{zutat_name,lieferant,preis_eur_kg:1}]);
    expect(berechneRohstoffkosten(rezept([zutat(zutat_name,1)]),p).ohnePreis).toHaveLength(1);
  }
});
