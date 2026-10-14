// Ausschließlich lesender Zutaten-/Rezeptabgleich; kein Import von App-/Migrationscode.
import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
const values = dotenv.parse(readFileSync(new URL('../.env', import.meta.url)));
const url = new URL(values.DATABASE_URL);
if (!url.hostname.endsWith('.neon.tech')) throw new Error('Erwartete Neon-Datenbank nicht gefunden; Abbruch.');
const client = new pg.Client({ connectionString: values.DATABASE_URL, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 20000,
  options: '-c default_transaction_read_only=on -c statement_timeout=15000',
});
try {
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const check = await client.query('SHOW transaction_read_only');
  if (check.rows[0].transaction_read_only !== 'on') throw new Error('Read-only-Schutz fehlt.');
  const recipes = (await client.query('SELECT id,data,version,updated_at FROM recipes ORDER BY id')).rows;
  const customIngredients = (await client.query('SELECT name,data,updated_at FROM custom_ingredients ORDER BY name')).rows;
  await client.query('ROLLBACK');
  const out = process.argv[2];
  if (!out) throw new Error('Ausgabepfad fehlt.');
  writeFileSync(out, JSON.stringify({ gelesen_am: new Date().toISOString(), readonly: true, recipes, customIngredients }, null, 2));
  console.log(JSON.stringify({ readonly:true, rezepte:recipes.length, eigeneZutaten:customIngredients.length, datei:out }));
} finally { await client.end(); }
