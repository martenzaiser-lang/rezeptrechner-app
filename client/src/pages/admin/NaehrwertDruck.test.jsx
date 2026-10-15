import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import NaehrwertDruck from './NaehrwertDruck.jsx';
import { findNaehrwerte } from '../../lib/calc/naehrwerteLookup.js';
import { rezept, mehl, wasser, zutat } from '../../../test/fach-fixtures.js';
import { produktRezept } from '../../lib/calc/produktion.js';
import PrintSheet from '../baker/PrintSheet.jsx';

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

it('druckt den vollständigen Sortennamen und setzt den Malzhinweis nur an die passende Variante', () => {
  const r=rezept([mehl(1),wasser(.6),zutat('Optimal',.02,{fuer_produkte:['mit Körnern']})],{name:'Joghurt-Dinkel',produkte:[{name:'mit Körnern',gewicht_g:1000},{name:'ohne Körner',gewicht_g:1000}],backverlust_pct:10,backverlust_status:'geschaetzt'});
  const host=document.createElement('div'); document.body.append(host); root=createRoot(host);
  const mit=produktRezept(produktRezept(r,'mit Körnern'),'mit Körnern');
  act(()=>root.render(<NaehrwertDruck rezept={mit} />));
  expect(host.querySelector('button').disabled).toBe(false);
  const sheet=document.querySelector('#nutrition-print-sheet');
  expect(sheet.querySelector('h1').textContent).toBe('Joghurt-Dinkel – mit Körnern');
  expect([...sheet.querySelectorAll('th')].find(t=>t.textContent.startsWith('davon Zucker')).textContent).toBe('davon Zucker*');
  expect(sheet.querySelector('.nutrition-footnote').textContent).toBe('* Enthält auch Zucker aus Getreidemalz.');
  expect(sheet.textContent).not.toMatch(/Schätzung|geschätzt|Vergleich|Backverlust/);
  act(()=>root.render(<NaehrwertDruck rezept={produktRezept(r,'ohne Körner')} />));
  expect(sheet.querySelector('h1').textContent).toBe('Joghurt-Dinkel – ohne Körner');
  expect(sheet.querySelector('sup')).toBeNull();
  expect(sheet.querySelector('.nutrition-footnote')).toBeNull();
});

it('erhält vollständige Namen auch auf dem A4-Rezeptblatt', () => {
  const host=document.createElement('div'); document.body.append(host); root=createRoot(host);
  const r=produktRezept(rezept([mehl(1)],{name:'Joghurt-Dinkel',produkte:[{name:'mit Körnern',gewicht_g:1000}]}),'mit Körnern');
  act(()=>root.render(<PrintSheet rezept={r} sk={[1]} teigGesamtKg={1} mengeInfo="1 Stück" />));
  expect(host.querySelector('h1').textContent).toBe('Joghurt-Dinkel – mit Körnern');
});
