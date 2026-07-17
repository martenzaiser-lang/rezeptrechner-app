// Naehrwert-/Allergen-Lookup — portiert aus der alten App.
//
// Es gibt ZWEI Naehrwert-Systeme (wie im Original):
// 1. getNaehrwert/calcNutrition (NAEHRWERTE_DEFAULT: kcal/protein/carbs/fat
//    + a: Allergen-Hauptcodes) — fuer die Baker-Quick-Chips (Z. 2702-2756)
// 2. findNaehrwerte/berechneNaehrwerte (ZUTAT_NAEHRWERTE: 8-Feld LMIV)
//    — fuer den LMIV-Block im Admin (Z. 5737 ff.)
//
// Lookup-Prioritaet (Original): custom > Meistermarken/IREKS > default > fuzzy.
// NEU gegenueber alt: IREKS_DATEN (9 Produkte aus den Qualitaetszertifikaten)
// werden gleichrangig mit den Meistermarken behandelt.
//
// Custom-Zutaten kommen jetzt aus der DB (custom_ingredients) statt
// localStorage: als Objekt { nameLowerCase: data }.

import { EU_ALLERGENE, ZUTAT_ALLERGENE, ALLERGEN_NAMEN } from '../../data/allergene.js';
import { MEISTERMARKEN_DATEN } from '../../data/meistermarken.js';
import { MEISTERMARKEN_SYNONYME } from '../../data/synonyme.js';
import { IREKS_DATEN, IREKS_SYNONYME } from '../../data/ireks.js';
import { ZUTAT_NAEHRWERTE } from '../../data/naehrwerte.js';
import { NAEHRWERTE_DEFAULT } from '../../data/naehrwerteDefault.js';

// Hersteller-Datenblaetter zusammenfuehren (CSM/Meistermarken + IREKS)
const HERSTELLER_DATEN = { ...MEISTERMARKEN_DATEN, ...IREKS_DATEN };
const HERSTELLER_SYNONYME = { ...MEISTERMARKEN_SYNONYME, ...IREKS_SYNONYME };

// findMeistermarke (Original Z. 5164) — erweitert um IREKS
export function findHersteller(zutatName) {
  if (!zutatName) return null;
  const name = zutatName.toLowerCase().trim();
  if (HERSTELLER_DATEN[name]) return HERSTELLER_DATEN[name];
  if (HERSTELLER_SYNONYME[name]) return HERSTELLER_DATEN[HERSTELLER_SYNONYME[name]];
  for (const key of Object.keys(HERSTELLER_DATEN)) {
    if (name.includes(key)) return HERSTELLER_DATEN[key];
  }
  for (const syn of Object.keys(HERSTELLER_SYNONYME)) {
    if (name.includes(syn)) return HERSTELLER_DATEN[HERSTELLER_SYNONYME[syn]];
  }
  return null;
}

// Adapter (Original Z. 5184/5191)
function herstellerToNw1(m) {
  if (!m) return null;
  const hauptAllergene = [...new Set((m.allergene || []).map((c) => c.charAt(0)))];
  return { kcal: m.kcal, protein: m.eiweiss, carbs: m.kh, fat: m.fett, fiber: m.ballaststoffe, sugar: m.zucker, a: hauptAllergene };
}
function herstellerToNw2(m) {
  if (!m) return null;
  return { kcal: m.kcal, eiweiss: m.eiweiss, fett: m.fett, gfs: m.gfs, kh: m.kh, zucker: m.zucker, ballaststoffe: m.ballaststoffe, salz: m.salz };
}

// getNaehrwert (Original Z. 2702) — customNaehrwerte: { nameLower: {kcal,protein,carbs,fat,a[]} }
export function getNaehrwert(zutatName, customNaehrwerte = {}) {
  const name = zutatName.toLowerCase().trim();
  if (customNaehrwerte[name]) return customNaehrwerte[name];
  const m = findHersteller(name);
  if (m) return herstellerToNw1(m);
  if (NAEHRWERTE_DEFAULT[name]) return NAEHRWERTE_DEFAULT[name];
  const key = Object.keys(NAEHRWERTE_DEFAULT).find((k) => name.includes(k) || k.includes(name));
  if (key) return NAEHRWERTE_DEFAULT[key];
  if (name.includes('mehl')) return NAEHRWERTE_DEFAULT['weizenmehl 550'];
  if (name.includes('sauer')) return NAEHRWERTE_DEFAULT['roggensauerteig'];
  return null;
}

