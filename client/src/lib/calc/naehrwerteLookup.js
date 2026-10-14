// Gemeinsame Nährwertquelle für Anzeige, Druck und Server.
// Eigene Angaben > exakt zugeordnete Herstellerdaten > belegte Rohstoffreferenz.
// Fehlende Werte und ungeprüfte Quellen sind keine Nullwerte.

import { EU_ALLERGENE, ZUTAT_ALLERGENE, ALLERGEN_NAMEN } from '../../data/allergene.js';
import { MEISTERMARKEN_DATEN } from '../../data/meistermarken.js';
import { MEISTERMARKEN_SYNONYME } from '../../data/synonyme.js';
import { IREKS_DATEN, IREKS_SYNONYME } from '../../data/ireks.js';
import { SYNONYME_ERGAENZUNGEN } from '../../data/synonymeErgaenzungen.js';
import { HERSTELLER_ERGAENZUNGEN } from '../../data/herstellerErgaenzungen.js';
import { ZUTAT_NAEHRWERTE } from '../../data/naehrwerte.js';
import { istGewicht } from './ta.js';
import { ROHSTOFF_ERGAENZUNGEN } from '../../data/rohstoffErgaenzungen.js';
import { ROHSTOFF_SYNONYME } from '../../data/rohstoffSynonyme.js';
import { NAEHRWERT_RECHERCHE } from '../../data/naehrwertRecherche.js';
import { ZUSAMMENGESETZTE_ZUTATEN, ZUTATEN_DEKLARATION } from '../../data/zutatenDeklaration.js';
import { istGekochterRoggen, ROGGEN_KOCHPROFIL } from '../../data/betrieblicheVorstufen.js';

import { naehrwertStatus, istNaehrwert, NAEHRWERT_LABEL } from './naehrwertFelder.js';
function normalisiereNw(n) {
  if (!n) return null;
  const d = n.data || n;
  return { ...d, eiweiss: d.eiweiss ?? d.protein, fett: d.fett ?? d.fat,
    kh: d.kh ?? d.carbs, zucker: d.zucker ?? d.sugar, ballaststoffe: d.ballaststoffe ?? d.fiber };
}

// Hersteller-Datenblaetter zusammenfuehren (CSM/Meistermarken + IREKS
// + nachtraegliche Ergaenzungen wie Dawn)
const HERSTELLER_DATEN = Object.fromEntries(Object.entries({ ...MEISTERMARKEN_DATEN, ...IREKS_DATEN, ...HERSTELLER_ERGAENZUNGEN }).map(([k,v]) => [k.toLowerCase().trim(), v]));
// SYNONYME_ERGAENZUNGEN: neue CSM-Synonyme aus den echten Rezeptnamen
// (synonyme.js selbst ist verbatim-verifiziert und darf nicht wachsen).
const HERSTELLER_SYNONYME = { ...MEISTERMARKEN_SYNONYME, ...IREKS_SYNONYME, ...SYNONYME_ERGAENZUNGEN };

// findMeistermarke (Original Z. 5164) — erweitert um IREKS
export function findHersteller(zutatName) {
  if (!zutatName) return null;
  const name = zutatName.toLowerCase().trim();
  if (HERSTELLER_DATEN[name]) return HERSTELLER_DATEN[name];
  if (HERSTELLER_SYNONYME[name]) {
    const d = HERSTELLER_DATEN[HERSTELLER_SYNONYME[name].toLowerCase()];
    // Baguette-Backmittel = IREKS Weizenback 1856, bestätigt von Marten am 14.10.2026.
    return d;
  }
  // Keine Teilwortsuche: „Dinkelbackmittel“ darf nicht „Backmittel/Eiszeit“ treffen.
  return null;
}

// Adapter (Original Z. 5184/5191)
function herstellerToNw2(m) {
  if (!m) return null;
  return { ...m };
}

