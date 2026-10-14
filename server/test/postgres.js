import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

// Echter PostgreSQL-Kern im Arbeitsspeicher; keine Netzwerkverbindung zu Neon.
export async function createTestPostgres() {
  const db = new PGlite();
  await db.exec(readFileSync(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8'));
  let queue = Promise.resolve();
  const acquire = async () => {
    let release;
    const previous = queue;
    queue = new Promise(resolve => { release = resolve; });
    await previous;
    return release;
  };
  const query = async (sql, params) => {
    const result = await db.query(sql, params);
    return { ...result, rowCount: result.affectedRows ?? result.rows.length };
  };
  const pool = {
    async query(sql, params) { const release = await acquire(); try { return await query(sql, params); } finally { release(); } },
    async connect() { const release = await acquire(); return { query, release }; },
    on() {}, async end() { await db.close(); },
  };
  return { db, pool };
}