// calcNutrition (Original Z. 2739) — Anzeige nur bei >= 99% erfasster Menge
export function calcNutrition(r, skaliert, customNaehrwerte = {}) {
  const tot = { kcal: 0, protein: 0, carbs: 0, fat: 0, erfasst: 0, gesamt: 0, fehlend: [] };
  r.zutaten.forEach((z, i) => {
    const g = (skaliert[i] || 0) * 1000;
    if (g <= 0) return;
    tot.gesamt += g;
    const nw = getNaehrwert(z.name, customNaehrwerte);
    if (nw) {
      const f = g / 100;
      tot.kcal += nw.kcal * f;
      tot.protein += nw.protein * f;
      tot.carbs += nw.carbs * f;
      tot.fat += nw.fat * f;
      tot.erfasst += g;
    } else {
      tot.fehlend.push(z.name);
    }
  });
  tot.vollstaendig = tot.gesamt > 0 && tot.erfasst >= tot.gesamt * 0.99;
  return tot;
}

// Singular/Plural-Normalisierung fuer Direkt-Treffer: "Rosine" soll den
// Eintrag "rosinen" treffen und NICHT per Substring auf "rosinen
// geschwefelt" rutschen (Bug der alten App: "Rosine" bekam Sulfit-L,
// "Rosinen" nicht — je nach Schreibweise im Rezept).
function direktEintrag(map, name) {
  if (map[name] !== undefined) return map[name];
  if (map[name + 'n'] !== undefined) return map[name + 'n'];
  if (name.endsWith('n') && map[name.slice(0, -1)] !== undefined) return map[name.slice(0, -1)];
  return undefined;
}

