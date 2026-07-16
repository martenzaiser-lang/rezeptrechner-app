// ESC/POS-Bon-Erzeugung (58mm Thermodrucker, 32 Zeichen NORMAL /
// 16 Zeichen DOUBLE_SIZE) — 1:1 portiert aus der alten App
// (index.html Z. 6598-6672, 6984-7248, 7336-7452).
//
// Reine Byte-Erzeugung OHNE Bluetooth — dadurch unit-testbar
// (Web Bluetooth ist in Playwright nicht testbar). Transport: bluetooth.js.

import { ta } from '../calc/ta.js';
import { getRezeptAllergene, berechneNaehrwerte } from '../calc/naehrwerteLookup.js';
import { ALLERGEN_NAMEN } from '../../data/allergene.js';

export const ESC = 0x1b;
export const GS = 0x1d;
export const ESCPOS = {
  INIT: [ESC, 0x40],
  CODEPAGE_858: [ESC, 0x74, 0x13],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  DOUBLE_WIDTH: [ESC, 0x21, 0x20],
  DOUBLE_SIZE: [ESC, 0x21, 0x30],
  NORMAL: [ESC, 0x21, 0x00],
  CUT: [GS, 0x56, 0x00],
  FEED: [ESC, 0x64, 0x03],
};

// Codepage 858: Umlaute
const CP858 = { 'ä': 0x84, 'ö': 0x94, 'ü': 0x81, 'Ä': 0x8e, 'Ö': 0x99, 'Ü': 0x9a, 'ß': 0xe1, '€': 0xd5 };

export function textToBytes(text) {
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (CP858[c]) bytes.push(CP858[c]);
    else if (c.charCodeAt(0) < 128) bytes.push(c.charCodeAt(0));
    else bytes.push(0x3f);
  }
  return bytes;
}

export function formatNumber(n, decimals = 3) {
  return n.toFixed(decimals).replace('.', ',');
}

export function bonTruncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  let cut = text.lastIndexOf(' ', maxLen - 1);
  if (cut < maxLen * 0.5) cut = text.lastIndexOf('-', maxLen - 1);
  if (cut < maxLen * 0.5) cut = maxLen;
  return text.substring(0, cut).trim();
}

