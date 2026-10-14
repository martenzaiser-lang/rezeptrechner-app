import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import NaehrwertDruck from './NaehrwertDruck.jsx';
import { findNaehrwerte } from '../../lib/calc/naehrwerteLookup.js';
import { rezept, mehl, wasser } from '../../../test/fach-fixtures.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
afterEach(() => {
  if (root) act(() => root.unmount());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

it.each([
  ['geschaetzt', 10, 'pro 100 g fertiges Produkt'],
  ['gemessen', 10, 'pro 100 g fertiges Produkt'],
  ['unbestaetigt', 10, 'pro 100 g ungebackene Rezeptur'],
  [undefined, undefined, 'pro 100 g ungebackene Rezeptur'],
])('druckt den korrekten Gewichtsbezug ohne interne Hinweise (%s)', (status, verlust, bezug) => {
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const r = rezept([mehl(1), wasser(1)], { backverlust_status: status, backverlust_pct: verlust, naehrwert_hinweis: 'Menge geschätzt' });
  const zutaten = [{ name: 'Weizenmehl 550', data: { ...findNaehrwerte('Weizenmehl 550'), referenz_artikel: 'Vergleichsprodukt' } }];
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  act(() => root.render(<NaehrwertDruck rezept={r} customZutaten={zutaten} />));
  const button = host.querySelector('button');
  expect(button.disabled).toBe(false);
  expect(button.title).toContain('Vergleichsprodukt');
  const sheet = document.querySelector('#nutrition-print-sheet');
  expect(sheet.textContent).toContain(bezug);
  expect(sheet.textContent).not.toMatch(/Schätzung|geschätzt|Vergleich|Backverlust/);
  expect(sheet.textContent).toContain('Energie');
  act(() => button.click());
  expect(print).toHaveBeenCalledOnce();
  expect(document.body.dataset.printMode).toBe('nutrition');
  window.dispatchEvent(new Event('afterprint'));
  expect(document.body.dataset.printMode).toBeUndefined();
});