// getRezeptAllergene (Original Z. 5602 — die "spaete", massgebliche Version)
// NEU: customZutaten (DB, Zutat-Daten-Modal) haben hoechste Prioritaet —
// damit kann Marten jede Allergen-Zuordnung selbst korrigieren.
export function getRezeptAllergene(rezept, customZutaten = []) {
  const allergene = new Set();
  const customMap = {};
  for (const c of customZutaten) {
    const a = c.a || c.allergene || c.data?.a || c.data?.allergene;
    if (a) customMap[(c.name || '').toLowerCase()] = a;
  }

  const excludeFromDairy = /mandelmilch|sojamilch|hafermilch|kokosmilch|reismilch|cashewmilch|erdnussbutter|mandelbutter|cashewbutter|nussbutter/;
  const allergenFrei = ['wasser', 'salz', 'zucker', 'honig', 'rübensirup', 'sonnenblumenkerne', 'kürbiskerne', 'leinsamen', 'chiasamen', 'mohn', 'sonnenblumenöl', 'rapsöl', 'olivenöl', 'hefe', 'frischhefe', 'trockenhefe', 'backpulver', 'kümmel', 'koriander', 'fenchel', 'anis', 'zimt', 'pfeffer', 'brotgewürz', 'kürbis', 'karotten', 'rote bete', 'süßkartoffel', 'kartoffel', 'rosinen', 'sultaninen', 'orangensaft', 'buchweizenmehl', 'maismehl', 'reismehl', 'hopfenmehl'];

  rezept.zutaten.forEach((z) => {
    const name = z.name.toLowerCase().trim();
    const isPflanzlich = excludeFromDairy.test(name);
    const isAllergenFrei = allergenFrei.some((af) => name.includes(af));

    // 0a. Eigene Zutat-Daten (DB) — von Marten gepflegt, schlagen alles
    if (customMap[name]) {
      customMap[name].forEach((a) => allergene.add(a));
      return;
    }

    // 0b. Hersteller-Datenblatt
    const m = findHersteller(name);
    if (m) {
      (m.allergene || []).forEach((a) => allergene.add(a));
      return;
    }

    // 1. Direkter Eintrag (inkl. Singular/Plural)
    const direkt = direktEintrag(ZUTAT_ALLERGENE, name);
    if (direkt !== undefined) {
      direkt.forEach((a) => allergene.add(a));
      return;
    }

    // 2. Teilstring-Match
    for (const [key, codes] of Object.entries(ZUTAT_ALLERGENE)) {
      if (name.includes(key) || key.includes(name)) {
        if (codes.length > 0) {
          codes.forEach((c) => {
            if (c === 'G' && isPflanzlich) return;
            allergene.add(c);
          });
        }
        return;
      }
    }

    // 3. Bekannt allergenfrei
    if (isAllergenFrei) return;

    // 4. Regex-Pattern-Fallback
    const allergenPatterns = {
      Aa: [/weizen/, /semmel/, /toast/, /paniermehl/, /backerbse/],
      Ab: [/roggen/],
      Ac: [/gerste/, /\bmalz\b/, /backmalz/, /eismalz/],
      Ad: [/hafer/],
      Ae: [/dinkel/],
      C: [/\bei\b/, /\beier\b/, /eigelb/, /eiweiß/, /vollei/],
      G: [/milch/, /butter/, /sahne/, /quark/, /joghurt/, /käse/],
      F: [/soja/],
      K: [/sesam/],
      Ha: [/mandel/, /marzipan/],
      Hb: [/haselnuss/, /nougat/],
      Hc: [/walnuss/],
      E: [/erdnuss/],
      J: [/senf/],
    };
    for (const [code, patterns] of Object.entries(allergenPatterns)) {
      if (code === 'G' && isPflanzlich) continue;
      for (const pattern of patterns) {
        if (pattern.test(name)) {
          allergene.add(code);
          break;
        }
      }
    }

    // 5. Mehl-Flag ohne erkanntes Gluten → Default Weizen
    if (z.ist_mehl) {
      const hasGluten = ['Aa', 'Ab', 'Ac', 'Ad', 'Ae', 'Af', 'Ag', 'Ah'].some((c) => allergene.has(c));
      if (!hasGluten && (name.includes('mehl') || /\b(405|550|812|1050|1600)\b/.test(name))) {
        allergene.add('Aa');
      }
    }
  });

  return [...allergene].sort();
}

// formatAllergene (Original Z. 5687 — Sub-Code-Aufloesung ueber EU_ALLERGENE)
export function formatAllergene(allergenCodes, asString = false) {
  const result = allergenCodes.map((code) => {
    const hauptCode = code.charAt(0);
    const subCode = code.length > 1 ? code.charAt(1).toLowerCase() : null;
    const allergen = EU_ALLERGENE[hauptCode];
    if (!allergen) return ALLERGEN_NAMEN[code] || code;
    if (subCode && allergen.sub && allergen.sub[subCode]) {
      return `${allergen.name} (${allergen.sub[subCode]})`;
    }
    return allergen.name;
  });
  return asString ? result.join(', ') : result;
}

// getRezeptSpuren (Original Z. 5703)
export function getRezeptSpuren(rezept) {
  const spuren = new Set();
  rezept.zutaten.forEach((z) => {
    const m = findHersteller(z.name);
    if (m && m.spuren) m.spuren.forEach((s) => spuren.add(s));
  });
  return [...spuren].sort();
}

// getRezeptLmivZutaten (Original Z. 5716): Zutatenverzeichnis absteigend
// nach Anteil, mit Unterzutaten aus Hersteller-Datenblaettern.
export function getRezeptLmivZutaten(rezept) {
  const gesamtKg = rezept.zutaten.reduce((s, z) => s + (z.menge_kg || 0), 0);
  if (gesamtKg <= 0) return [];
  return rezept.zutaten
    .filter((z) => (z.menge_kg || 0) > 0 && !z.ist_kommentar && z.name.toLowerCase() !== 'gesamt')
    .map((z) => {
      const m = findHersteller(z.name);
      return {
        name: z.name,
        anteil: ((z.menge_kg || 0) / gesamtKg) * 100,
        ist_meistermarke: !!m,
        lmiv: m ? m.zutaten_lmiv : null,
        bezeichnung: m ? m.bezeichnung : null,
      };
    })
    .sort((a, b) => b.anteil - a.anteil);
}

