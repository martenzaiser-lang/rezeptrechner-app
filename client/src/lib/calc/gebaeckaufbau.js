import { getRezeptAllergene, getRezeptSpuren, getRezeptAllergenStatus, getRezeptZutatenStatus, formatAllergene } from './naehrwerteLookup.js';
import { produktRezept } from './produktion.js';
import { validateGebaeckaufbauten } from '../../../../shared/gebaeckaufbau.js';

export function gebaeckKatalog(data) {
  if (data == null) return { produkte: [], fehler: [] };
  const fehler = validateGebaeckaufbauten(data);
  return { produkte: fehler.length ? [] : data.produkte, fehler };
}

// Auf Rechenkopien arbeiten. Die positive Prüfmenge eines einzelnen Rohstoffs
// bedeutet ausschließlich "ist enthalten" und fließt niemals in Nährwerte,
// Preise, Produktionsmengen oder ein Zutatenverzeichnis mit Anteilen ein.
export function gebaeckAllergene(gebaeck, recipes, customIngredients) {
  const allergene = new Set(), spuren = new Set(), offen = [...(gebaeck.offen || [])];
  const bestandteile = (gebaeck.bestandteile || []).map(b => {
    let rezept, name = b.zutat || b.rezeptId, fehler = [];
    try {
      if (b.typ === 'rezept') {
        const treffer = recipes.filter(r => r.id === b.rezeptId);
        if (treffer.length !== 1) throw new Error('Verknüpftes Rezept fehlt oder ist nicht eindeutig.');
        const quelle = treffer[0];
        name = quelle.name;
        const varianten = quelle.produkte || [];
        if (b.produktName && !varianten.some(p => p.name === b.produktName)) throw new Error(`Variante „${b.produktName}“ fehlt.`);
        if (!b.produktName && varianten.length > 0) throw new Error('Rezeptvariante muss zugeordnet werden.');
        if (b.produktName) name += ` – ${b.produktName}`;
        rezept = produktRezept(quelle, b.produktName || quelle.name);
      } else if (b.typ === 'zutat') {
        rezept = { zutaten: [{ name: b.zutat, menge_kg: 1 }] };
      } else throw new Error('Art des Bestandteils unbekannt.');
      const a = getRezeptAllergene(rezept, customIngredients);
      a.forEach(c => allergene.add(c));
      getRezeptSpuren(rezept, customIngredients).forEach(c => spuren.add(c));
      const allergenStatus = getRezeptAllergenStatus(rezept, customIngredients);
      const zutatenStatus = getRezeptZutatenStatus(rezept, customIngredients);
      if (!allergenStatus.vollstaendig) fehler.push(`Allergenangaben prüfen${allergenStatus.fehlend.length ? ': ' + allergenStatus.fehlend.join(', ') : ''}.`);
      if (!zutatenStatus.vollstaendig) fehler.push(`Zusammensetzung prüfen${zutatenStatus.fehlend.length ? ': ' + zutatenStatus.fehlend.join(', ') : ''}.`);
      if (rezept.berechnungsfehler) fehler.push(rezept.berechnungsfehler);
    } catch (err) { fehler.push(err.message); }
    fehler.forEach(f => offen.push(`${name}: ${f}`));
    return { ...b, name, fehler, gefunden: b.typ === 'rezept' && recipes.some(r => r.id === b.rezeptId) };
  });
  if (!bestandteile.length) offen.push('Keine Bestandteile verknüpft.');
  const codes = [...allergene].sort(), traceCodes = [...spuren].filter(c => !allergene.has(c)).sort();
  return { bestandteile, offen: [...new Set(offen)], vollstaendig: offen.length === 0,
    codes, traceCodes, allergene: formatAllergene(codes, true), spuren: formatAllergene(traceCodes, true) };
}

export function gebaeckeFuerRezept(data, rezeptId) {
  return gebaeckKatalog(data).produkte.filter(p => p.bestandteile.some(b => b.typ === 'rezept' && b.rezeptId === rezeptId));
}
