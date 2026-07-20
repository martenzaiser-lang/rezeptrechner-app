// Datenfix: "Dinkelvollkorn mit Skyr" ist ein Brot, war in der DB aber
// als Kuchen kategorisiert und wurde dadurch im Blech-Modus (Fläche)
// statt im Stück-Modus (Gewicht) berechnet (mkRezept.js: kategorie
// 'Kuchen' → Default berechnung 'blech').
//
// Setzt kategorie-Spalte UND data.kategorie auf 'Brot' sowie
// data.berechnung auf 'stueck' — genau wie der Rezept-Editor es beim
// Speichern eines Brots erzwingt (RezeptEditorModal: berechnung =
// istKuchen ? form.berechnung : 'stueck').
//
// Idempotent: ist das Rezept schon korrekt, passiert nichts.
// version wird erhöht, damit Clients die Änderung per Polling/ETag sehen.
//
// Aufruf:  cd server && node scripts/fix-dinkelvollkorn-skyr.js

import 'dotenv/config';
import { pool } from '../db.js';

const NAME = 'Dinkelvollkorn mit Skyr';

const { rows } = await pool.query(
  'SELECT id, kategorie, data FROM recipes WHERE name = $1',
  [NAME]
);

if (rows.length === 0) {
  console.error(`FEHLT in DB: ${NAME}`);
  await pool.end();
  process.exit(1);
}

const { id, kategorie, data } = rows[0];
console.log(
  `Vorher: kategorie-Spalte='${kategorie}', data.kategorie='${data.kategorie}', ` +
  `data.berechnung='${data.berechnung || '(leer → blech bei Kuchen)'}'`
);

if (kategorie === 'Brot' && data.kategorie === 'Brot' && data.berechnung === 'stueck') {
  console.log('Schon korrekt — nichts zu tun.');
  await pool.end();
  process.exit(0);
}

await pool.query(
  `UPDATE recipes
   SET kategorie = 'Brot',
       data = data || '{"kategorie": "Brot", "berechnung": "stueck"}'::jsonb,
       version = version + 1, updated_at = now(), updated_by = 'fix-dinkelvollkorn-skyr'
   WHERE id = $1`,
  [id]
);
console.log(`${NAME}: → kategorie 'Brot', berechnung 'stueck' (Stückzahl/Gewicht).`);
await pool.end();
