import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import ZutatEditorModal from './ZutatEditorModal.jsx';
import { rezept, zutat } from '../../../test/fach-fixtures.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
afterEach(() => { if(root)act(()=>root.unmount());document.body.innerHTML=''; });
it.each(['endprodukt','basisteig','mehl'])('erhält beim Bearbeiten einer Prozentzugabe den Bezug %s', prozent_bezug => {
  const host=document.createElement('div');document.body.append(host);root=createRoot(host);
  const z=zutat('Leinsaat',0,{zusatz_prozent:2.3,prozent_bezug,ta_rolle:'sonstiges',fuer_produkte:['Körnerbrot']});
  const onSave=vi.fn();
  act(()=>root.render(<ZutatEditorModal zutat={z} rezept={rezept([z],{produkte:[{name:'Körnerbrot',gewicht_g:850},{name:'Katenbrot',gewicht_g:850}]})} vorschlaege={[]} onSave={onSave} onClose={()=>{}} />));
  expect(host.querySelector('[aria-label="Prozentbezug"]').value).toBe(prozent_bezug);
  act(()=>[...host.querySelectorAll('button')].find(n=>n.textContent==='Speichern').click());
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({prozent_bezug,zusatz_prozent:2.3,menge_kg:0}));
});
