import { afterAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createTestPostgres } from './postgres.js';

const { db, pool } = await createTestPostgres();
afterAll(() => pool.end());
const sql = readFileSync(new URL('../migrations/002_ciabatta_grundteiggewicht.sql', import.meta.url), 'utf8');

it('stellt nur die vorgesehenen Varianten um und sichert den vorigen Rezeptstand', async () => {
  const data = { id: 'mmir9dvq16fh', name: 'Baguetteteig',
    produkte: ['Ciabatta', 'Olivenciabatta', 'Tomatenciabatta', 'Körnerciabatta', 'Schokobaguette']
      .map(name => ({ name, gewicht_g: 5000, stueck_pro_presse: 1 })),
    zutaten: [{ name: 'Mehl', menge_kg: 1 }, { name: 'Urstückteig', menge_kg: 0,
      zusatz_prozent: 22.22, prozent_bezug: 'endprodukt', fuer_produkte: ['Körnerciabatta'] }], anmerkungen: 'Erhalten' };
  const anderes = { ...data, id: 'anderes-rezept' };
  for (const r of [data, anderes]) await pool.query(
    'INSERT INTO recipes (id, name, data, version) VALUES ($1, $2, $3, 7)', [r.id, r.name, JSON.stringify(r)]);

  await db.exec(sql);
  const { rows } = await pool.query('SELECT data, version FROM recipes WHERE id = $1', [data.id]);
  const result = rows[0];
  expect(result.version).toBe(8);
  expect(result.data).toEqual({ ...data, zutaten: [data.zutaten[0], { ...data.zutaten[1], prozent_bezug: 'basisteig' }], produkte: data.produkte.map(p =>
    ['Olivenciabatta', 'Tomatenciabatta', 'Körnerciabatta', 'Schokobaguette'].includes(p.name)
      ? { ...p, gewicht_bezug: 'basisteig' } : p) });
  expect((await pool.query('SELECT data, version FROM recipes WHERE id = $1', [anderes.id])).rows[0])
    .toEqual({ data: anderes, version: 7 });
  const log = (await pool.query('SELECT details FROM change_log')).rows;
  expect(log).toHaveLength(1);
  expect(log[0].details).toMatchObject({ vorher: data, vorher_version: 7 });

  // Auch ein versehentlicher zweiter Aufruf darf keine weitere Änderung machen.
  await db.exec(sql);
  expect((await pool.query('SELECT version FROM recipes WHERE id = $1', [data.id])).rows[0].version).toBe(8);
  expect((await pool.query('SELECT id FROM change_log')).rows).toHaveLength(1);
});
