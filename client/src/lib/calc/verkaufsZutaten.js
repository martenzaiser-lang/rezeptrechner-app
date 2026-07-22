// Verkaufs-Zutatenverzeichnis fuer UNVERPACKTE Ware (LMIDV § 3-4):
// Backmittel/Herstellerprodukte (IREKS, CSM/Meistermarken, Ergaenzungen)
// werden in ihre Komponenten aufgeschluesselt und in die Zutatenliste des
// Rezepts eingeschmolzen — ohne Duplikate und reduziert auf das, was bei
// loser Ware deklariert werden muss bzw. echte Zutat ist.
//
// Regeln (Kenntlichmachung bei loser Ware, § 9 ZZulV / LMIDV Anlage):
// - RAUS: Zusatzstoff-Klassen ohne Kenntlichmachungspflicht (Emulgator,
//   Stabilisator, Verdickungs-/Geliermittel, Saeureregulator, Saeuerungs-
//   mittel, Backtriebmittel, Mehlbehandlungsmittel, Traeger-/Trennmittel),
//   Enzyme (Verarbeitungshilfsstoffe), Aromen, faerbende Lebensmittel,
//   Packgase.
// - BLEIBT: jede echte Lebensmittelzutat (Mehle, Zucker, Fette, Milch-/
//   Eierzeugnisse, Gelatine, Fruechte, Gewuerze, ...) sowie Klassen MIT
//   Kenntlichmachungspflicht (Farbstoff, Konservierungsstoff,
//   Antioxidationsmittel, Suessungsmittel, Geschmacksverstaerker).
// - ALLERGEN-AUSNAHME: enthaelt eine eigentlich wegfallende Komponente ein
//   <b>Allergen</b> (z.B. "Emulgator ... SOJAlecithin", "Aroma (enthaelt
//   MILCH)"), bleibt der Allergen-Teil erhalten.
//
// Die Allergen-GROSSSCHREIBUNG aus den Datenblaettern (WEIZENmehl) bleibt
// als Hervorhebung erhalten. Mengen-/Prozentangaben der Datenblaetter
// (QUID, z.B. "Kakaopulver (8,0%)") werden entfernt — sie beziehen sich
// auf das Backmittel, nicht auf das Endprodukt.

import { getRezeptLmivZutaten } from './naehrwerteLookup.js';

// Zusatzstoff-Klassen/Stoffe ohne Kenntlichmachungspflicht bei loser Ware
const DROP_KLASSEN = /^(emulgator|stabilisator|verdickungsmittel|geliermittel|s(ä|ae)ureregulator|s(ä|ae)uerungsmittel|backtriebmittel|mehlbehandlungsmittel|feuchthaltemittel|festigungsmittel|tr(ä|ae)gerstoff|trennmittel|packgas|enzym|stickstoff$|f(ä|ae)rbendes lebensmittel)/i;

// Reine Faerbe-Zutaten (faerbende Lebensmittel ohne eigenen Naehrwertbeitrag)
const DROP_FAERBEND = /^(f(ä|ae)rberdistelextrakt|karottenextrakt|karottenkonzentrat|holunderbeerkonzentrat)$/i;

// Aromen (freiwillig bei loser Ware) — greift nicht bei Allergen-Ausnahme
const DROP_AROMA = /aroma\b|\baroma/i;

// Klassen MIT Kenntlichmachungspflicht bei loser Ware — bleiben drin
const KENNTLICH_KLASSEN = /^(farbstoff|konservierungsstoff|antioxidationsmittel|geschmacksverst(ä|ae)rker|s(ü|ue)(ß|ss)ungsmittel)/i;

// Gleiche Stoffe unter verschiedenen Namen → ein Eintrag
const SYNONYME = {
  'speisesalz': 'salz',
  'jodiertes speisesalz': 'salz',
  'meersalz': 'salz',
  'dextrose': 'traubenzucker',
  'glucose': 'traubenzucker',
  'gluten': 'weizenkleber',
};

// Klammer-Gruppen (rund UND eckig, auch verschachtelt) tiefensicher entfernen
function ohneKlammern(text) {
  let out = '';
  let depth = 0;
  for (const ch of text) {
    if (ch === '(' || ch === '[') { depth++; continue; }
    if (ch === ')' || ch === ']') { depth = Math.max(0, depth - 1); continue; }
    if (depth === 0) out += ch;
  }
  return out.replace(/\s{2,}/g, ' ').replace(/\s+([,;.])/g, '$1').trim();
}

