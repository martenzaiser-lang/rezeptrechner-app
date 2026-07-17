// Hilfsskript: Rezepte in der DB per Namensmuster suchen.
// Aufruf: node scripts/suche-rezept.js <muster>

import 'dotenv/config';
import { pool } from '../db.js';

const muster = process.argv[2] || '';
const { rows } = await pool.query(
  'SELECT name, kategorie, aktiv FROM recipes WHERE name ILIKE $1 ORDER BY name',
  ['%' + muster + '%']
);
console.log(rows.length ? JSON.stringify(rows, null, 1) : `Keine Treffer für "${muster}"`);
await pool.end();
