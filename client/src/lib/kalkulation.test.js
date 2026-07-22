import { describe, it, expect } from 'vitest';
import { KALKULATION_DEFAULTS, kalkuliereVk, rundeAuf5Cent } from './kalkulation.js';

describe('kalkuliereVk (Zielquoten-Kalkulation)', () => {
  it('Branchen-Defaults: Materialanteil 27 %, Faktor ≈ 4 auf Rohstoffe', () => {
    const k = kalkuliereVk(0.612);
    // 0,612 × 1,08 = 0,66096; / 0,27 = 2,448; × 1,07 = 2,6194
    expect(k.materialPct).toBe(27);
    expect(k.rkEff).toBeCloseTo(0.66096, 5);
    expect(k.netto).toBeCloseTo(2.448, 3);
    expect(k.brutto).toBeCloseTo(2.6194, 3);
    expect(k.empfohlen).toBeCloseTo(2.65, 10);
    expect(k.faktor).toBeCloseTo(4.0, 1);
  });

  it('eigene Quoten überschreiben Defaults', () => {
    const k = kalkuliereVk(1, { schwundPct: 0, personalPct: 40, energiePct: 5, gemeinkostenPct: 15, gewinnPct: 10, ustPct: 7 });
    expect(k.materialPct).toBe(30);
    expect(k.netto).toBeCloseTo(1 / 0.3, 10);
  });

  it('unsinnige Quoten (Materialanteil < 5 %) und Rohstoffe 0 → null', () => {
    expect(kalkuliereVk(1, { personalPct: 60, gemeinkostenPct: 30 })).toBeNull();
    expect(kalkuliereVk(0)).toBeNull();
  });

  it('rundeAuf5Cent rundet immer auf, exakte 5-Cent-Werte bleiben', () => {
    expect(rundeAuf5Cent(2.6194)).toBeCloseTo(2.65, 10);
    expect(rundeAuf5Cent(2.61)).toBeCloseTo(2.65, 10);
    expect(rundeAuf5Cent(2.65)).toBeCloseTo(2.65, 10);
    expect(rundeAuf5Cent(0.41)).toBeCloseTo(0.45, 10);
  });

  it('Defaults bleiben konsistent (Summe der Quoten lässt 27 % Material)', () => {
    const { personalPct, energiePct, gemeinkostenPct, gewinnPct } = KALKULATION_DEFAULTS;
    expect(100 - personalPct - energiePct - gemeinkostenPct - gewinnPct).toBe(27);
  });
});
