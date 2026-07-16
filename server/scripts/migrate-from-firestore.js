// Migration Firestore → Postgres (fuer den Umstellungs-Stichtag).
//
// Liest das Dokument baeckereien/oetzmann direkt per Firestore-REST
// (Login via Identity-Toolkit mit dem Admin-Konto — Env-Vars
// MIGRATION_ADMIN_EMAIL / MIGRATION_ADMIN_PASSWORD in server/.env),
// dekodiert das Firestore-Value-Format und upsertet in Postgres.
//
// Aufruf:  node scripts/migrate-from-firestore.js [--replace] [--dry-run]
//   --replace: kompletter Austausch (empfohlen am Stichtag)
//   --dry-run: nur Report, kein DB-Schreiben
//
// Idempotent und beliebig wiederholbar.

import 'dotenv/config';
import { pool } from '../db.js';

// Firebase-Konfiguration der ALTEN App (aus Rezeptrechner/index.html).
// Der API-Key ist der oeffentliche Web-Key, kein Secret.
const FIREBASE_API_KEY = 'AIzaSyBoNuWe2qaOjAg3Iymi8jP3HZave37xGpI';
const FIREBASE_PROJECT = 'oetzmann-rezepte';
const DOC_PATH = 'baeckereien/oetzmann';

const replace = process.argv.includes('--replace');
const dryRun = process.argv.includes('--dry-run');

const email = process.env.MIGRATION_ADMIN_EMAIL;
const password = process.env.MIGRATION_ADMIN_PASSWORD;
if (!email || !password) {
  console.error('MIGRATION_ADMIN_EMAIL / MIGRATION_ADMIN_PASSWORD in server/.env setzen.');
  process.exit(1);
}

// --- Firestore-Value-Format → normales JS-Objekt ---
function decodeValue(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  throw new Error(`Unbekannter Firestore-Werttyp: ${Object.keys(v).join(',')}`);
}
function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

// --- 1. Login (Identity Toolkit REST) ---
console.log(`[migrate] Login als ${email} ...`);
const loginRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }
);
if (!loginRes.ok) {
  const err = await loginRes.json().catch(() => ({}));
  console.error('[migrate] Firebase-Login fehlgeschlagen:', err?.error?.message || loginRes.status);
  process.exit(1);
}
const { idToken } = await loginRes.json();

// --- 2. Dokument lesen (Firestore REST) ---
console.log(`[migrate] Lese ${DOC_PATH} ...`);
const docRes = await fetch(
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${DOC_PATH}`,
  { headers: { Authorization: `Bearer ${idToken}` } }
);
if (!docRes.ok) {
  console.error('[migrate] Firestore-Lesen fehlgeschlagen:', docRes.status, await docRes.text());
  process.exit(1);
}
const doc = await docRes.json();
const data = decodeFields(doc.fields || {});
const rezepte = data.rezepte || [];
const cfg = data.cfg || {};

console.log(`[migrate] Firestore-Stand: ${rezepte.length} Rezepte, lastUpdate=${data.updatedAt || data.lastUpdate || '?'}`);
const kats = {};
for (const r of rezepte) kats[r.kategorie || '(leer)'] = (kats[r.kategorie || '(leer)'] || 0) + 1;
console.log('[migrate] Kategorien:', Object.entries(kats).map(([k, n]) => `${k}=${n}`).join(', '));

if (dryRun) {
  console.log('[migrate] --dry-run: kein DB-Schreiben.');
  await pool.end();
  process.exit(0);
}

// --- 3. In Postgres upserten ---
const client = await pool.connect();
try {
  await client.query('BEGIN');
  if (replace) {
    await client.query('DELETE FROM recipes');
    console.log('[migrate] Bestehende Rezepte geloescht (--replace)');
  }
  let inserted = 0;
  let updated = 0;
  for (const r of rezepte) {
    if (!r.id || !r.name) {
      console.warn(`[migrate] Uebersprungen (id/name fehlt): ${JSON.stringify(r).slice(0, 80)}`);
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
  for (const [key, value] of Object.entries(cfg)) {
    await client.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [key, JSON.stringify(value)]
    );
  }
  await client.query('COMMIT');

  const { rows: cnt } = await client.query('SELECT COUNT(*)::INT AS n FROM recipes');
  console.log(`[migrate] Fertig: ${inserted} neu, ${updated} aktualisiert — Bestand: ${cnt[0].n}`);
  console.log(`[migrate] Settings-Keys: ${Object.keys(cfg).join(', ') || '(keine)'}`);
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('[migrate] FEHLER:', err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