export function padBonLine(left, right) {
  const maxWidth = 32;
  const maxLeft = maxWidth - right.length - 1;
  if (left.length > maxLeft) left = left.substring(0, maxLeft);
  const spaces = maxWidth - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

export function padBonLine16(left, right) {
  const maxWidth = 16;
  const maxLeft = maxWidth - right.length - 1;
  if (left.length > maxLeft) left = left.substring(0, maxLeft);
  const spaces = maxWidth - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

// Zutat im DOUBLE_SIZE-Layout (16 Zeichen)
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

// Bon-Konfiguration (global aus localStorage + rezept.bonOptionen)
export function getBonConfig(rezept) {
  let global = {};
  try {
    global = JSON.parse(localStorage.getItem('rz_bon_config') || '{}');
  } catch {}
  const defaults = {
    header: global.header !== false,
    rezeptname: global.rezeptname !== false,
    datum: global.datum !== false,
    stueckzahl: global.stueckzahl !== false,
    schuettwasser: global.schuettwasser !== false,
    gesamtgewicht: global.gesamtgewicht !== false,
    ta: global.ta !== false,
    allergene: global.allergene === true,
    naehrwerte: global.naehrwerte === true,
    kommentare: global.kommentare === true,
    bonQuellstueck: true,
    bonBruehstueck: true,
    bonKochstueck: true,
    bonSauerteig: true,
  };
  if (rezept && rezept.bonOptionen) {
    return { ...defaults, ...rezept.bonOptionen };
  }
  return defaults;
}

// --- Frische Zutaten (morgens abwiegen): Filterlogik 1:1 (Z. 7014-7066) ---

const FLUESSIG_KEYWORDS = ['wasser', 'milch', 'sahne', 'buttermilch', 'joghurt', 'quark',
  'sirup', 'honig', 'rübensirup', 'zuckerrübensirup', 'malzsirup', 'flüssigmalz',
  'ei', 'eier', 'vollei', 'eigelb', 'eiweiß', 'flüssigei',
  'öl', 'olivenöl', 'sonnenblumenöl', 'rapsöl'];

const TROCKEN_AUSSCHLUSS = ['leinsaat', 'leinsamen', 'sonnenblumenkern', 'kürbiskern',
  'sesam', 'mohn', 'hafer', 'haferflocken', 'nuss', 'nüsse', 'mandel', 'walnuss', 'haselnuss',
  'rosine', 'sultanine', 'cranberry', 'aprikose', 'feige', 'dattel', 'pflaume',
  'samen', 'kerne', 'körner', 'flocken', 'kleie', 'schrot', 'grütze',
  'salz', 'zucker', 'backmittel', 'backmalz', 'roggenmalz', 'malzextrakt', 'malzpulver', 'lecithin', 'ascorbin',
  'gewürz', 'kümmel', 'koriander', 'fenchel', 'anis', 'zimt', 'kardamom', 'vanille',
  'mehl', 'stärke', 'puder', 'pulver', 'granulat',
  'butter', 'margarine'];

export function getFrischeZutaten(rezept, skalierteZutaten) {
  if (!rezept || !rezept.zutaten || !skalierteZutaten) return [];
  return rezept.zutaten.map((z, i) => ({ ...z, menge: skalierteZutaten[i] || 0 }))
    .filter((z) => {
      if (z.menge <= 0) return false;
      const name = (z.name || '').toLowerCase();
      const bem = (z.bemerkung || '').toLowerCase().trim();
      if (z.ist_mehl) return false;
      if (TROCKEN_AUSSCHLUSS.some((kw) => name.includes(kw))) return false;
      // Backmittel "Eiszeit" ausschliessen — VOR Sauerteig/Hefe-Override
      if (name.replace(/[\s\-.]/g, '').includes('eiszeit')) return false;
      if (name.includes('sauerteig')) return true;
      if (name.includes('hefe')) return true;
      if (bem.includes('koch')) return false;
      if (z.ist_wasser) return true;
      if (FLUESSIG_KEYWORDS.some((kw) => name.includes(kw))) return true;
      return false;
    });
}

export function getFrischeZutatenGruppiert(rezept, skalierteZutaten) {
  const frisch = getFrischeZutaten(rezept, skalierteZutaten);
  const gruppen = {};
  const STUFEN_ORDER = ['Hauptteig', 'Sauerteig', 'Quellstück', 'Brühstück', 'Vorteig', 'Hefestück'];

  frisch.forEach((z) => {
    const bem = (z.bemerkung || '').toLowerCase().trim();
    let stufe = 'Hauptteig';
    if (bem.includes('sauer')) stufe = 'Sauerteig';
    else if (bem.includes('quell')) stufe = 'Quellstück';
    else if (bem.includes('brüh')) stufe = 'Brühstück';
    else if (bem.includes('vor')) stufe = 'Vorteig';
    else if (bem.includes('hefe') && bem.includes('stück')) stufe = 'Hefestück';
    if (!gruppen[stufe]) gruppen[stufe] = [];
    gruppen[stufe].push(z);
  });

  const result = [];
  STUFEN_ORDER.forEach((stufe) => {
    if (gruppen[stufe] && gruppen[stufe].length > 0) result.push({ stufe, zutaten: gruppen[stufe] });
  });
  Object.keys(gruppen).forEach((stufe) => {
    if (!STUFEN_ORDER.includes(stufe) && gruppen[stufe].length > 0) result.push({ stufe, zutaten: gruppen[stufe] });
  });
  return result;
}

// Vorteig-Zutaten (Quell-/Brüh-/Koch-/Sauerteig-Bons): Filterlogik Z. 7151-7192
export function getVorteigZutaten(rezept, skalierteZutaten, vorteigTyp) {
  if (!rezept || !rezept.zutaten || !skalierteZutaten) return [];
  const typ = vorteigTyp.toLowerCase();
  const FLUESSIG = ['wasser', 'milch', 'sahne', 'buttermilch', 'joghurt', 'quark',
    'sirup', 'honig', 'rübensirup', 'zuckerrübensirup', 'malzsirup', 'flüssigmalz',
    'ei', 'eier', 'vollei', 'eigelb', 'eiweiß', 'flüssigei',
    'öl', 'olivenöl', 'sonnenblumenöl', 'rapsöl'];

  return rezept.zutaten.map((z, i) => ({ ...z, menge: skalierteZutaten[i] || 0 }))
    .filter((z) => {
      if (z.menge <= 0) return false;
      const name = (z.name || '').toLowerCase();
      const bem = (z.bemerkung || '').toLowerCase().trim();
      if (!bem.includes(typ)) return false;
      if (z.ist_mehl) return false;
      if (TROCKEN_AUSSCHLUSS.some((kw) => name.includes(kw))) return false;
      if (name.replace(/[\s\-.]/g, '').includes('eiszeit')) return false;
      if (z.ist_wasser) return true;
      if (FLUESSIG.some((kw) => name.includes(kw))) return true;
      return false;
    });
}

// --- Bon-Byte-Erzeugung ---

// Hauptteig-Bon (Z. 7336-7452)
export function generateBonBytes(rezept, skalierteZutaten, produktInfo, teilerInfo, opts = {}) {
  const cfg = opts.cfg || getBonConfig(rezept);
  const datum = opts.datum || new Date().toLocaleDateString('de-DE');
  const customZutaten = opts.customZutaten || [];
  const bytes = [...ESCPOS.INIT, ...ESCPOS.CODEPAGE_858];

  if (teilerInfo) {
    bytes.push(...ESCPOS.ALIGN_CENTER, ...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_SIZE);
    bytes.push(...textToBytes('* ' + teilerInfo + ' *\n'));
    bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF, ...ESCPOS.ALIGN_LEFT);
  }
  if (cfg.rezeptname && rezept) {
    bytes.push(...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_HEIGHT);
    bytes.push(...textToBytes(bonTruncate(rezept.name, 32) + '\n'));
    bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
  }
  if (cfg.datum) {
    bytes.push(...ESCPOS.DOUBLE_HEIGHT);
    bytes.push(...textToBytes('Datum: ' + datum + '\n'));
    bytes.push(...ESCPOS.NORMAL);
  }
  if (cfg.stueckzahl && produktInfo) {
    const produkte = produktInfo.split(', ').filter((p) => p && p !== '-');
    if (produkte.length > 1) {
      bytes.push(...ESCPOS.BOLD_ON);
      bytes.push(...textToBytes('Produkte:\n'));
      bytes.push(...ESCPOS.BOLD_OFF);
      produkte.forEach((p) => bytes.push(...textToBytes(' ' + bonTruncate(p, 31) + '\n')));
    } else {
      bytes.push(...textToBytes(bonTruncate('Stueck: ' + produktInfo, 32) + '\n'));
    }
  }
  if (cfg.schuettwasser && rezept && skalierteZutaten) {
    const gruppen = getFrischeZutatenGruppiert(rezept, skalierteZutaten);
    const hauptteig = gruppen.find((g) => g.stufe === 'Hauptteig');
    if (hauptteig && hauptteig.zutaten.length > 0) {
      let gesamtKg = 0;
      bytes.push(...textToBytes('\n'));
      bytes.push(...ESCPOS.ALIGN_CENTER, ...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_SIZE);
      bytes.push(...textToBytes('HAUPTTEIG\n'));
      bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF, ...ESCPOS.ALIGN_LEFT);
      bytes.push(...textToBytes('================================\n'));
      bytes.push(...ESCPOS.DOUBLE_SIZE);
      hauptteig.zutaten.forEach((z) => {
        bonZutatBlock(bytes, z.name, formatNumber(z.menge, 3));
        gesamtKg += z.menge;
      });
      bytes.push(...ESCPOS.NORMAL);
      bytes.push(...textToBytes('--------------------------------\n'));
      bytes.push(...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_SIZE);
      bytes.push(...textToBytes(padBonLine16('GESAMT', formatNumber(gesamtKg, 3)) + '\n'));
      bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
      const blechMatch = produktInfo && produktInfo.match(/^(\d+)x\s*Blech/i);
      const blechAnzahl = blechMatch ? parseInt(blechMatch[1]) : 0;
      if (blechAnzahl > 1) {
        bytes.push(...ESCPOS.DOUBLE_HEIGHT);
        bytes.push(...textToBytes(padBonLine('pro Blech', formatNumber(gesamtKg / blechAnzahl, 3)) + '\n'));
        bytes.push(...ESCPOS.NORMAL);
      }
    }
  }
  if (cfg.ta && rezept) {
    try {
      const taWert = ta(rezept);
      if (taWert && taWert > 0) {
        bytes.push(...ESCPOS.DOUBLE_HEIGHT);
        bytes.push(...textToBytes('TA: ' + Math.round(taWert) + '%\n'));
        bytes.push(...ESCPOS.NORMAL);
      }
    } catch {}
  }
  if (cfg.allergene && rezept) {
    try {
      const allergene = getRezeptAllergene(rezept);
      if (allergene && allergene.length > 0) {
        const allergenStr = allergene.map((a) => ALLERGEN_NAMEN[a] || a).join(', ');
        bytes.push(...ESCPOS.DOUBLE_HEIGHT);
        bytes.push(...textToBytes(bonTruncate('Allerg: ' + allergenStr, 32) + '\n'));
        bytes.push(...ESCPOS.NORMAL);
      }
    } catch {}
  }
  if (cfg.naehrwerte && rezept) {
    try {
      const nw = berechneNaehrwerte(rezept, customZutaten);
      if (nw && nw.fehlend.length === 0) {
        bytes.push(...ESCPOS.DOUBLE_HEIGHT);
        bytes.push(...textToBytes('\nNaehrwerte/100g:\n'));
        bytes.push(...textToBytes(Math.round(nw.kcal) + ' kcal\n'));
        bytes.push(...textToBytes('Eiweiss: ' + formatNumber(nw.eiweiss, 1) + 'g\n'));
        bytes.push(...textToBytes('Kohlenh.: ' + formatNumber(nw.kh, 1) + 'g\n'));
        bytes.push(...textToBytes('Fett: ' + formatNumber(nw.fett, 1) + 'g\n'));
        bytes.push(...ESCPOS.NORMAL);
      }
    } catch {}
  }
  if (cfg.kommentare && rezept && rezept.zutaten) {
    const kommentare = rezept.zutaten.filter((z) => z.ist_kommentar);
    if (kommentare.length > 0) {
      bytes.push(...ESCPOS.DOUBLE_HEIGHT);
      bytes.push(...textToBytes('\nHinweise:\n'));
      kommentare.forEach((z) => bytes.push(...textToBytes('> ' + bonTruncate(z.name, 30) + '\n')));
      bytes.push(...ESCPOS.NORMAL);
    }
  }
  bytes.push(...textToBytes('\n================================\n\n\n'));
  bytes.push(...ESCPOS.FEED, ...ESCPOS.CUT);
  return bytes;
}

