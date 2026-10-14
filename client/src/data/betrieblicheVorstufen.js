import { ZUTAT_NAEHRWERTE } from './naehrwerte.js';
import { NAEHRWERT_FELDER } from '../lib/calc/naehrwertFelder.js';

// Marten, 14.10.2026: Die Rezeptmenge ist das gekochte Gesamtgewicht.
// Ansatz 1 kg Körner + ca. 2,5 l Wasser; 3,5 kg sind eine rechnerische
// Sollausbeute, keine Messung nach dem Kochen. Verdunstung bleibt eine Schätzung.
export const ROGGEN_KOCHSTUECK = {
  trocken_kg: 1, wasser_kg: 2.5, gesamt_kg: 3.5,
  ta_pro_kg: { mehl_kg: 1 / 3.5, fluessigkeit_kg: 2.5 / 3.5 },
  hinweis: 'Gekochte Roggenkörner: Schätzung aus 1 kg Körnern + ca. 2,5 l Wasser (rechnerisch 3,5 kg). Tatsächliches Kochgewicht und Verdunstung nicht gemessen.',
};
export const ROGGEN_KOCHNAMEN = ['Roggenkörner (gekocht)', 'Roggenkörner (Katenbrot)', 'Roggenkörner(Mehrkornbrot)'];
export const istGekochterRoggen = name => /^roggenkörner\s*\((gekocht|katenbrot|mehrkornbrot)\)$/i.test(String(name).trim());
const roh = ZUTAT_NAEHRWERTE['roggenkörner'];
export const ROGGEN_KOCHPROFIL = {
  ...Object.fromEntries(NAEHRWERT_FELDER.map(k => [k, roh[k] == null ? null : roh[k] / ROGGEN_KOCHSTUECK.gesamt_kg])),
  allergene: ['Ab'], a: ['Ab'], allergene_geprueft: true, datenstatus: 'referenzwert',
  quelle: `${roh.quelle}; betrieblicher Ansatz Marten 14.10.2026. ${ROGGEN_KOCHSTUECK.hinweis}`,
  quelle_url: roh.quelle_url, naehrwert_hinweis: ROGGEN_KOCHSTUECK.hinweis,
  zutaten_lmiv: 'Wasser; <b>Roggenkörner</b>',
};
