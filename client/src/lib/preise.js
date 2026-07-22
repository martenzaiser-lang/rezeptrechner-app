// Preis-Lookup + Rezeptkosten — 1:1 aus der alten App (Z. 4297, 5486).
// Eigene Preise (DB) haben Vorrang, BAEKO-Standardpreise sind Fallback.

import { ZUTAT_PREISE } from '../data/baekoPreise.js';
import { skaliere, skaliereBlech } from './calc/skalierung.js';

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

// Rohstoffkosten pro Kalkulationsbasis: 1 Stück (Teiggewicht) bzw. bei
// Kuchen 1 Basis-Blech. Liefert die Zeilen für die Anzeige mit; Wasser
// zählt bewusst als 0 € ohne Warnung, Zutaten ohne Preis landen in
// ohnePreis (Summe wäre sonst stillschweigend zu niedrig).
// eigenePreise: { zutatName: { preis_kg } } (aus DB-prices abgeleitet)
export function berechneRohstoffkosten(rezept, eigenePreise = {}) {
  const istBlech = rezept.berechnung === 'blech';
  const sk = istBlech ? skaliereBlech(rezept, 1) : skaliere(rezept, 1);
  const zeilen = [];
  const ohnePreis = [];
  let summe = 0;
  rezept.zutaten.forEach((z, idx) => {
    if (z.ist_kommentar || !z.name || z.name.toLowerCase() === 'gesamt') return;
    const kg = sk[idx] || 0;
    if (kg <= 0) return;
    const eigen = eigenePreise[z.name];
    const preisKg = eigen?.preis_kg ?? findZutatPreis(z.name);
    const istWasser = z.name.toLowerCase().includes('wasser');
    const kosten = preisKg != null ? kg * preisKg : 0;
    summe += kosten;
    if (preisKg == null && !istWasser) ohnePreis.push(z.name);
    zeilen.push({
      name: z.name,
      gramm: kg * 1000,
      preisKg,
      kosten,
      quelle: eigen?.preis_kg != null ? 'eigen' : preisKg != null ? 'bäko' : istWasser ? 'wasser' : 'fehlt',
    });
  });
  return { summe, zeilen, ohnePreis, istBlech };
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
