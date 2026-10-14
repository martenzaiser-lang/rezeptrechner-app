import { isRecord, validateRecipe, validatePrices, validateCustomIngredient } from './validation.js';
export function makeBackup({ recipes, settings, prices, customIngredients }) {
  return { format: 'rezeptrechner-backup', schemaVersion: 2, exportiert: new Date().toISOString(),
    rezepte: recipes, cfg: settings, prices, customIngredients };
}
export function validateBackup(b) {
  if (!isRecord(b) || !Array.isArray(b.rezepte)) return ['Ungültige Sicherung: Rezeptliste fehlt.'];
  if (b.schemaVersion != null && b.schemaVersion !== 2) return ['Sicherungsversion wird nicht unterstützt.'];
  const errors = b.rezepte.flatMap(validateRecipe);
  if (new Set(b.rezepte.map(r => r?.id)).size !== b.rezepte.length) errors.push('Doppelte Rezept-IDs.');
  if (b.cfg !== undefined && !isRecord(b.cfg)) errors.push('Ungültige Einstellungen.');
  if (b.prices !== undefined) errors.push(...validatePrices(b.prices));
  if (b.customIngredients !== undefined) {
    if (!Array.isArray(b.customIngredients)) errors.push('Ungültige eigene Zutaten.');
    else for (const c of b.customIngredients) {
      if (!c || typeof c.name !== 'string' || !c.name.trim()) errors.push('Zutatname fehlt.');
      else errors.push(...validateCustomIngredient(c.data));
    }
  }
  if (b.schemaVersion === 2 && ['cfg', 'prices', 'customIngredients'].some(k => b[k] === undefined)) errors.push('Vollständige Sicherung enthält nicht alle Datengruppen.');
  return errors;
}
