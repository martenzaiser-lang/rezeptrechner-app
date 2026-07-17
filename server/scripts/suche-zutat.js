// Hilfsskript: In welchen Rezepten kommt eine Zutat vor (Namensmuster)?
// Aufruf: node scripts/suche-zutat.js <muster>

import 'dotenv/config';
import { pool } from '../db.js';

const muster = process.argv[2] || '';
const { rows } = await pool.query(
  `SELECT r.name, z->>'name' AS zutat,
          ROUND((z->>'menge_kg')::numeric * 1000) AS menge_g,
          z->>'bemerkung' AS abschnitt
   FROM recipes r, jsonb_array_elements(r.data->'zutaten') AS z
   WHERE z->>'name' ILIKE $1
   ORDER BY r.name`,
  ['%' + muster + '%']
);
rows.forEach((x) =>
  console.log(
    x.name.padEnd(30), '|', x.zutat.padEnd(24), '|',
    String(x.menge_g).padStart(6), 'g', x.abschnitt ? '| ' + x.abschnitt : ''
  )
);
console.log('---', rows.length, 'Treffer');
await pool.end();