// zutaten_lmiv am Top-Level-Semikolon trennen (Klammern zusammenhalten)
export function parseLmivKomponenten(lmivString) {
  if (!lmivString) return [];
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of lmivString) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts
    .map((p) => p.replace(/\.\s*$/, '').trim())
    .filter(Boolean);
}

// Normalisierungs-Schluessel fuer die Duplikat-Erkennung:
// klein, ohne Klammern, ohne Mehltype-Nummer ("Weizenmehl 550" = "WEIZENmehl")
export function dedupeKey(name) {
  let key = ohneKlammern(String(name))
    .toLowerCase()
    .replace(/\s+type\s+(\d{3,4})$/, ' $1') // "Weizenmehl Type 550" = "Weizenmehl 550"
    .replace(/\s+\d{3,4}$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return SYNONYME[key] || key;
}

// Text an Top-Level-Kommas trennen (Kommas in Klammern bleiben zusammen)
function splitTopLevelKommas(text) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.filter(Boolean);
}

// Eine Roh-Komponente (mit <b>-Markup) → Anzeigenamen (Array) oder null
function komponenteFuerVerkauf(raw) {
  const text = raw.replace(/<\/?b>/gi, '').trim();
  const hasBold = /<b>/i.test(raw);

  const faelltWeg =
    DROP_KLASSEN.test(text) || DROP_FAERBEND.test(text) || DROP_AROMA.test(text);

  if (faelltWeg && !KENNTLICH_KLASSEN.test(text)) {
    if (!hasBold) return null;
    // Allergen-Ausnahme: nur die Allergen-Segmente der Komponente behalten
    const segmente = raw
      .split(',')
      .filter((s) => /<b>/i.test(s))
      .map((s) => s.replace(/<\/?b>/gi, '').trim())
      .filter(Boolean);
    if (segmente.length === 0) return [text];
    const klasse = text.split(/[\s:]/)[0];
    const disp = segmente.join(', ');
    return [
      disp.toLowerCase().startsWith(klasse.toLowerCase())
        ? disp
        : `${klasse} ${disp}`,
    ];
  }

  // Kenntlichmachungspflichtige Klasse: "Farbstoff: Betenrot" → "Farbstoff Betenrot"
  if (KENNTLICH_KLASSEN.test(text)) {
    return [text.replace(/:\s*/, ' ').trim()];
  }

  // Echte Zutat: Klammern nur behalten, wenn das Allergen NUR dort steht
  // (z.B. "Malzextrakt (GERSTENmalz, Wasser)"), sonst entfernen —
  // deckt QUID-Prozente und Unterzutaten-Listen ab.
  const boldAusserhalb = /<b>/i.test(ohneKlammern(raw));
  let zutat = hasBold && !boldAusserhalb ? text : ohneKlammern(text);

  // ", getrocknet"-Suffix weg (sonst wirkt es in der Liste wie zwei Zutaten)
  zutat = zutat.replace(/,\s*getrocknet$/i, '').trim();
  // "Pflanzliche Fette: Palm, ..." → "Pflanzliche Fette (Palm, ...)"
  zutat = zutat.replace(/^([^:(]+):\s*(.+)$/, '$1 ($2)');

  // Komma-Aufzaehlung echter Zutaten (z.B. Gewuerzmischung) auftrennen,
  // damit jede einzeln dedupliziert werden kann
  return splitTopLevelKommas(zutat);
}

// Alle deklarationsrelevanten Komponenten eines Backmittel-Datenblatts
export function verkaufsKomponenten(lmivString) {
  return parseLmivKomponenten(lmivString)
    .flatMap((p) => komponenteFuerVerkauf(p) || []);
}

// Zutatenverzeichnis fuer die Verkaufs-Ansicht: Rezept-Zutaten absteigend
// nach Anteil, Herstellerprodukte aufgeschluesselt, Duplikate entfernt
// (erste Nennung gewinnt = groesster Anteil).
export function getRezeptVerkaufsZutaten(rezept) {
  const liste = [];
  const gesehen = new Set();
  const add = (name) => {
    const key = dedupeKey(name);
    if (!key || gesehen.has(key)) return;
    gesehen.add(key);
    liste.push(name);
  };
  for (const z of getRezeptLmivZutaten(rezept)) {
    if (z.lmiv) {
      verkaufsKomponenten(z.lmiv).forEach(add);
    } else {
      add(z.name);
    }
  }
  return liste;
}