// findNaehrwerte 8-Feld (Original Z. 5737) — customZutaten: Array [{name, ...8-Feld}]
export function findNaehrwerte(zutatName, customZutaten = []) {
  const name = zutatName.toLowerCase().trim();

  const m = findHersteller(name);
  if (m) return herstellerToNw2(m);

  const direkt = direktEintrag(ZUTAT_NAEHRWERTE, name);
  if (direkt !== undefined) return direkt;

  const custom = customZutaten.find((z) => z.name.toLowerCase() === name);
  if (custom) return { kcal: custom.kcal, eiweiss: custom.eiweiss, fett: custom.fett, kh: custom.kh, ballaststoffe: custom.ballaststoffe, salz: custom.salz };

  for (const [key, nw] of Object.entries(ZUTAT_NAEHRWERTE)) {
    if (name.includes(key) || key.includes(name)) return nw;
  }

  const mehlMatch = name.match(/(weizen|roggen|dinkel)(voll)?korn?(mehl)?\s*(\d+)?/);
  if (mehlMatch) {
    const typ = mehlMatch[1];
    const vollkorn = mehlMatch[2];
    const nummer = mehlMatch[4];
    if (vollkorn) {
      const key = typ + 'vollkornmehl';
      if (ZUTAT_NAEHRWERTE[key]) return ZUTAT_NAEHRWERTE[key];
    }
    if (nummer) {
      const key = typ + 'mehl ' + nummer;
      if (ZUTAT_NAEHRWERTE[key]) return ZUTAT_NAEHRWERTE[key];
    }
    if (typ === 'weizen') return ZUTAT_NAEHRWERTE['weizenmehl 550'] || null;
    if (typ === 'roggen') return ZUTAT_NAEHRWERTE['roggenmehl 1150'] || null;
    if (typ === 'dinkel') return ZUTAT_NAEHRWERTE['dinkelmehl 630'] || null;
  }

  if (name.includes('mehl') || name.includes('schrot')) return ZUTAT_NAEHRWERTE['weizenmehl 550'];
  if (name.includes('wasser')) return ZUTAT_NAEHRWERTE['wasser'];
  if (name.includes('salz')) return ZUTAT_NAEHRWERTE['salz'];
  if (name.includes('hefe')) return ZUTAT_NAEHRWERTE['hefe'];
  if (name.includes('zucker')) return ZUTAT_NAEHRWERTE['zucker'];
  if (name.includes('butter')) return ZUTAT_NAEHRWERTE['butter'];
  if (name.includes('öl')) return ZUTAT_NAEHRWERTE['rapsöl'];

  return null;
}

// berechneNaehrwerte 8-Feld pro 100g Teig (Original Z. 5791)
export function berechneNaehrwerte(rezept, customZutaten = []) {
  const gesamtKg = rezept.zutaten.reduce((s, z) => s + (z.menge_kg || 0), 0);
  if (gesamtKg === 0) return null;

  const summe = { kcal: 0, eiweiss: 0, fett: 0, gfs: 0, kh: 0, zucker: 0, ballaststoffe: 0, salz: 0 };
  let gefunden = 0;
  const fehlend = [];

  rezept.zutaten.forEach((z) => {
    if (z.ist_kommentar || !(z.menge_kg > 0)) return;
    const nw = findNaehrwerte(z.name, customZutaten);
    if (nw) {
      gefunden++;
      const anteil = z.menge_kg / gesamtKg;
      summe.kcal += (nw.kcal || 0) * anteil;
      summe.eiweiss += (nw.eiweiss || 0) * anteil;
      summe.fett += (nw.fett || 0) * anteil;
      summe.gfs += (nw.gfs || 0) * anteil;
      summe.kh += (nw.kh || 0) * anteil;
      summe.zucker += (nw.zucker || 0) * anteil;
      summe.ballaststoffe += (nw.ballaststoffe || 0) * anteil;
      summe.salz += (nw.salz || 0) * anteil;
    } else {
      fehlend.push(z.name);
    }
  });

  return { ...summe, gefunden, fehlend };
}
