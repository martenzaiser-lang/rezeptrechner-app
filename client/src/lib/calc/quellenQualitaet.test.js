import { describe, expect, it } from 'vitest';
import { produktNaehrwerte } from './produktNaehrwerte.js';
import { getRezeptAllergenStatus, findNaehrwerte } from './naehrwerteLookup.js';
import { rezeptZutaten, aufgeloesteRezepte } from './rezeptZutaten.js';
import { taErgebnis, taLabel, rohgew } from './ta.js';
import { skaliereMitBezug } from './prozentSkalierung.js';
import { berechneRohstoffkosten, rezeptPreise } from '../preise.js';
import { ROGGEN_KOCHSTUECK, ROGGEN_KOCHNAMEN } from '../../data/betrieblicheVorstufen.js';
import { rezept, mehl, wasser, zutat } from '../../../test/fach-fixtures.js';

describe('Nachgewiesene Pflichtangaben und unbekannte Zusatzangaben', () => {
  it.each(ROGGEN_KOCHNAMEN)('%s bilanziert Körner und Kochwasser und bepreist die trockenen Körner', name => {
    const z = zutat(name, 3.5, { ta_pro_kg: ROGGEN_KOCHSTUECK.ta_pro_kg, ta_naeherung: true, ta_hinweis: ROGGEN_KOCHSTUECK.hinweis, bemerkung: 'Kochstück' });
    const r = rezept([z], { stueckgewicht_g: 3500 });
    const b = taErgebnis(r), nw = produktNaehrwerte(r);
    expect(b.mehl).toBeCloseTo(1); expect(b.fluessigkeit).toBeCloseTo(2.5); expect(b.gebunden).toBeCloseTo(2.5); expect(b.ta).toBe(350); expect(b.status).toBe('näherung');
    expect(nw.vollstaendig).toBe(true); expect(nw.werte.kcal).toBeCloseTo(302 / 3.5); expect(nw.bezug).toContain('Schätzung');
    const preise = rezeptPreise([r], [{ zutat_name:'Roggenkörner', preis_eur_kg:.7 }, { zutat_name:name, preis_eur_kg:99 }]);
    expect(berechneRohstoffkosten(r,preise).summe).toBeCloseTo(.7);
    const prozent = rezept([mehl(1), wasser(.6), { ...z, menge_kg:0, zusatz_prozent:12 }]);
    const sk = skaliereMitBezug(prozent, { faktor:1 });
    expect(sk[2]).toBeCloseTo(.12 / (1 - .12 / 3.5));
    expect(taErgebnis(prozent,sk).mehl).toBeCloseTo(1 / (1 - .12 / 3.5));
  });
  it('gesalzener Sauer TA 200 enthält je 1 kg Mehl/Wasser in 2,02 kg Gesamtgewicht', () => {
    const sauer = zutat('Roggensauerteig', 2.02, { ta_rolle: 'vorstufe', ta_pro_kg: { mehl_kg: 1 / 2.02, fluessigkeit_kg: 1 / 2.02 } });
    const b = taErgebnis(rezept([sauer]));
    expect(b.mehl).toBeCloseTo(1); expect(b.fluessigkeit).toBeCloseTo(1); expect(b.ta).toBe(200);
    const r = rezept([sauer, zutat('Rosinen', 0, { zusatz_prozent: 20 })]);
    expect(skaliereMitBezug(r, { faktor: 1 })[1]).toBeCloseTo(.2);
    const direkt = produktNaehrwerte(rezept([mehl(1), wasser(1), zutat('Salz', .02)]));
    const m = findNaehrwerte('Weizenmehl 550');
    expect(direkt.werte.salz).toBeCloseTo((m.salz + 2 * findNaehrwerte('Salz').salz / 100) / 2.02);
  });
  it('berechnet Prozentzusätze mit geschätztem Mischungsmehl und zeigt dessen Grundlage', () => {
    const r = rezept([mehl(10), zutat('Mella HT', 2.1, { ta_pro_kg: { mehl_kg: .34, fluessigkeit_kg: 0 }, ta_naeherung: true, ta_hinweis: 'Stärke-Schätzung 29–39 %' }), wasser(4), zutat('Rosinen', 0, { zusatz_prozent: 20 })]);
    const sk = skaliereMitBezug(r, { faktor: 1 });
    expect(sk[3]).toBeCloseTo(2.1428);
    expect(taErgebnis(r, sk).status).toBe('näherung');
    expect(taErgebnis(r, sk).hinweise[0]).toContain('29–39 %');
  });
  it('erhält Hinweise zu Mengen nach Augenmaß auch beim Nährwertdruck', () => {
    expect(produktNaehrwerte(rezept([mehl(1)], { naehrwert_hinweis: 'Streusel nach Augenmaß' })).bezug).toContain('Streusel nach Augenmaß');
  });
  it('verwechselt bestätigte KOMPLET-Identität nicht mit belegten Nährwerten', () => {
    expect(findNaehrwerte('Kochcreme').produkt).toContain('KOMPLET');
    expect(produktNaehrwerte(rezept([zutat('Kochcreme', 1)])).vollstaendig).toBe(false);
    expect(findNaehrwerte('Spicy Topping').kcal).toBe(366);
    expect(findNaehrwerte('Spicy Topping').quelle).toContain('137990DK');
  });
  it('erhöht eine bereits als Teigeinlage gespeicherte Stückmenge nicht erneut um Backverlust', () => {
    expect(rohgew({ stueckgewicht_g: 600, backverlust_pct: 10 })).toBe(600);
    expect(rohgew({ backverlust_pct: 10 })).toBeNull();
  });
  it.each(['Optimal', 'Exzellent'])('%s hat vollständige Pflichtangaben, aber keine belegten Ballaststoffe', name => {
    const p = produktNaehrwerte(rezept([zutat(name, 1), wasser(1)], { backverlust_pct: 20, backverlust_status: 'gemessen' }));
    expect(p.vollstaendig).toBe(true);
    expect(p.werte.kcal).toBeCloseTo((name === 'Optimal' ? 307 : 347) / 2 / .8);
    expect(p.werte.ballaststoffe).toBeNull();
  });
  it('kein bekannter Teilwert wird als vollständige Ballaststoffsumme ausgewiesen', () => {
    const p = produktNaehrwerte(rezept([mehl(1), zutat('Optimal', .1)]));
    expect(p.werte.ballaststoffe).toBeNull();
  });
  it('unbekannte Pflichtangaben melden Zutat und Feld', () => {
    const p = produktNaehrwerte(rezept([mehl(1)]), [{ name: 'Weizenmehl 550', data: { ...findNaehrwerte('Weizenmehl 550'), salz: null } }]);
    expect(p.vollstaendig).toBe(false);
    expect(p.fehlendeFelder).toEqual([{ name: 'Weizenmehl 550', felder: ['Salz (g)'], quelleOffen: false }]);
  });
  it('leere unbestätigte Allergenauswahl gilt nicht als geprüfte Allergenfreiheit', () => {
    const r = rezept([zutat('Neue Zutat', 1)]);
    expect(getRezeptAllergenStatus(r, [{ name: 'Neue Zutat', data: { allergene: [], allergene_geprueft: false } }]).vollstaendig).toBe(false);
    expect(getRezeptAllergenStatus(r, [{ name: 'Neue Zutat', data: { allergene: [], allergene_geprueft: true } }]).vollstaendig).toBe(true);
  });
  it('alte Verlustpauschalen sind keine Messung', () => {
    const roh = produktNaehrwerte(rezept([mehl(1), wasser(1)]));
    const offen = produktNaehrwerte(rezept([mehl(1), wasser(1)], { backverlust_pct: 20 }));
    expect(offen.werte.kcal).toBe(roh.werte.kcal);
    expect(offen.bezug).toContain('unbestätigt');
    const schaetzung = produktNaehrwerte(rezept([mehl(1), wasser(1)], { backverlust_pct: 20, backverlust_status: 'geschaetzt' }));
    expect(schaetzung.bezug).toContain('Schätzung');
    expect(schaetzung.werte.kcal).toBeCloseTo(roh.werte.kcal / .8);
  });
  it('unberechenbare Produktmengen ergeben keine Verkaufspreisempfehlung', () => {
    expect(berechneRohstoffkosten({ zutaten: [], berechnungsfehler: 'Mehlanteile fehlen' }).ohnePreis).toContain('Mehlanteile fehlen');
  });
});

