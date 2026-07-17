// Berechnet Nährwerte/Allergene für Zutaten, die in Wahrheit EIGENE
// REZEPTE sind (laut Marten 2026-07-17):
//   Zutat 'Brotmischung'/'Mischung' = Rezept 'Brotmischung'
//   Zutat 'Urstückteig'             = Rezept 'Urstück'
//     (Urstück enthält selbst 'Brotmischung' → Reihenfolge wichtig,
//      der berechnete Brotmischung-Wert wird injiziert)
//
// Die Werte werden pro 100 g der ROHEN Mischung/des Teigs berechnet
// (kein Backverlust — die Zutat geht roh in den Zielteig) und als
// seed-fertige Zeilen für seed-naehrwerte-ergaenzungen.js ausgegeben.
// Nach einer Rezeptänderung an Urstück/Brotmischung: dieses Skript neu
// laufen lassen, Seed-Werte aktualisieren, Seed erneut ausführen.
//
// Aufruf:  cd server && node scripts/berechne-rezept-zutaten.js

import dotenv from 'dotenv';
import pg from 'pg';
import {
  berechneNaehrwerte, getRezeptAllergene, getRezeptSpuren,
} from '../../client/src/lib/calc/naehrwerteLookup.js';

dotenv.config();

// [Rezeptname, [Zutatennamen, unter denen das Ergebnis injiziert wird]]
// — Reihenfolge = Abhängigkeitsreihenfolge!
const KETTE = [
  ['Brotmischung', ['Brotmischung', 'Mischung']],
  ['Urstück', ['Urstückteig']],
];

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL fehlt (server/.env) — Abbruch.');
  process.exit(1);
}
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: process.env.DATABASE_URL.includes('neon.tech') },
});

const { rows } = await pool.query(
  'SELECT data FROM recipes WHERE name = ANY($1)', [KETTE.map(([n]) => n)]
);
const { rows: customRows } = await pool.query(
  'SELECT name, data FROM custom_ingredients'
);
const customZutaten = customRows.map((c) => ({ name: c.name, ...c.data }));
await pool.end();

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

for (const [name, aliase] of KETTE) {
  const rezept = rows.map((r) => r.data).find((r) => r.name === name);
  console.log(`\n══ Rezept "${name}" → Zutat(en) ${aliase.join(', ')} ══`);
  if (!rezept) { console.log('  NICHT GEFUNDEN!'); continue; }

  const nw = berechneNaehrwerte(rezept, customZutaten);
  const allergene = getRezeptAllergene(rezept, customZutaten);
  const spuren = getRezeptSpuren(rezept).filter((s) => !allergene.includes(s));

  if (!nw) { console.log('  keine Mengen — nicht berechenbar'); continue; }
  if (nw.fehlend.length) {
    console.log(`  ACHTUNG, fehlende Zutaten (Werte unvollständig!): ${nw.fehlend.join(', ')}`);
  }
  console.log(`  Zutaten aufgelöst: ${nw.gefunden}, Allergene: [${allergene.join(',')}], Spuren (gehen im Seed verloren!): [${spuren.join(',')}]`);
  console.log(`  nw(${Math.round(nw.kcal)}, ${r1(nw.eiweiss)}, ${r1(nw.fett)}, ${r1(nw.gfs)}, ${r1(nw.kh)}, ${r1(nw.zucker)}, ${r1(nw.ballaststoffe)}, ${r2(nw.salz)}, [${allergene.map((a) => `'${a}'`).join(', ')}], '...')`);

  // Ergebnis für nachfolgende Rezepte als Custom-Zutat bereitstellen
  for (const alias of aliase) {
    customZutaten.push({
      name: alias,
      kcal: nw.kcal, eiweiss: nw.eiweiss, fett: nw.fett, gfs: nw.gfs,
      kh: nw.kh, zucker: nw.zucker, ballaststoffe: nw.ballaststoffe,
      salz: nw.salz, a: allergene, allergene,
    });
  }
}