// getNaehrwert (Original Z. 2702) — customNaehrwerte: { nameLower: {kcal,protein,carbs,fat,a[]} }
export function getNaehrwert(zutatName, customNaehrwerte = {}) {
  const custom = Object.entries(customNaehrwerte).map(([name, data]) => ({ name, ...data }));
  const nw = findNaehrwerte(zutatName, custom);
  if (!naehrwertStatus(nw).vollstaendig) return null;
  return { ...nw, protein: nw.eiweiss, carbs: nw.kh, fat: nw.fett, a: nw.a || nw.allergene || [] };
}

// Anzeige nur bei vollständig erfasster Zutatenmenge.
export function calcNutrition(r, skaliert, customNaehrwerte = {}) {
  const tot = { kcal: 0, protein: 0, carbs: 0, fat: 0, erfasst: 0, gesamt: 0, fehlend: [] };
  r.zutaten.forEach((z, i) => {
    if (!istGewicht(z)) return;
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
  tot.vollstaendig = tot.gesamt > 0 && tot.fehlend.length === 0;
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
    if (a) customMap[(c.name || '').toLowerCase().trim()] = a;
  }

  const excludeFromDairy = /mandelmilch|sojamilch|hafermilch|kokosmilch|reismilch|cashewmilch|erdnussbutter|mandelbutter|cashewbutter|nussbutter/;
  const allergenFrei = ['wasser', 'salz', 'zucker', 'honig', 'rübensirup', 'sonnenblumenkerne', 'kürbiskerne', 'leinsamen', 'chiasamen', 'mohn', 'sonnenblumenöl', 'rapsöl', 'olivenöl', 'hefe', 'frischhefe', 'trockenhefe', 'backpulver', 'kümmel', 'koriander', 'fenchel', 'anis', 'zimt', 'pfeffer', 'brotgewürz', 'kürbis', 'karotten', 'rote bete', 'süßkartoffel', 'kartoffel', 'rosinen', 'sultaninen', 'orangensaft', 'buchweizenmehl', 'maismehl', 'reismehl', 'hopfenmehl'];

  (rezept.deklarationsZutaten || rezept.zutaten).forEach((z) => {
    if (!istGewicht(z)) return;
    const name = z.name.toLowerCase().trim();
    const isPflanzlich = excludeFromDairy.test(name);
    const isAllergenFrei = allergenFrei.includes(name);

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
    const recherchiert = NAEHRWERT_RECHERCHE[name];
    if (Array.isArray(recherchiert?.allergene)) {
      recherchiert.allergene.forEach(a => allergene.add(a));
      return;
    }
    const direkt = direktEintrag(ZUTAT_ALLERGENE, ROHSTOFF_SYNONYME[name] || name);
    if (direkt !== undefined) {
      direkt.forEach((a) => allergene.add(a));
      return;
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

    // Eine Mehl-Markierung belegt keine Getreideart und damit auch kein Weizenallergen.
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
export function getRezeptSpuren(rezept, customZutaten = []) {
  const spuren = new Set();
  (rezept.deklarationsZutaten || rezept.zutaten).forEach((z) => {
    if (!istGewicht(z)) return;
    const c = customZutaten.find(c => c.name?.toLowerCase().trim() === z.name.toLowerCase().trim());
    const eigen = c?.data?.spuren ?? c?.spuren;
    if (Array.isArray(eigen)) { eigen.forEach(s => spuren.add(s)); return; }
    const m = findHersteller(z.name);
    if (m && m.spuren) m.spuren.forEach((s) => spuren.add(s));
    const recherchiert = NAEHRWERT_RECHERCHE[z.name.toLowerCase().trim()];
    if (recherchiert?.spuren) recherchiert.spuren.forEach(s => spuren.add(s));
  });
  return [...spuren].sort();
}

// Eine leere Trefferliste ist kein Nachweis, dass unbekannte Zutaten keine
// Allergene enthalten. Namenserkennung liefert Hinweise, keine Freigabe.
export function getRezeptAllergenStatus(rezept, customZutaten = []) {
  const fehlend = (rezept.deklarationsZutaten || rezept.zutaten).filter(istGewicht).filter(z => {
    const name = z.name.toLowerCase().trim();
    const c = customZutaten.find(c => c.name?.toLowerCase().trim() === name);
    if ((c?.data || c)?.allergene_geprueft === false) return true;
    const eigen = c?.a ?? c?.allergene ?? c?.data?.a ?? c?.data?.allergene;
    if (Array.isArray(eigen)) return false;
    const m = findHersteller(name);
    if (m?.allergene_geprueft === false) return true;
    if (Array.isArray(m?.allergene)) return false;
    if (NAEHRWERT_RECHERCHE[name]?.allergene_geprueft === false) return true;
    if (NAEHRWERT_RECHERCHE[name]?.allergene_geprueft === true) return false;
    const basis = ROHSTOFF_SYNONYME[name] || name;
    if (direktEintrag(ZUTAT_ALLERGENE, basis) !== undefined) return false;
    return !['wasser', 'salz', 'zucker'].includes(basis);
  }).map(z => z.name);
  return { vollstaendig: !rezept.berechnungsfehler && fehlend.length === 0 && rezept.zutaten.some(istGewicht), fehlend };
}

// getRezeptLmivZutaten (Original Z. 5716): Zutatenverzeichnis absteigend
// nach Anteil, mit Unterzutaten aus Hersteller-Datenblaettern.
export function getRezeptLmivZutaten(rezept, customZutaten = []) {
  const gesamtKg = rezept.zutaten.filter(z => !z.ist_kommentar && z.name.toLowerCase() !== 'gesamt').reduce((s, z) => s + (z.menge_kg || 0), 0);
  if (gesamtKg <= 0) return [];
  return rezept.zutaten
    .filter((z) => (z.menge_kg || 0) > 0 && !z.ist_kommentar && z.name.toLowerCase() !== 'gesamt')
    .map((z) => {
      const c = customZutaten.find(c => c.name?.toLowerCase().trim() === z.name.toLowerCase().trim());
      const eigen = c?.data || c;
      const recherchiert = NAEHRWERT_RECHERCHE[z.name.toLowerCase().trim()];
      const m = eigen?.zutaten_lmiv != null ? eigen : recherchiert?.zutaten_lmiv != null ? recherchiert : findHersteller(z.name) || ZUTATEN_DEKLARATION[z.name.toLowerCase().trim()];
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

// Ein Nährwertprofil oder eine Allergenliste ersetzt nicht die Zusammensetzung
// eines Backmittels, einer Füllung oder einer anderen zusammengesetzten Zutat.
export function istZusammengesetzteZutat(name, data = {}) {
  if (typeof data.zusammengesetzt === 'boolean') return data.zusammengesetzt;
  const key = name.toLowerCase().trim(), basis = ROHSTOFF_SYNONYME[key] || key;
  if (findHersteller(name) || ZUSAMMENGESETZTE_ZUTATEN.includes(key)) return true;
  // Bei völlig neuen Artikeln lässt sich aus Zahlen und Namen keine reine
  // Rohstoffart ableiten. Im Editor ausdrücklich zuordnen oder Liste ergänzen.
  return !istGekochterRoggen(key) && !NAEHRWERT_RECHERCHE[basis]
    && direktEintrag({ ...ZUTAT_NAEHRWERTE, ...ROHSTOFF_ERGAENZUNGEN }, basis) === undefined;
}

export function getRezeptZutatenStatus(rezept, customZutaten = []) {
  const liste = getRezeptLmivZutaten(rezept, customZutaten);
  const fehlend = liste.filter(z => {
    const d = findNaehrwerte(z.name, customZutaten) || {};
    return d.zutaten_geprueft === false || (istZusammengesetzteZutat(z.name, d) && !z.lmiv?.trim());
  }).map(z => z.name);
  return { vollstaendig: !rezept.berechnungsfehler && liste.length > 0 && fehlend.length === 0, fehlend };
}

// findNaehrwerte 8-Feld (Original Z. 5737) — customZutaten: Array [{name, ...8-Feld}]
export function findNaehrwerte(zutatName, customZutaten = []) {
  const name = zutatName.toLowerCase().trim();
  const custom = customZutaten.find((z) => z.name?.toLowerCase().trim() === name);
  if (custom) return normalisiereNw(custom);
  if (istGekochterRoggen(name)) return ROGGEN_KOCHPROFIL;

  const recherchiert = NAEHRWERT_RECHERCHE[ROHSTOFF_SYNONYME[name] || name];
  if (recherchiert) return recherchiert;

  const m = findHersteller(name);
  if (m) return herstellerToNw2(m);

  const direkt = direktEintrag({ ...ZUTAT_NAEHRWERTE, ...ROHSTOFF_ERGAENZUNGEN }, ROHSTOFF_SYNONYME[name] || name);
  if (direkt !== undefined) return direkt;

  // BEWUSSTE Abweichung vom Original (Bugfix 2026-07): das Original liess
  // hier gfs und zucker weg — dadurch wurden gesaettigte Fettsaeuren und
  // Zucker fuer ALLE Custom-Zutaten als 0 summiert (LMIV: Werte zu niedrig
  // ausgewiesen). Die DB-Eintraege (ZutatDatenModal + Seed) fuehren beide
  // Felder, sie werden jetzt mit durchgereicht.


  // Rohstoffe nur eindeutig zuordnen; Produktzusätze dürfen die Identität nicht ändern.


  return null;
}

// berechneNaehrwerte 8-Feld pro 100g Teig (Original Z. 5791)
export function berechneNaehrwerte(rezept, customZutaten = []) {
  const gesamtKg = rezept.zutaten.filter(z => !z.ist_kommentar && z.name.toLowerCase() !== 'gesamt').reduce((s, z) => s + (z.menge_kg || 0), 0);
  if (gesamtKg === 0) return null;

  const summe = { kj: 0, kcal: 0, eiweiss: 0, fett: 0, gfs: 0, kh: 0, zucker: 0, ballaststoffe: 0, salz: 0 };
  let gefunden = 0;
  const fehlend = [];
  const fehlendeFelder = [];

  rezept.zutaten.forEach((z) => {
    if (z.ist_kommentar || z.name.toLowerCase() === 'gesamt' || !(z.menge_kg > 0)) return;
    const nw = findNaehrwerte(z.name, customZutaten);
    const status = naehrwertStatus(nw);
    if (status.vollstaendig) {
      gefunden++;
      const anteil = z.menge_kg / gesamtKg;
      summe.kj += nw.kj * anteil;
      summe.kcal += (nw.kcal || 0) * anteil;
      summe.eiweiss += (nw.eiweiss || 0) * anteil;
      summe.fett += (nw.fett || 0) * anteil;
      summe.gfs += (nw.gfs || 0) * anteil;
      summe.kh += (nw.kh || 0) * anteil;
      summe.zucker += (nw.zucker || 0) * anteil;
      if (!istNaehrwert(nw.ballaststoffe)) summe.ballaststoffe = null;
      else if (summe.ballaststoffe !== null) summe.ballaststoffe += nw.ballaststoffe * anteil;
      summe.salz += (nw.salz || 0) * anteil;
    } else {
      fehlend.push(z.name);
      fehlendeFelder.push({ name: z.name, felder: status.fehlend.map(k => NAEHRWERT_LABEL[k]), quelleOffen: status.quelleOffen });
    }
  });

  return { ...summe, gefunden, fehlend: [...new Set(fehlend)], fehlendeFelder };
}
