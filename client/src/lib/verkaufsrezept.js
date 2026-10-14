import { REZEPT_ZUTAT_QUELLEN } from './calc/rezeptZutaten.js';

const interneNamen = new Set(Object.values(REZEPT_ZUTAT_QUELLEN).map(n => n.toLowerCase()));
export function istVerkaufsrezept(r) {
  if (typeof r.verkaufsartikel === 'boolean') return r.verkaufsartikel;
  return r.rezeptart !== 'mischung' && !interneNamen.has(String(r.name || '').trim().toLowerCase());
}
