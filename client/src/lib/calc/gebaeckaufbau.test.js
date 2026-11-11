import { describe, it, expect } from 'vitest';
import { gebaeckAllergene, gebaeckKatalog, gebaeckeFuerRezept } from './gebaeckaufbau.js';
import { validateGebaeckaufbauten } from '../../../../shared/gebaeckaufbau.js';
import { makeBackup, validateBackup } from '../../../../shared/backup.js';
import { rezept, mehl, zutat } from '../../../test/fach-fixtures.js';

const grund = () => rezept([mehl(1)], { id: 'boden', name: 'Testboden' });
const raw = (name, allergene, extra = {}) => ({ name, data: { allergene, allergene_geprueft: true, zusammengesetzt: false, zutaten_geprueft: true, ...extra } });
const gebaeck = (bestandteile = [{ typ: 'rezept', rezeptId: 'boden' }, { typ: 'zutat', zutat: 'Testcreme' }]) => ({ id: 'test-gebaeck', name: 'Testgebäck', bestandteile });
const katalog = p => ({ schemaVersion: 1, produkte: [p] });

describe('Gebäckaufbau: Allergene ohne Änderung der Rezeptdaten', () => {
  it('verbindet Grundrezept und Rohstoff; Mengenhinweise beeinflussen keine Werte', () => {
    const recipes = [grund()], ingredients = [raw('Testcreme', ['G'], { spuren: ['K', 'G', 'A', 'H'] })];
    const p = gebaeck(); p.bestandteile[0].mengeHinweis = 'Menge fehlt';
    const original = structuredClone({ recipes, ingredients, p });
    const result = gebaeckAllergene(p, recipes, ingredients);
    expect(result.vollstaendig).toBe(true);
    expect(result.codes).toEqual(['Aa', 'G']);
    expect(result.traceCodes).toEqual(['A', 'H', 'K']);
    expect({ recipes, ingredients, p }).toEqual(original);
    ingredients[0].data.allergene = ['K'];
    expect(gebaeckAllergene(p, recipes, ingredients).codes).toEqual(['Aa', 'K']);
    recipes[0].zutaten.push(zutat('Milch', .2));
    expect(gebaeckAllergene(p, recipes, ingredients).codes).toContain('G');
  });

  it('wertet nur die explizite Produktvariante aus und erkennt entfernte Varianten', () => {
    const r = rezept([mehl(1), zutat('Sesam', .1, { fuer_produkte: ['Saaten'] })], { id: 'boden', produkte: [{ name: 'Natur', gewicht_g: 100 }, { name: 'Saaten', gewicht_g: 100 }] });
    const p = gebaeck([{ typ: 'rezept', rezeptId: 'boden', produktName: 'Natur' }]);
    expect(gebaeckAllergene(p, [r], []).codes).toEqual(['Aa']);
    p.bestandteile[0].produktName = 'Saaten';
    expect(gebaeckAllergene(p, [r], []).codes).toEqual(['Aa', 'K']);
    r.produkte.pop();
    expect(gebaeckAllergene(p, [r], []).vollstaendig).toBe(false);
    delete p.bestandteile[0].produktName;
    expect(gebaeckAllergene(p, [r], []).offen.join(' ')).toContain('Rezeptvariante');
  });

  it.each([
    ['fehlendes Rezept', gebaeck([{ typ: 'rezept', rezeptId: 'weg' }]), [grund()], []],
    ['mehrdeutiges Rezept', gebaeck([{ typ: 'rezept', rezeptId: 'boden' }]), [grund(), grund()], []],
    ['unbekannter Rohstoff', gebaeck([{ typ: 'zutat', zutat: 'Unbekannt_xyz' }]), [], []],
    ['ungeprüfter Rohstoff', gebaeck([{ typ: 'zutat', zutat: 'Testcreme' }]), [], [raw('Testcreme', [], { allergene_geprueft: false })]],
    ['ungeprüfte Zusammensetzung', gebaeck([{ typ: 'zutat', zutat: 'Testcreme' }]), [], [raw('Testcreme', ['G'], { zusammengesetzt: true, zutaten_geprueft: false })]],
    ['leeres Gebäck', gebaeck([]), [], []],
    ['leeres Grundrezept', gebaeck([{ typ: 'rezept', rezeptId: 'boden' }]), [{ ...grund(), zutaten: [] }], []],
  ])('meldet %s als unvollständig', (_name, p, r, z) => {
    const result = gebaeckAllergene(p, r, z);
    expect(result.vollstaendig).toBe(false);
    expect(result.offen.length).toBeGreaterThan(0);
  });

  it('findet Rezeptverwendungen über IDs und übernimmt betriebliche offene Angaben', () => {
    const p = { ...gebaeck(), offen: ['Füllung noch nicht bestätigt'] };
    expect(gebaeckeFuerRezept(katalog(p), 'boden')).toEqual([p]);
    expect(gebaeckeFuerRezept(katalog(p), 'weg')).toEqual([]);
    expect(gebaeckAllergene(p, [grund()], [raw('Testcreme', ['G'])]).vollstaendig).toBe(false);
  });
});

describe('Geschützter Katalog und Sicherungen', () => {
  it('überlebt den vollständigen Backup-Roundtrip', () => {
    const data = makeBackup({ recipes: [grund()], settings: { gebaeckaufbauten: katalog(gebaeck()) }, prices: [], customIngredients: [] });
    const restored = JSON.parse(JSON.stringify(data));
    expect(validateBackup(restored)).toEqual([]);
    expect(gebaeckKatalog(restored.cfg.gebaeckaufbauten).produkte).toEqual([gebaeck()]);
  });
  it.each([
    null,
    { schemaVersion: 2, produkte: [] },
    { schemaVersion: 1, produkte: [gebaeck(), gebaeck()] },
    katalog(gebaeck([{ typ: 'rezept', rezeptId: 'boden', zutat: 'Testcreme' }])),
    katalog(gebaeck([{ typ: 'zutat', zutat: 'Testcreme', produktName: 'Natur' }])),
    katalog({ ...gebaeck(), bestaetigtAm: 2026 }),
    katalog(gebaeck([])),
  ])('weist fehlerhafte Kataloge in API und Import zurück: %j', data => {
    expect(validateGebaeckaufbauten(data).length).toBeGreaterThan(0);
    expect(validateBackup({ rezepte: [], cfg: { gebaeckaufbauten: data } }).length).toBeGreaterThan(0);
    if (data) expect(gebaeckKatalog(data).produkte).toEqual([]);
  });
});
