import { afterAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createTestPostgres } from './postgres.js';
import { validateRecipe } from '../../shared/validation.js';
import { skaliere, skaliereByFactor } from '../../client/src/lib/calc/skalierung.js';
import { gruppiereZutaten } from '../../client/src/lib/calc/sektionen.js';

const { db, pool } = await createTestPostgres();
afterAll(() => pool.end());
const sql = readFileSync(new URL('../migrations/003_dinkel_feta.sql', import.meta.url), 'utf8');

it('übernimmt die Fotomengen, trennt Poolish und skaliert auf 600 g inklusive Feta', async () => {
  await db.exec(sql);
  const { data: r } = (await pool.query('SELECT data FROM recipes')).rows[0];
  expect(validateRecipe(r)).toEqual([]);
  const charge = skaliereByFactor(r, 1);
  expect(charge.reduce((a, b) => a + b, 0)).toBeCloseTo(24.22, 8);
  const sections = gruppiereZutaten(r, charge);
  expect(sections.map(s => s.name)).toEqual(['Vorteig (Poolish)', 'Hauptteig', 'Feta-Zugabe']);
  expect(sections[0].sum).toBeCloseTo(5.01, 8);
  expect(sections[2].sum).toBe(3);
  const einBrot = skaliere(r, 1);
  expect(einBrot.reduce((a, b) => a + b, 0)).toBeCloseTo(0.6, 8);
  expect(einBrot[12]).toBeCloseTo(3 / 24.22 * 0.6, 8);
  expect(r.backverlust_pct).toBeNull();
});

it('erhält spätere Bearbeitungen bei erneutem Ausführen und protokolliert nur einmal', async () => {
  await pool.query("UPDATE recipes SET data = jsonb_set(data, '{anmerkungen}', '\"Später bearbeitet\"'), version = 2");
  await db.exec(sql);
  const rows = (await pool.query('SELECT data, version FROM recipes')).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0].version).toBe(2);
  expect(rows[0].data.anmerkungen).toBe('Später bearbeitet');
  expect((await pool.query('SELECT action FROM change_log')).rows).toEqual([{ action: 'new' }]);
});

it('legt bei bereits vorhandenem gleichnamigem Rezept mit anderer ID keine Dublette an', async () => {
  await pool.query('DELETE FROM recipes');
  await pool.query("INSERT INTO recipes (id, name, data) VALUES ('vorhanden', 'Dinkel Feta', '{\"anmerkungen\":\"Erhalten\"}')");
  await db.exec(sql);
  expect((await pool.query('SELECT id, data FROM recipes')).rows).toEqual([
    { id: 'vorhanden', data: { anmerkungen: 'Erhalten' } },
  ]);
  expect((await pool.query('SELECT id FROM change_log')).rows).toHaveLength(1);
});
