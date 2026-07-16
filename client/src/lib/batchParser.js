// Batch-Zutaten-Parser — 1:1 aus der alten App (index.html Z. 4067-4075).
// Format: "1000 Weizenmehl 550" oder "1.5kg Roggenmehl" oder "1000g Wasser"

export function parseBatchLine(line) {
  line = line.trim();
  if (!line) return null;
  const match = line.match(/^([\d.,]+)\s*(kg|g)?\s+(.+)$/i);
  if (!match) return null;
  let menge = parseFloat(match[1].replace(',', '.'));
  const einheit = (match[2] || 'g').toLowerCase();
  const name = match[3].trim();
  if (einheit === 'kg') menge *= 1000;
  return { name, menge_g: Math.round(menge) };
}

// Mehl-/Wasser-Erkennung wie saveBatchZutaten (Z. 4092): erst bekannte
// Zutaten aus allen Rezepten, dann Namens-Heuristik.
export function erkenneFlags(name, vorschlaege = []) {
  const lower = name.toLowerCase();
  const found = vorschlaege.find((v) => v.name.toLowerCase() === lower);
  return {
    ist_mehl: found?.ist_mehl || lower.includes('mehl') || lower.includes('schrot'),
    ist_wasser: found?.ist_wasser || lower === 'wasser',
  };
}

// Zutat-Vorschlaege: alle bekannten Zutaten aus allen Rezepten (dedupliziert).
export function getZutatVorschlaege(rezepte) {
  const map = new Map();
  for (const r of rezepte) {
    for (const z of r.zutaten || []) {
      if (z.ist_kommentar || !z.name) continue;
      if (!map.has(z.name.toLowerCase())) {
        map.set(z.name.toLowerCase(), { name: z.name, ist_mehl: !!z.ist_mehl, ist_wasser: !!z.ist_wasser });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