// Vorteig-Bon (QUELLSTÜCK/BRÜHSTÜCK/KOCHSTÜCK/SAUERTEIG, Z. 7195-7248)
export function generateVorteigBonBytes(rezept, zutaten, produktInfo, titel, teilerInfo, opts = {}) {
  const datum = opts.datum || new Date().toLocaleDateString('de-DE');
  const bytes = [...ESCPOS.INIT, ...ESCPOS.CODEPAGE_858];

  bytes.push(...ESCPOS.ALIGN_CENTER, ...ESCPOS.BOLD_ON);
  bytes.push(...textToBytes('================\n'));
  bytes.push(...ESCPOS.DOUBLE_SIZE);
  bytes.push(...textToBytes(titel + '\n'));
  bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
  bytes.push(...textToBytes('================\n'));

  if (teilerInfo) {
    bytes.push(...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_SIZE);
    bytes.push(...textToBytes('* ' + teilerInfo + ' *\n'));
    bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
  }
  bytes.push(...ESCPOS.ALIGN_LEFT);

  if (rezept) {
    bytes.push(...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_HEIGHT);
    bytes.push(...textToBytes(bonTruncate(rezept.name, 32) + '\n'));
    bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
  }

  bytes.push(...ESCPOS.DOUBLE_HEIGHT);
  bytes.push(...textToBytes('Datum: ' + datum + '\n'));
  bytes.push(...ESCPOS.NORMAL);

  if (zutaten.length > 0) {
    bytes.push(...textToBytes('\n'));
    bytes.push(...textToBytes('--------------------------------\n'));
    bytes.push(...ESCPOS.DOUBLE_SIZE);
    let gesamtKg = 0;
    zutaten.forEach((z) => {
      bonZutatBlock(bytes, z.name, formatNumber(z.menge, 3));
      gesamtKg += z.menge;
    });
    bytes.push(...ESCPOS.NORMAL);
    bytes.push(...textToBytes('--------------------------------\n'));
    bytes.push(...ESCPOS.BOLD_ON, ...ESCPOS.DOUBLE_SIZE);
    bytes.push(...textToBytes(padBonLine16('GESAMT', formatNumber(gesamtKg, 3)) + '\n'));
    bytes.push(...ESCPOS.NORMAL, ...ESCPOS.BOLD_OFF);
  }

  bytes.push(...textToBytes('\n================================\n\n\n'));
  bytes.push(...ESCPOS.FEED, ...ESCPOS.CUT);
  return bytes;
}

// Teiler-Anzeige fuer den Bon (ASCII, Z. 7612)
export function teilerInfoText(faktor) {
  if (!faktor || faktor === 1) return '';
  const teilerNamen = { '0.5': '1/2 HALB', '0.333': '1/3 DRITTEL', '0.25': '1/4 VIERTEL', '0.2': '1/5 FUENFTEL', '2': '2x DOPPELT' };
  return teilerNamen[faktor.toString()] || ('x' + faktor);
}
