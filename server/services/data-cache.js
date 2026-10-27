import { pool } from '../db.js';

// Ein gemeinsamer Cache für alle Geräte und die LMIV-Auskunft. App-Schreibzugriffe
// verwerfen ihn nach COMMIT sofort. Direkte SQL-Änderungen werden spätestens bei
// der nächsten Prüfung erkannt. Keine Hintergrund-Timer: ohne Leser keine Arbeit.
// 15 Minuten lassen Neon zwischen Prüfungen nach 5 Minuten Inaktivität schlafen.
export const DATA_CACHE_TTL_MS = 15 * 60 * 1000;

// Die Prüfsummen entstehen in Postgres; nur vier kurze Werte verlassen Neon.
// Alle Spalten einbeziehen: auch Löschen/Restore und direkte SQL-Änderungen ohne
// neue updated_at/version müssen erkannt werden. Reihenfolge ist deterministisch.
export const DATA_REVISION_SQL = `SELECT
  (SELECT md5(COALESCE(jsonb_agg(to_jsonb(r) ORDER BY id)::text, '[]')) FROM recipes r) AS recipes,
  (SELECT md5(COALESCE(jsonb_agg(to_jsonb(s) ORDER BY key)::text, '[]')) FROM settings s) AS settings,
  (SELECT md5(COALESCE(jsonb_agg(to_jsonb(p) ORDER BY zutat_name)::text, '[]')) FROM prices p) AS prices,
  (SELECT md5(COALESCE(jsonb_agg(to_jsonb(i) ORDER BY name)::text, '[]')) FROM custom_ingredients i) AS ingredients`;

let cached = null;
let pending = null;
let generation = 0;

export function invalidateDataCache() {
  generation++;
  if (cached) cached = { ...cached, expiresAt: 0 };
}

async function loadSnapshot(previous) {
  const client = await pool.connect();
  try {
    // Prüfsummen und Inhalte müssen denselben Datenstand beschreiben, selbst
    // wenn während des Lesens ein anderes Gerät oder ein SQL-Skript schreibt.
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const { rows: [revisions] } = await client.query(DATA_REVISION_SQL);
    const changed = key => !previous || previous.revisions[key] !== revisions[key];
    const recipes = changed('recipes')
      ? (await client.query('SELECT data, version, updated_at, aktiv FROM recipes ORDER BY name, id')).rows
      : previous.recipes;
    const settings = changed('settings')
      ? Object.fromEntries((await client.query('SELECT key, value FROM settings ORDER BY key')).rows.map(r => [r.key, r.value]))
      : previous.settings;
    const prices = changed('prices')
      ? (await client.query('SELECT zutat_name, preis_eur_kg, lieferant FROM prices ORDER BY zutat_name')).rows
      : previous.prices;
    const ingredients = changed('ingredients')
      ? (await client.query('SELECT name, data FROM custom_ingredients ORDER BY name')).rows
      : previous.ingredients;
    await client.query('COMMIT');
    const checkedAt = Date.now();
    return { revisions, recipes, settings, prices, ingredients, checkedAt, expiresAt: checkedAt + DATA_CACHE_TTL_MS };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function getDataSnapshot() {
  while (true) {
    if (cached && Date.now() < cached.expiresAt) return cached;
    // Parallele Requests (vier Datenbereiche, mehrere Tablets) teilen einen Abruf.
    if (!pending) {
      const startedGeneration = generation;
      pending = loadSnapshot(cached).then(snapshot => {
        // Ein bereits laufender Abruf darf einen inzwischen gespeicherten
        // neueren Stand nicht wieder mit seinem alten Snapshot überschreiben.
        if (generation === startedGeneration) cached = snapshot;
      }).finally(() => { pending = null; });
    }
    // Bei DB-Fehlern kein abgelaufenes Ergebnis als aktuell ausgeben. Der Client
    // behält seinen lokalen Stand und zeigt wie bisher den Verbindungsfehler.
    await pending;
  }
}
