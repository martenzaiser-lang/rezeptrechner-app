import { berechneBaker } from '../calc/bakerBerechnung.js';
// Kochstueck-/Sauerteig-Zettel: aggregiert die heute gespeicherten
// Baker-Eingaben (mind. 5 Stueck) — 1:1 aus der alten App
// (showKochzettel Z. 3218, showSauerteigzettel Z. 3334,
// printZettelBon Z. 3436).

import { istGewicht, isFluessigkeit } from '../calc/ta.js';
import { ESCPOS, textToBytes, padBonLine16 } from './escpos.js';

function skaliereEingabe(r, eingabe, fehler) {
  const result = berechneBaker(r, eingabe);
  if (result?.fehler) fehler.push(`${r.name}: ${result.fehler}`);
  return result?.sk || r.zutaten.map(() => 0);
}

function heutigeRezepte(rezepte, eingaben, heute, hatRelevanteZutat) {
  return Object.entries(eingaben)
    .filter(([id, e]) => {
      if (e.datum !== heute) return false;
      const r = rezepte.find((x) => x.id === id);
      if (!r) return false;
      const stueckzahl = r.produkte?.length > 1 && r.berechnung !== 'blech'
        ? (r.produkte || []).reduce((sum, p) => sum + (e.produktStueck?.[p.name] || 0) * (p.stueck_pro_presse > 0 ? p.stueck_pro_presse : 1), 0)
        : (e.stueck || 0);
      if (r.berechnung !== 'blech' && !(stueckzahl * (e.faktor ?? 1) > 0)) return false;
      if (r.berechnung === 'blech' && !(e.blechN > 0)) return false;
      return r ? hatRelevanteZutat(r) : false;
    })
    .map(([id]) => rezepte.find((r) => r.id === id))
    .filter(Boolean);
}

// Kochstueck-Zettel: NUR Kochstueck-Zutaten (nicht Quell-/Bruehstueck)
export function berechneKochzettel(rezepte, eingaben, heute) {
  const KEYS = ['kochstück', 'koch'];
  const markiert = heutigeRezepte(rezepte, eingaben, heute, (r) =>
    r.zutaten.some(z => istGewicht(z) && KEYS.some(k => `${z.bemerkung || ''} ${z.name}`.toLowerCase().includes(k)))
  );
  if (!markiert.length) return null;

  const rezeptDaten = [];
  const fehler = [];
  let gesamtKg = 0;
  markiert.forEach((r) => {
    const sk = skaliereEingabe(r, eingaben[r.id], fehler);
    const zutaten = [];
    let wasserKg = 0;
    r.zutaten.forEach((z, idx) => {
      if (!istGewicht(z) || !KEYS.some(k => `${z.bemerkung || ''} ${z.name}`.toLowerCase().includes(k))) return;
      const kg = sk[idx] || 0;
      if (kg <= 0) return;
      if (isFluessigkeit(z)) wasserKg += kg;
      else zutaten.push({ name: z.name, kg });
      gesamtKg += kg;
    });
    if (zutaten.length > 0 || wasserKg > 0) {
      rezeptDaten.push({ name: r.name, zutaten, wasser: wasserKg });
    }
  });
  return rezeptDaten.length || fehler.length ? { typ: 'koerner', data: rezeptDaten, gesamt: gesamtKg, fehler } : null;
}

// Sauerteig-Zettel: Rezepte die Sauerteig VERWENDEN (Zutat-NAME enthaelt
// "sauerteig"), nicht solche die ihn herstellen (nur Bemerkung).
export function berechneSauerteigzettel(rezepte, eingaben, heute) {
  const markiert = heutigeRezepte(rezepte, eingaben, heute, (r) =>
    r.zutaten.some((z) => z.name.toLowerCase().includes('sauerteig'))
  );
  if (!markiert.length) return null;

  const rezeptDaten = [];
  const fehler = [];
  let gesamtKg = 0;
  markiert.forEach((r) => {
    const sk = skaliereEingabe(r, eingaben[r.id], fehler);
    let sauerKg = 0;
    r.zutaten.forEach((z, idx) => {
      if (!z.name.toLowerCase().includes('sauerteig')) return;
      sauerKg += sk[idx] || 0;
    });
    if (sauerKg > 0) {
      rezeptDaten.push({ name: r.name, kg: sauerKg });
      gesamtKg += sauerKg;
    }
  });
  return rezeptDaten.length || fehler.length ? { typ: 'sauerteig', data: rezeptDaten, gesamt: gesamtKg, fehler } : null;
}