describe('Eigene Rezeptmischungen bleiben aktuell', () => {
  it('nutzt beim Streusel das aktuelle Dinkelrezept und dessen Mehlanteile', () => {
    const s = rezept([zutat('Dinkelmehl 630', 13, { ist_mehl: true }), zutat('Margarine', 7.5), zutat('Zucker', 7.5)], { name: 'Streusel', rezeptart: 'masse' });
    const daten = rezeptZutaten([s, rezept([zutat('Streusel', 1.8)])]);
    const d = findNaehrwerte('Streusel', daten);
    expect(d.ta_pro_kg.mehl_kg).toBeCloseTo(13 / 28);
    expect(d.allergene).toContain('Ae');
    expect(d.allergene).not.toContain('Aa');
    expect(d.kcal).toBeGreaterThan(300);
  });
  const mix = rezept([mehl(1), wasser(1)], { id: 'mix', name: 'Brotmischung' });
  const alt = [{ name: 'Mischung', data: { kcal: 999, allergene: ['G'] } }];
  it('berücksichtigt Mehl und Wasser einer prozentual zugegebenen eigenen Vorstufe', () => {
    const r = rezept([mehl(1), wasser(.6), zutat('Mischung', 0, { zusatz_prozent: 20 })]);
    const daten = rezeptZutaten([mix, r], alt);
    const rechenRezept = aufgeloesteRezepte([r], daten)[0];
    const sk = skaliereMitBezug(rechenRezept, { faktor: 1 });
    expect(sk[2]).toBeCloseTo(2 / 9);
    const bilanz = taErgebnis(rechenRezept, sk);
    expect(bilanz.mehl).toBeCloseTo(10 / 9);
    expect(bilanz.ta).toBe(164);
  });
  it('kennzeichnet unbekannte Trägermehle auch über verschachtelte Mischungen als Näherung', () => {
    const quell = { ...mix, zutaten: [mehl(1), wasser(1), zutat('Optimal', .01, { ta_rolle: 'sonstiges', ta_naeherung: true })] };
    const r = rezept([mehl(1), zutat('Mischung', 1)]);
    const [aufgeloest] = aufgeloesteRezepte([r], rezeptZutaten([quell, r], alt));
    expect(taErgebnis(aufgeloest).status).toBe('näherung');
    expect(taLabel(aufgeloest)).toContain('≈');
  });
  it('berechnet ohne Backverlust aus der aktuellen Rohmischung und überschreibt keine gespeicherten Daten', () => {
    const before = JSON.stringify([mix, alt]);
    const d = findNaehrwerte('Mischung', rezeptZutaten([{ ...mix, backverlust_pct: 40, backverlust_status: 'gemessen' }], alt));
    expect(d.kcal).toBeCloseTo(findNaehrwerte('Weizenmehl 550').kcal / 2);
    expect(d.allergene).toEqual(['Aa']);
    expect(JSON.stringify([mix, alt])).toBe(before);
    const changed = findNaehrwerte('Mischung', rezeptZutaten([{ ...mix, zutaten: [mehl(1), wasser(3)] }], alt));
    expect(changed.kcal).toBeCloseTo(d.kcal / 2);
  });
  it('löst verschachtelte Mischungen auf', () => {
    const ur = rezept([zutat('Mischung', 1), wasser(1)], { id: 'ur', name: 'Urstück' });
    const r = rezept([zutat('Urstückteig', 1)]);
    const d = findNaehrwerte('Urstückteig', rezeptZutaten([r, ur, mix], alt));
    expect(d.kcal).toBeCloseTo(findNaehrwerte('Weizenmehl 550').kcal / 4);
  });
  it('fehlende Quellrezepte und Zyklen liefern keine alten Seed-Werte', () => {
    expect(findNaehrwerte('Mischung', rezeptZutaten([], alt)).datenstatus).toBe('ungeprueft');
    const cycle = { ...mix, zutaten: [zutat('Urstückteig', 1)] };
    const ur = rezept([zutat('Brotmischung', 1)], { id: 'ur', name: 'Urstück' });
    const result = rezeptZutaten([cycle, ur], alt);
    expect(findNaehrwerte('Mischung', result).datenstatus).toBe('ungeprueft');
    expect(getRezeptAllergenStatus(rezept([zutat('Mischung', 1)]), result).vollstaendig).toBe(false);
  });
});
