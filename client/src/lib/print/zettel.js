// Kochstueck-/Sauerteig-Zettel: aggregiert die heute gespeicherten
// Baker-Eingaben (mind. 5 Stueck) — 1:1 aus der alten App
// (showKochzettel Z. 3218, showSauerteigzettel Z. 3334,
// printZettelBon Z. 3436).

import { skaliere } from '../calc/skalierung.js';
import { skaliereMultiProdukt } from '../calc/multiprodukt.js';
import { ESCPOS, textToBytes, padBonLine16 } from './escpos.js';

const MIN_STUECK = 5;

function skaliereEingabe(r, eingabe) {
  let sk;
  if (eingabe.multi && r.produkte && r.produkte.length > 1) {
    sk = skaliereMultiProdukt(r, eingabe.produktStueck || {});
  } else {
    sk = skaliere(r, eingabe.stueck || 1);
  }
  const faktor = eingabe.faktor || 1;
  if (faktor !== 1) sk = sk.map((v) => +(v * faktor).toFixed(3));
  return sk;
}

function heutigeRezepte(rezepte, eingaben, heute, hatRelevanteZutat) {
  return Object.entries(eingaben)
    .filter(([id, e]) => {
      if (e.datum !== heute) return false;
      const stueckzahl = e.multi
        ? Object.values(e.produktStueck || {}).reduce((a, b) => a + b, 0)
        : (e.stueck || 0);
      if (stueckzahl < MIN_STUECK) return false;
      const r = rezepte.find((x) => x.id === id);
      return r ? hatRelevanteZutat(r) : false;
    })
    .map(([id]) => rezepte.find((r) => r.id === id))
    .filter(Boolean);
}

// Kochstueck-Zettel: NUR Kochstueck-Zutaten (nicht Quell-/Bruehstueck)
export function berechneKochzettel(rezepte, eingaben, heute) {
  const KEYS = ['kochstück', 'koch'];
  const markiert = heutigeRezepte(rezepte, eingaben, heute, (r) =>
    r.zutaten.some((z) => z.bemerkung && KEYS.some((k) => z.bemerkung.toLowerCase().includes(k)))
  );
  if (!markiert.length) return null;

  const rezeptDaten = [];
  let gesamtKg = 0;
  markiert.forEach((r) => {
    const sk = skaliereEingabe(r, eingaben[r.id]);
    const zutaten = [];
    let wasserKg = 0;
    r.zutaten.forEach((z, idx) => {
      if (!z.bemerkung || !KEYS.some((k) => z.bemerkung.toLowerCase().includes(k))) return;
      const kg = sk[idx] || 0;
      if (z.ist_wasser) wasserKg += kg;
      else zutaten.push({ name: z.name, kg });
      gesamtKg += kg;
    });
    if (zutaten.length > 0 || wasserKg > 0) {
      rezeptDaten.push({ name: r.name, zutaten, wasser: wasserKg });
    }
  });
  return { typ: 'koerner', data: rezeptDaten, gesamt: gesamtKg };
}

// Sauerteig-Zettel: Rezepte die Sauerteig VERWENDEN (Zutat-NAME enthaelt
// "sauerteig"), nicht solche die ihn herstellen (nur Bemerkung).
export function berechneSauerteigzettel(rezepte, eingaben, heute) {
  const markiert = heutigeRezepte(rezepte, eingaben, heute, (r) =>
    r.zutaten.some((z) => z.name.toLowerCase().includes('sauerteig'))
  );
  if (!markiert.length) return null;

  const rezeptDaten = [];
  let gesamtKg = 0;
  markiert.forEach((r) => {
    const sk = skaliereEingabe(r, eingaben[r.id]);
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
  return { typ: 'sauerteig', data: rezeptDaten, gesamt: gesamtKg };
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
