// Getrennte Verkaufsgebäcke: Verweise auf Grundrezepte/Rohstoffe, keine neuen
// Zutatenmengen im Grundrezept. Mengenhinweise werden bewusst nicht verrechnet.
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v, max = 300) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export function validateGebaeckaufbauten(data) {
  if (!record(data) || data.schemaVersion !== 1 || !Array.isArray(data.produkte) || data.produkte.length > 400) {
    return ['Gebäckaufbau: ungültiges Format oder zu viele Gebäcke.'];
  }
  const errors = [], ids = new Set();
  for (const p of data.produkte) {
    if (!record(p) || !text(p.id, 100) || !text(p.name)) { errors.push('Gebäckaufbau: ID und Name erforderlich.'); continue; }
    if (ids.has(p.id)) errors.push(`Gebäckaufbau: doppelte ID ${p.id}.`);
    ids.add(p.id);
    if (p.bestaetigtAm != null && (typeof p.bestaetigtAm !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.bestaetigtAm))) errors.push(`${p.name}: Bestätigungsdatum ungültig.`);
    if (p.hinweis != null && (typeof p.hinweis !== 'string' || p.hinweis.length > 4000)) errors.push(`${p.name}: Hinweis ungültig.`);
    if (p.imShop != null && typeof p.imShop !== 'boolean') errors.push(`${p.name}: Shopstatus ungültig.`);
    if (p.artikelnummern != null && (!Array.isArray(p.artikelnummern) || p.artikelnummern.length > 30 || p.artikelnummern.some(n => !/^\d{1,15}$/.test(n)))) errors.push(`${p.name}: Artikelnummern ungültig.`);
    if (p.offen != null && (!Array.isArray(p.offen) || p.offen.length > 30 || p.offen.some(s => !text(s, 1000)))) errors.push(`${p.name}: offene Angaben ungültig.`);
    if (!Array.isArray(p.bestandteile) || !p.bestandteile.length || p.bestandteile.length > 30) { errors.push(`${p.name}: Bestandteile fehlen oder zu viele.`); continue; }
    for (const b of p.bestandteile) {
      if (!record(b) || !['rezept', 'zutat'].includes(b.typ)) { errors.push(`${p.name}: ungültiger Bestandteil.`); continue; }
      if (b.typ === 'rezept' && (!text(b.rezeptId, 100) || b.zutat != null || (b.produktName != null && !text(b.produktName)))) errors.push(`${p.name}: Rezeptverknüpfung ungültig.`);
      if (b.typ === 'zutat' && (!text(b.zutat) || b.rezeptId != null || b.produktName != null)) errors.push(`${p.name}: Rohstoffverknüpfung ungültig.`);
      for (const k of ['rolle', 'mengeHinweis']) if (b[k] != null && (typeof b[k] !== 'string' || b[k].length > 500)) errors.push(`${p.name}: ${k} ungültig.`);
    }
  }
  return errors;
}
