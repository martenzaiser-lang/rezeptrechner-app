import { Router } from 'express';
import { createHash } from 'node:crypto';
import { requireAdmin } from '../middleware/auth.js';
import { transaction, httpError } from '../services/transaction.js';
import { addLog } from '../services/changelog-service.js';
import { makeBackup, validateBackup } from '../../shared/backup.js';

export const backupRouter = Router();
async function snapshot(client) {
  const recipes = (await client.query('SELECT data, version, updated_at FROM recipes ORDER BY name')).rows.map(r => ({ ...r.data, _version: r.version }));
  const cfg = (await client.query('SELECT key, value FROM settings ORDER BY key')).rows;
  const prices = (await client.query('SELECT zutat_name, preis_eur_kg, lieferant FROM prices ORDER BY zutat_name')).rows;
  const customIngredients = (await client.query('SELECT name, data FROM custom_ingredients ORDER BY name')).rows;
  const data = { recipes, settings: Object.fromEntries(cfg.map(r => [r.key, r.value])), prices, customIngredients };
  return { ...data, revision: createHash('sha256').update(JSON.stringify(data)).digest('hex') };
}
backupRouter.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const snap = await transaction(async client => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      return snapshot(client);
    });
    res.json({ backup: makeBackup(snap), revision: snap.revision });
  } catch (err) { next(err); }
});

backupRouter.post('/restore', requireAdmin, async (req, res, next) => {
  try {
    const { backup, expectedRevision } = req.body || {};
    const errors = validateBackup(backup);
    if (errors.length) throw httpError(400, errors.join(' '));
    if (typeof expectedRevision !== 'string') throw httpError(400, 'Aktuelle Wiederherstellungsvorschau erforderlich.');
    await transaction(async client => {
      // Schützt den gesamten Wiederherstellungsvorgang vor parallelen Schreibzugriffen.
      await client.query('LOCK TABLE recipes, settings, prices, custom_ingredients IN SHARE ROW EXCLUSIVE MODE');
      if ((await snapshot(client)).revision !== expectedRevision) throw httpError(409, 'Daten seit der Vorschau geändert. Wiederherstellung abgebrochen; Vorschau neu laden.');
      await client.query('DELETE FROM recipes WHERE NOT (id = ANY($1::text[]))', [backup.rezepte.map(r => r.id)]);
      for (const r of backup.rezepte) {
        const { _version, ...data } = r;
        await client.query(`INSERT INTO recipes (id,name,kategorie,aktiv,data,updated_by) VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (id) DO UPDATE SET name=$2,kategorie=$3,aktiv=$4,data=$5,
          version=recipes.version+1,updated_at=now(),updated_by=$6`,
        [r.id, r.name, r.kategorie || '', r.aktiv !== false, JSON.stringify(data), req.authUser.email]);
      }
      if (backup.cfg !== undefined) {
        await client.query('DELETE FROM settings');
        for (const [key, value] of Object.entries(backup.cfg)) await client.query('INSERT INTO settings (key,value) VALUES ($1,$2)', [key, JSON.stringify(value)]);
      }
      if (backup.prices !== undefined) {
        await client.query('DELETE FROM prices');
        for (const p of backup.prices) if (!p.deleted) await client.query('INSERT INTO prices (zutat_name,preis_eur_kg,lieferant) VALUES ($1,$2,$3)', [p.zutat_name, Number(p.preis_eur_kg), p.lieferant || null]);
      }
      if (backup.customIngredients !== undefined) {
        await client.query('DELETE FROM custom_ingredients');
        for (const c of backup.customIngredients) await client.query('INSERT INTO custom_ingredients (name,data) VALUES ($1,$2)', [c.name, JSON.stringify(c.data)]);
      }
      await addLog(req.authUser.email, 'restore', { details: { recipes: backup.rezepte.length, schemaVersion: backup.schemaVersion || 1 } }, client);
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
