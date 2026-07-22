// Tests fuer das Verkaufs-Zutatenverzeichnis (lose Ware):
// Backmittel-Aufschluesselung, Lose-Ware-Filter, Duplikat-Erkennung.

import { describe, it, expect } from 'vitest';
import {
  parseLmivKomponenten, verkaufsKomponenten, dedupeKey,
  getRezeptVerkaufsZutaten,
} from './verkaufsZutaten.js';
import { findHersteller } from './naehrwerteLookup.js';

describe('parseLmivKomponenten', () => {
  it('trennt am Top-Level-Semikolon, haelt Klammern zusammen', () => {
    const parts = parseLmivKomponenten(
      'Zucker; Ei-Mischung (<b>VollEI</b>; <b>EIgelb</b>); Salz.'
    );
    expect(parts).toEqual(['Zucker', 'Ei-Mischung (<b>VollEI</b>; <b>EIgelb</b>)', 'Salz']);
  });
});

describe('verkaufsKomponenten — Lose-Ware-Filter', () => {
  it('Classic Baguette: technische Zusatzstoffe raus, echte Zutaten bleiben', () => {
    const m = findHersteller('classic baguette');
    expect(m).toBeTruthy();
    const komp = verkaufsKomponenten(m.zutaten_lmiv);

    // bleiben
    expect(komp).toContain('WEIZENmehl');
    expect(komp).toContain('getrockneter WEIZENvorteig'); // Unterzutaten-Klammer weg
    expect(komp).toContain('Salz');
    expect(komp).toContain('WEIZENkleber');
    expect(komp).toContain('Rapsöl');

    // fallen weg (keine Kenntlichmachungspflicht bei loser Ware)
    const alles = komp.join(' | ');
    expect(alles).not.toMatch(/stabilisator/i);
    expect(alles).not.toMatch(/säureregulator/i);
    expect(alles).not.toMatch(/emulgator/i);
    expect(alles).not.toMatch(/mehlbehandlungsmittel/i);
    expect(alles).not.toMatch(/enzym/i);
    expect(alles).not.toMatch(/E \d{3}/);
  });

  it('Sahnessa Erdbeer: Farbstoff bleibt (kenntlichmachungspflichtig), QUID-Prozente weg', () => {
    const m = findHersteller('sahnessa erdbeer');
    expect(m).toBeTruthy();
    const komp = verkaufsKomponenten(m.zutaten_lmiv);

    expect(komp).toContain('Farbstoff Betenrot');
    expect(komp).toContain('Gelatine');
    expect(komp).toContain('Getrocknete Erdbeerstückchen'); // ohne "(3,1%)"
    const alles = komp.join(' | ');
    expect(alles).not.toMatch(/säuerungsmittel/i);
    expect(alles).not.toMatch(/verdickungsmittel/i);
    expect(alles).not.toMatch(/aroma/i);
    expect(alles).not.toMatch(/%/);
  });

  it('Allergen-Ausnahme: Allergen-Teil wegfallender Klassen bleibt erhalten', () => {
    const komp = verkaufsKomponenten(
      'Emulgator E 471, E 472e, <b>SOJAlecithin</b>; Aroma (enthält <b>MILCH</b>); Enzyme.'
    );
    expect(komp).toEqual(['Emulgator SOJAlecithin', 'Aroma (enthält MILCH)']);
  });

  it('Klammer bleibt, wenn das Allergen nur dort steht (Malzextrakt)', () => {
    const komp = verkaufsKomponenten('Malzextrakt (<b>GERSTENmalz</b>, Wasser); Zucker.');
    expect(komp).toEqual(['Malzextrakt (GERSTENmalz, Wasser)', 'Zucker']);
  });
});

describe('dedupeKey', () => {
  it('normalisiert Schreibweisen und Synonyme', () => {
    expect(dedupeKey('WEIZENmehl')).toBe('weizenmehl');
    expect(dedupeKey('Weizenmehl 550')).toBe('weizenmehl');
    expect(dedupeKey('Speisesalz')).toBe('salz');
    expect(dedupeKey('Jodiertes Speisesalz (Speisesalz; Kaliumjodat)')).toBe('salz');
    expect(dedupeKey('Kakaopulver (8,0%)')).toBe('kakaopulver');
    expect(dedupeKey('Dextrose')).toBe('traubenzucker');
  });
});

describe('getRezeptVerkaufsZutaten — Aufschluesselung ohne Duplikate', () => {
  const rezept = {
    zutaten: [
      { name: 'Weizenmehl 550', menge_kg: 10 },
      { name: 'Wasser', menge_kg: 6 },
      { name: 'Salz', menge_kg: 0.2 },
      { name: 'Classic Baguette', menge_kg: 0.3 },
    ],
  };

  it('loest das Backmittel auf und entfernt Duplikate', () => {
    const liste = getRezeptVerkaufsZutaten(rezept);

    // Markenname verschwindet, Komponenten erscheinen
    expect(liste).not.toContain('Classic Baguette');
    expect(liste).toContain('getrockneter WEIZENvorteig');
    expect(liste).toContain('WEIZENkleber');

    // Rezept-Zutat gewinnt, Backmittel-Doppelung faellt weg
    expect(liste).toContain('Weizenmehl 550');
    expect(liste).not.toContain('WEIZENmehl');
    expect(liste.filter((z) => dedupeKey(z) === 'salz')).toEqual(['Salz']);

    // Reihenfolge: nach Rezept-Anteil absteigend (Backmittel 0,3 kg liegt
    // vor Salz 0,2 kg, seine Komponenten erscheinen an seiner Position)
    expect(liste.slice(0, 2)).toEqual(['Weizenmehl 550', 'Wasser']);

    // keine kompletten Duplikate
    const keys = liste.map(dedupeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('laesst Rezepte ohne Backmittel unveraendert', () => {
    const einfach = {
      zutaten: [
        { name: 'Roggenmehl 1150', menge_kg: 5 },
        { name: 'Wasser', menge_kg: 4 },
        { name: 'Salz', menge_kg: 0.1 },
      ],
    };
    expect(getRezeptVerkaufsZutaten(einfach)).toEqual(['Roggenmehl 1150', 'Wasser', 'Salz']);
  });
});
