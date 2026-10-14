import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import SortimentsKalkulationModal from './SortimentsKalkulationModal.jsx';
import { ConfirmProvider } from '../../components/ConfirmDialog.jsx';
import { rezept, mehl } from '../../../test/fach-fixtures.js';
import { preisBasis, produktSchluessel } from '../../lib/sortimentskalkulation.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
afterEach(() => { if (root) act(() => root.unmount()); document.body.innerHTML = ''; });
const parameter = { schwundPct:0,personalPct:40,energiePct:5,gemeinkostenPct:15,gewinnPct:10,ustPct:7 };
function render(r, saved = {}) {
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const onSave = vi.fn().mockResolvedValue(false);
  act(() => root.render(<ConfirmProvider><SortimentsKalkulationModal recipes={[r]} prices={{'Weizenmehl 550':{preis_kg:1}}} settings={{kalkulation:parameter,sortimentskalkulation:saved}} onSave={onSave} onClose={() => {}} /></ConfirmProvider>));
  const input = label => [...host.querySelectorAll('input')].find(n => n.getAttribute('aria-label') === label);
  const button = label => [...host.querySelectorAll('button')].find(n => n.textContent.trim() === label);
  const change = (label,value) => act(() => Simulate.change(input(label),{target:{value}}));
  return {host,input,button,change,onSave};
}
it('bindet einen Altentwurf erst nach Bestätigung und speichert die Arbeitszeit ohne Doppelansatz', async () => {
  const r = rezept([mehl(1)]), key=produktSchluessel(r,r.name);
  const ui=render(r,{schemaVersion:1,produkte:{[key]:{alterPreis:'2',neuerPreis:'3'}}});
  expect(ui.input('Neuer Preis: Testbrot').disabled).toBe(true);
  act(() => ui.button('Bezug bestätigen').click());
  expect(ui.input('Neuer Preis: Testbrot').disabled).toBe(false);
  ui.change('Personalkosten pro Stunde','30'); ui.change('Arbeitsminuten: Testbrot','6');
  expect(ui.host.querySelector('td[data-label="Vorschlag brutto"]').textContent).toBe('6,15 €');
  expect(ui.host.querySelector('td[data-label="Rohstoffe netto"]').textContent).toBe('1,00 €');
  await act(async () => ui.button('Entwurf speichern').click());
  expect(ui.onSave).toHaveBeenCalledWith(expect.objectContaining({sortimentskalkulation:expect.objectContaining({schemaVersion:2,stundensatz:'30',produkte:{[key]:expect.objectContaining({basis:preisBasis(r,r.name),arbeitsminuten:'6'})}})}));
});
it('leert bei geändertem Kuchenstückbezug alte Preise und Arbeitsminuten gemeinsam', () => {
  const r=rezept([mehl(3)],{berechnung:'blech',blech_breite_cm:50,blech_laenge_cm:80}),key=produktSchluessel(r,r.name);
  const ui=render(r,{stundensatz:'30',produkte:{[key]:{portionen:'12',alterPreis:'2',neuerPreis:'3',arbeitsminuten:'1',basis:preisBasis(r,r.name,'12')}}});
  ui.change('Stücke pro Blech: Testbrot','16');
  for(const label of ['Bisheriger Preis: Testbrot','Neuer Preis: Testbrot','Arbeitsminuten: Testbrot']) expect(ui.input(label).value).toBe('');
  expect(ui.host.textContent).toContain('1/16 Blech');
});
it('bietet bei fehlendem Gewicht keinen übernehmbaren Preis an', () => {
  const ui=render(rezept([mehl(1)],{stueckgewicht_g:undefined}));
  expect(ui.button('Sichtbare Vorschläge übernehmen').disabled).toBe(true);
  expect(ui.host.textContent).toContain('Teiggewicht pro Stück fehlt');
  expect(ui.host.querySelector('td[data-label="Vorschlag brutto"]').textContent).toBe('—');
});
it('blockiert ungültige Stundenkosten und erhält die Linkquellen der regionalen Beispiele', () => {
  const ui=render(rezept([mehl(1)]));
  ui.change('Personalkosten pro Stunde','-1');
  expect(ui.button('Entwurf speichern').disabled).toBe(true);
  expect(ui.host.querySelectorAll('a[href^="https://backerei-konditorei-hesse.myshopify.com/"]').length).toBeGreaterThan(0);
  expect(ui.host.textContent).toContain('kein Einzelstückvergleich');
});
