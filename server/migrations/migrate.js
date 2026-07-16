// Migrations-Runner (Muster aus der Etiketten-App).
//
// - Führt alle .sql-Dateien in diesem Verzeichnis in alphabetischer Reihenfolge aus.
// - Überspringt Migrationen, die bereits in schema_migrations eingetragen sind.
// - Läuft auf Render vor dem Start: "npm run migrate && npm run start"
//   (preDeployCommand gibt es nur auf bezahlten Plänen).
//
// Lokal:
//   DATABASE_URL=postgres://... node migrations/migrate.js

import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { sslRejectUnauthorized } from '../db.js';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('[migrate] DATABASE_URL fehlt. Setze die Env-Variable oder .env.');
  process.exit(1);
}

const needsSsl =
  process.env.DATABASE_URL.includes('render.com') ||
  process.env.DATABASE_URL.includes('neon.tech') ||
  process.env.PGSSLMODE === 'require';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: sslRejectUnauthorized() } : false,
});

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ  DEFAULT NOW()
    );
  `);
}

async function run() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const files = readdirSync(__dirname)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('[migrate] Keine .sql-Dateien gefunden.');
      return;
    }

    const { rows: applied } = await client.query(
      'SELECT filename FROM schema_migrations'
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[migrate] SKIP ${file} (bereits angewendet)`);
        continue;
      }

      const sql = readFileSync(join(__dirname, file), 'utf8');
      console.log(`[migrate] RUN  ${file}`);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] FAIL ${file}:`, err.message);
        throw err;
      }
    }

    console.log(`[migrate] Fertig. ${count} Migration(en) angewendet.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[migrate] Abgebrochen:', err);
  process.exit(1);
});
