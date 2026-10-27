import { describe, expect, it } from 'vitest';
import { berechneBaker, teigZusammenfassung } from './bakerBerechnung.js';
import { skaliereMitBezug } from './prozentSkalierung.js';
import { skaliereMultiProdukt } from './multiprodukt.js';
import { produktRezept } from './produktion.js';
import { generateBonBytes } from '../print/escpos.js';
import { validateRecipe } from '../../../../shared/validation.js';
import { mehl, rezept, wasser, zutat } from '../../../test/fach-fixtures.js';

const sum = xs => xs.reduce((s, n) => s + n, 0);
// Vereinfachter Grundteig; Gewichte und feste Zugaben entsprechen den
// betroffenen Pressen. Die Zutatenverhältnisse sind keine Produktionsrezeptur.
const ciabatta = () => rezept([
  mehl(1), wasser(.8),
  zutat('Oliven', 0, { menge_pro_presse: 1, fuer_produkte: ['Olive'], bemerkung: 'Früchte' }),
  zutat('Tomatenflocken', 0, { menge_pro_presse: .5, fuer_produkte: ['Tomate'], bemerkung: 'Früchte' }),
  zutat('Kuvertüre', 0, { menge_pro_presse: 1, fuer_produkte: ['Schoko'], bemerkung: 'Früchte' }),
], { produkte: [
  { name: 'Natur', gewicht_g: 5200, stueck_pro_presse: 1 },
  ...[['Olive', 5000], ['Tomate', 4800], ['Schoko', 5200]].map(([name, gewicht_g]) =>
    ({ name, gewicht_g, stueck_pro_presse: 1, gewicht_bezug: 'basisteig' })),
] });

describe('Grundteiggewicht zuzüglich variantenspezifischer Zutaten', () => {
  it.each([['Olive', 5, 1, 2], ['Tomate', 4.8, .5, 3], ['Schoko', 5.2, 1, 4]])(
    '%s erhält die volle Grundteigmenge und seine feste Zugabe', (name, grund, zugabe, idx) => {
      const r = ciabatta(), sk = skaliereMultiProdukt(r, { [name]: 1 });
      expect(sk[0] + sk[1]).toBeCloseTo(grund, 12);
      expect(sk[idx]).toBe(zugabe);
      expect(sum(sk)).toBeCloseTo(grund + zugabe, 12);
      expect(teigZusammenfassung(r, sk, sum(sk))).toMatchObject({ teigKg: expect.closeTo(grund, 12), gruppen: { [r.zutaten[idx].name]: zugabe } });
    });

  it('addiert Natur, Olive und Tomate auch bei halben Pressen und Teiler', () => {
    const r = ciabatta(), map = { Natur: 1, Olive: 2, Tomate: .5 };
    const res = berechneBaker(r, { produktStueck: map, faktor: .5 });
    expect(res.fehler).toBeUndefined();
    expect(res.sk[0] + res.sk[1]).toBeCloseTo(8.8, 12);
    expect(res.sk[2]).toBe(1);
    expect(res.sk[3]).toBe(.125);
    expect(res.teigGesamtKg).toBeCloseTo(9.925, 12);
    const einzeln = Object.entries(map).map(([name, n]) => skaliereMultiProdukt(r, { [name]: n }));
    res.sk.forEach((kg, i) => expect(kg).toBeCloseTo(sum(einzeln.map(xs => xs[i])) * .5, 12));
  });

  it('erhält Mengen und Schlüsselzahl auch für eine einzeln aufbereitete Variante', () => {
    const r = ciabatta(), p = produktRezept(r, 'Olive');
    expect(sum(p.zutaten.map(z => z.menge_kg))).toBeCloseTo(6, 12);
    const erneut = produktRezept(p, 'Olive');
    erneut.zutaten.forEach((z, i) => expect(z.menge_kg).toBeCloseTo(p.zutaten[i].menge_kg, 12));
    const einzel = { ...r, produkte: [r.produkte[1]] };
    const res = berechneBaker(einzel, { stueck: 1 });
    expect(res.schluesselzahl).toBeCloseTo(5 / 1.8, 12);
    expect(res.sk).toEqual(skaliereMultiProdukt(r, { Olive: 1 }));
  });

  it('druckt das Schüttwasser für 5 kg Grundteig bei einer Olivenpresse', () => {
    const r = ciabatta(), sk = skaliereMultiProdukt(r, { Olive: 1 });
    const bon = String.fromCharCode(...generateBonBytes(r, sk, '1 Olive', ''));
    // Der Hauptteig-Bon druckt die frischen Zutaten; Mehl wird separat verwogen.
    expect(bon).toContain('2,222');
    expect(bon).not.toContain('1,778');
  });

  it('bezieht ausdrücklich hinterlegte Basisteigprozente auf den vollen Grundteig', () => {
    const r = rezept([mehl(1), wasser(.8), zutat('Quellstück', 0, {
      zusatz_prozent: 22.22, prozent_bezug: 'basisteig', fuer_produkte: ['Körner'],
    })], { produkte: [{ name: 'Körner', gewicht_g: 5400, gewicht_bezug: 'basisteig' }] });
    const sk = skaliereMitBezug(r, { zielKg: 5.4, produktName: 'Körner' });
    expect(sk[0] + sk[1]).toBeCloseTo(5.4, 12);
    expect(sk[2]).toBeCloseTo(1.19988, 12);
  });

  it('erhält ausdrücklich hinterlegte Produktprozente und gemeinsame Bäckerprozente', () => {
    const r = rezept([mehl(10), wasser(6), zutat('Salz', 0, { zusatz_prozent: 2 }),
      zutat('Rosinen', 0, { zusatz_prozent: 20, prozent_bezug: 'endprodukt', fuer_produkte: ['Rosine'] }),
    ], { produkte: [{ name: 'Rosine', gewicht_g: 16200, gewicht_bezug: 'basisteig' }] });
    const sk = skaliereMitBezug(r, { zielKg: 16.2, produktName: 'Rosine' });
    [10, 6, .2, 4.05].forEach((kg, i) => expect(sk[i]).toBeCloseTo(kg, 12));
  });

  it('lässt Produkte mit bisherigem Gesamtgewichtsbezug unverändert', () => {
    const r = ciabatta();
    r.produkte = r.produkte.map(p => ({ ...p, gewicht_bezug: 'endprodukt' }));
    const sk = skaliereMultiProdukt(r, { Olive: 1 });
    expect(sk[0] + sk[1]).toBeCloseTo(4, 12);
    expect(sum(sk)).toBeCloseTo(5, 12);
  });

  it('weist fehlenden Grundteig und ungültige Gewichtsbezüge zurück', () => {
    const r = ciabatta();
    r.zutaten = r.zutaten.slice(2);
    expect(berechneBaker(r, { produktStueck: { Olive: 1 } }).fehler).toContain('Grundteig');
    expect(validateRecipe(ciabatta())).toEqual([]);
    r.produkte[1].gewicht_bezug = 'unbekannt';
    expect(validateRecipe(r).join()).toContain('Gewichtsbezug');
  });
});
