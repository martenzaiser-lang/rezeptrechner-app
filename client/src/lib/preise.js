// Preis-Lookup + Rezeptkosten — 1:1 aus der alten App (Z. 4297, 5486).
// Eigene Preise (DB) haben Vorrang, BAEKO-Standardpreise sind Fallback.

import { ZUTAT_PREISE } from '../data/baekoPreise.js';

export function findZutatPreis(zutatName) {
  if (!zutatName) return null;
  const name = zutatName.toLowerCase().trim();
  if (ZUTAT_PREISE[name] !== undefined) return ZUTAT_PREISE[name];
  for (const key in ZUTAT_PREISE) {
    if (name.includes(key) || key.includes(name)) {
      return ZUTAT_PREISE[key];
    }
  }
  return null;
}

// eigenePreise: { zutatName: { preis_kg } } (aus DB-prices abgeleitet)
export function calcRezeptKosten(r, sk, eigenePreise = {}) {
  if (!sk || !sk.length) return 0;
  let kosten = 0;
  r.zutaten.forEach((z, idx) => {
    const kg = sk[idx] || 0;
    const p = eigenePreise[z.name];
    if (p && p.preis_kg) {
      kosten += kg * p.preis_kg;
    } else {
      const baekoPreis = findZutatPreis(z.name);
      if (baekoPreis !== null) kosten += kg * baekoPreis;
    }
  });
  return kosten;
}

// BAEKO-CSV-Parser: CSV (ISO-8859-1, Semikolon) → [{zutat_name, preis_eur_kg, lieferant}]
// mit Fuzzy-Match gegen die bekannten Zutaten der Rezepte.
export function parseBaekoCSV(text, bekannteZutaten) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const treffer = [];
  for (const line of lines) {
    const cols = line.split(';').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;
    // Heuristik: erste Text-Spalte = Artikelname, erste Zahlen-Spalte mit Komma = Preis
    const name = cols.find((c) => c && isNaN(parseFloat(c.replace(',', '.'))));
    const preisRaw = cols.find((c) => /^\d+[.,]\d+$/.test(c));
    if (!name || !preisRaw) continue;
    const preis = parseFloat(preisRaw.replace(',', '.'));
    if (!Number.isFinite(preis) || preis <= 0) continue;
    const nameLower = name.toLowerCase();
    const zutat = bekannteZutaten.find(
      (z) => z.toLowerCase() === nameLower || nameLower.includes(z.toLowerCase()) || z.toLowerCase().includes(nameLower)
    );
    if (zutat) {
      treffer.push({ zutat_name: zutat, preis_eur_kg: preis, lieferant: 'BÄKO', artikel: name });
    }
  }
  return treffer;
}