// bonZutatBlock-Kopie (nicht exportiert in escpos.js — hier gleiche Logik)
function bonZutatBlock(bytes, name, mengeStr) {
  const maxOneLine = 16 - mengeStr.length - 1;
  if (name.length <= maxOneLine) {
    bytes.push(...textToBytes(padBonLine16(name, mengeStr) + '\n'));
    return;
  }
  let rest = name;
  while (rest.length > 16) {
    let cut = rest.lastIndexOf(' ', 16);
    if (cut < 6) cut = rest.lastIndexOf('-', 16);
    if (cut < 6) cut = 16;
    bytes.push(...textToBytes(rest.substring(0, cut).trim() + '\n'));
    rest = rest.substring(cut).trim();
  }
  if (rest) bytes.push(...textToBytes(rest + '\n'));
  bytes.push(...textToBytes(mengeStr.padStart(16) + '\n'));
}

// Zettel-Bon-Bytes (printZettelBon Z. 3441-3523)
export function generateZettelBonBytes(zettel, heute) {
  const bytes = [...ESCPOS.INIT, ...ESCPOS.CODEPAGE_858];

  if (zettel.typ === 'koerner') {
    bytes.push(...ESCPOS.ALIGN_CENTER, ...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_SIZE);
    bytes.push(...textToBytes('KOCHSTUECK\n'));
    bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
    bytes.push(...ESCPOS.DOUBLE_HEIGHT);
    bytes.push(...textToBytes(heute + '\n'));
    bytes.push(...ESCPOS.NORMAL);
    bytes.push(...textToBytes('================================\n'));
    bytes.push(...ESCPOS.ALIGN_LEFT);

    zettel.data.forEach((rd) => {
      bytes.push(...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_HEIGHT);
      bytes.push(...textToBytes('\n>> ' + rd.name.toUpperCase() + '\n'));
      bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
      bytes.push(...textToBytes('--------------------------------\n'));
      bytes.push(...ESCPOS.DOUBLE_SIZE);
      rd.zutaten.forEach((z) => {
        bonZutatBlock(bytes, z.name, Math.round(z.kg * 1000) + ' g');
      });
      bytes.push(...ESCPOS.NORMAL);
      if (rd.wasser > 0) {
        bytes.push(...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_SIZE);
        bonZutatBlock(bytes, '+ WASSER', Math.round(rd.wasser * 1000) + ' g');
        bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
      }
    });

    if (zettel.gesamt > 0) {
      bytes.push(...textToBytes('\n================================\n'));
      bytes.push(...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_SIZE);
      bytes.push(...textToBytes(padBonLine16('GESAMT', Math.round(zettel.gesamt * 1000) + ' g') + '\n'));
      bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
    }
    bytes.push(...textToBytes('\nNach Abkuehlen netto wiegen.\nWasser bis Sollgewicht ergaenzen.\nAusgleich nicht doppelt rechnen.\n'));
  } else if (zettel.typ === 'sauerteig') {
    bytes.push(...ESCPOS.ALIGN_CENTER, ...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_SIZE);
    bytes.push(...textToBytes('SAUERTEIG\n'));
    bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
    bytes.push(...ESCPOS.DOUBLE_HEIGHT);
    bytes.push(...textToBytes(heute + '\n'));
    bytes.push(...ESCPOS.NORMAL);
    bytes.push(...textToBytes('================================\n'));
    bytes.push(...ESCPOS.ALIGN_LEFT);
    bytes.push(...textToBytes('\n'));
    bytes.push(...ESCPOS.DOUBLE_SIZE);
    zettel.data.forEach((rd) => {
      bonZutatBlock(bytes, rd.name, Math.round(rd.kg * 1000) + ' g');
    });
    bytes.push(...ESCPOS.NORMAL);
    if (zettel.gesamt > 0) {
      bytes.push(...textToBytes('\n================================\n'));
      bytes.push(...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_SIZE);
      bytes.push(...textToBytes(padBonLine16('GESAMT', Math.round(zettel.gesamt * 1000) + ' g') + '\n'));
      bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
    }
  }

  bytes.push(...ESCPOS.FEED, ...ESCPOS.CUT);
  return bytes;
}
