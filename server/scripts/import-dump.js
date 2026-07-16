// Importiert einen App-Daten-Dump (Format von Rezeptrechner/dump_app_data.js:
// { rezepte, nw_custom, custom_zutaten, cfg }) in die Postgres-DB.
//
// Aufruf:  node scripts/import-dump.js <pfad-zum-dump.json> [--replace]
//   --replace: loescht vorhandene Rezepte vorher (kompletter Austausch)
//
// Idempotent: Upsert per Rezept-ID. Am Stichtag laeuft stattdessen
// migrate-from-firestore.js (frischer Firestore-Stand).

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { pool } from '../db.js';

const file = process.argv[2];
const replace = process.argv.includes('--replace');
if (!file) {
  console.error('Aufruf: node scripts/import-dump.js <dump.json> [--replace]');
  process.exit(1);
}

const dump = JSON.parse(readFileSync(file, 'utf8'));
const rezepte = dump.rezepte || [];
if (!Array.isArray(rezepte) || rezepte.length === 0) {
  console.error('Dump enthaelt keine Rezepte — Abbruch.');
  process.exit(1);
}

const client = await pool.connect();
try {
  await client.query('BEGIN');
  if (replace) {
    await client.query('DELETE FROM recipes');
    console.log('[import] Bestehende Rezepte geloescht (--replace)');
  }

  let inserted = 0;
  let updated = 0;
  for (const r of rezepte) {
    if (!r.id || !r.name) {
      console.warn(`[import] Uebersprungen (id/name fehlt): ${JSON.stringify(r).slice(0, 80)}`);
      continue;
    }
    const result = await client.query(
      `INSERT INTO recipes (id, name, kategorie, aktiv, data, updated_by)
       VALUES ($1, $2, $3, $4, $5, 'migration')
       ON CONFLICT (id) DO UPDATE
         SET name = $2, kategorie = $3, aktiv = $4, data = $5,
             version = recipes.version + 1, updated_at = now(), updated_by = 'migration'
       RETURNING (xmax = 0) AS is_insert`,
      [String(r.id), r.name, r.kategorie || '', r.aktiv !== false, JSON.stringify(r)]
    );
    if (result.rows[0].is_insert) inserted++;
    else updated++;
  }

  // cfg → settings (Baeckerei-Name etc.)
  const cfg = dump.cfg || {};
  for (const [key, value] of Object.entries(cfg)) {
    await client.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [key, JSON.stringify(value)]
    );
  }

  // nw_custom → custom_ingredients
  const nwCustom = dump.nw_custom || {};
  for (const [name, data] of Object.entries(nwCustom)) {
    await client.query(
      `INSERT INTO custom_ingredients (name, data) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET data = $2, updated_at = now()`,
      [name, JSON.stringify(data)]
    );
  }

  await client.query('COMMIT');

  // Validierungsreport
  const { rows: cnt } = await client.query('SELECT COUNT(*)::INT AS n FROM recipes');
  const { rows: kats } = await client.query(
    'SELECT kategorie, COUNT(*)::INT AS n FROM recipes GROUP BY kategorie ORDER BY n DESC'
  );
  const { rows: zut } = await client.query(
    `SELECT SUM(jsonb_array_length(COALESCE(data->'zutaten', '[]'::jsonb)))::INT AS n FROM recipes`
  );
  console.log(`[import] Rezepte: ${inserted} neu, ${updated} aktualisiert — Bestand: ${cnt[0].n}`);
  console.log(`[import] Zutaten gesamt: ${zut[0].n}`);
  console.log('[import] Kategorien:', kats.map((k) => `${k.kategorie || '(leer)'}=${k.n}`).join(', '));
  console.log(`[import] Settings-Keys: ${Object.keys(cfg).join(', ') || '(keine)'}`);
  console.log(`[import] Custom-Zutaten: ${Object.keys(nwCustom).length}`);
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('[import] FEHLER:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
