// PostgreSQL Connection Pool (Muster aus der Etiketten-App).
// Wird zentral importiert, nicht pro Route neu erzeugt.

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL nicht gesetzt – DB-Aufrufe werden fehlschlagen');
}

const needsSsl =
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.includes('render.com') ||
    process.env.DATABASE_URL.includes('neon.tech') ||
    process.env.PGSSLMODE === 'require');

// Neon nutzt eine oeffentliche CA → Zertifikat verifizieren (MITM-Schutz).
export function sslRejectUnauthorized(databaseUrl = process.env.DATABASE_URL) {
  const env = process.env.DB_SSL_REJECT_UNAUTHORIZED;
  if (env === 'true') return true;
  if (env === 'false') return false;
  return Boolean(databaseUrl && databaseUrl.includes('neon.tech'));
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: sslRejectUnauthorized() } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  // Neon-Cold-Start (Free-Tier) kann einige Sekunden dauern.
  connectionTimeoutMillis: 20_000,
});

pool.on('error', (err) => {
  console.error('[db] Pool-Fehler:', err.message);
});

export async function query(text, params) {
  return pool.query(text, params);
}
