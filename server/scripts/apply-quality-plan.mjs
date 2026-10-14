// Prüffähiger Datenabgleich: kein Schreiben ohne --apply, Dateisicherung vor
// COMMIT, Abbruch bei zwischenzeitlichen Änderungen. Keine Benutzer-/Authdaten.
// node server/scripts/apply-quality-plan.mjs PLAN.json SICHERUNG.json [--apply]
import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { validateRecipe, validateCustomIngredient } from '../../shared/validation.js';
import { makeBackup } from '../../shared/backup.js';

const [planFile, backupFile, option] = process.argv.slice(2);
if (!planFile || !backupFile || (option && option !== '--apply')) throw new Error('PLAN.json SICHERUNG.json [--apply] angeben.');
const plan = JSON.parse(readFileSync(planFile, 'utf8'));
if (!Array.isArray(plan.recipes) || !Array.isArray(plan.customIngredients)) throw new Error('Ungültiges Planformat.');
if (new Set(plan.recipes.map(p => p.id)).size !== plan.recipes.length || new Set(plan.customIngredients.map(p => p.name)).size !== plan.customIngredients.length) throw new Error('Doppelte Einträge im Abgleichplan.');
for (const p of plan.recipes) {
  if (p.data.id !== p.id || !Number.isInteger(p.version)) throw new Error('Rezept-ID/Version ungültig.');
  const errors = validateRecipe(p.data); if (errors.length) throw new Error(`${p.id}: ${errors.join(' ')}`);
}
for (const p of plan.customIngredients) {
  if (!p.name || !Object.hasOwn(p, 'before')) throw new Error('Zutat/Erwartungswert fehlt.');
  const errors = validateCustomIngredient(p.data); if (errors.length) throw new Error(`${p.name}: ${errors.join(' ')}`);
}
const env = dotenv.parse(readFileSync(new URL('../.env', import.meta.url)));
const dbUrl = new URL(env.DATABASE_URL);
if (!dbUrl.hostname.endsWith('.neon.tech')) throw new Error('Erwartete Neon-Datenbank fehlt.');
dbUrl.searchParams.set('sslmode', 'verify-full');
const client = new pg.Client({ connectionString: dbUrl.href, connectionTimeoutMillis: 20000 });
let transaction = false;
try {
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ'); transaction = true;
  await client.query("SET LOCAL lock_timeout = '2s'");
  await client.query("SET LOCAL statement_timeout = '15s'");
  for (const p of plan.recipes) {
    const { rows } = await client.query('SELECT data,version FROM recipes WHERE id=$1 FOR UPDATE', [p.id]);
    if (rows[0]?.version !== p.version || !isDeepStrictEqual(rows[0]?.data, p.before)) throw new Error(`Rezept inzwischen geändert: ${p.id}`);
  }
  for (const p of plan.customIngredients) {
    const { rows } = await client.query('SELECT data FROM custom_ingredients WHERE name=$1 FOR UPDATE', [p.name]);
    if (!isDeepStrictEqual(rows[0]?.data ?? null, p.before)) throw new Error(`Zutat inzwischen geändert: ${p.name}`);
  }
  if (option !== '--apply') {
    await client.query('ROLLBACK'); transaction = false;
    console.log(JSON.stringify({ geprueft: true, geschrieben: false, rezepte: plan.recipes.length, zutaten: plan.customIngredients.length }));
  } else {
    if (existsSync(backupFile)) throw new Error('Sicherungsdatei existiert bereits; keine Sicherung überschreiben.');
    const recipes = (await client.query('SELECT data,version FROM recipes ORDER BY id')).rows.map(r => ({ ...r.data, _version: r.version }));
    const customIngredients = (await client.query('SELECT name,data FROM custom_ingredients ORDER BY name')).rows;
    const prices = (await client.query('SELECT zutat_name,preis_eur_kg,lieferant FROM prices ORDER BY zutat_name')).rows;
    const settings = Object.fromEntries((await client.query('SELECT key,value FROM settings')).rows.map(r => [r.key, r.value]));
    writeFileSync(backupFile, JSON.stringify(makeBackup({ recipes, customIngredients, prices, settings }), null, 2), { flag: 'wx' });
    for (const p of plan.recipes) {
      await client.query('UPDATE recipes SET data=$1,name=$2,kategorie=$3,aktiv=$4,version=version+1,updated_at=now(),updated_by=$5 WHERE id=$6',
        [JSON.stringify(p.data), p.data.name, p.data.kategorie || '', p.data.aktiv !== false, 'Qualitätsabgleich 14.10.2026', p.id]);
      await client.query('INSERT INTO change_log (user_email,action,recipe_id,recipe_name,details) VALUES ($1,$2,$3,$4,$5)',
        ['Qualitätsabgleich', 'edit', p.id, p.data.name, JSON.stringify({ grund: p.reason })]);
    }
    for (const p of plan.customIngredients) {
      await client.query('INSERT INTO custom_ingredients (name,data) VALUES ($1,$2) ON CONFLICT(name) DO UPDATE SET data=$2,updated_at=now()', [p.name, JSON.stringify(p.data)]);
      await client.query('INSERT INTO change_log (user_email,action,details) VALUES ($1,$2,$3)', ['Qualitätsabgleich', 'custom_ingredient', JSON.stringify({ name: p.name, grund: p.reason })]);
    }
    await client.query('COMMIT'); transaction = false;
    console.log(JSON.stringify({ geschrieben: true, rezepte: plan.recipes.length, zutaten: plan.customIngredients.length, sicherung: backupFile }));
  }
} finally {
  if (transaction) await client.query('ROLLBACK');
  await client.end();
}
