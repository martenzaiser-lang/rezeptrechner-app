import { Router } from 'express';
import { getDataSnapshot } from '../services/data-cache.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { addLog } from '../services/changelog-service.js';
import { transaction, httpError } from '../services/transaction.js';
import { validateRecipe } from '../../shared/validation.js';

export const recipesRouter = Router();
const check = r => { const errors = validateRecipe(r); if (errors.length) throw httpError(400, errors.join(' ')); };
const clean = r => { const { _version, ...data } = r; return data; };
const params = (r, user) => [r.id, r.name, r.kategorie || '', r.aktiv !== false, JSON.stringify(clean(r)), user];

recipesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const snapshot = await getDataSnapshot();
    const rows = snapshot.recipes;
    const etag = '"' + snapshot.revisions.recipes + '"';
    res.set('ETag', etag);
    res.set('Cache-Control', 'private, no-cache');
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.json({ recipes: rows.map(r => ({ ...r.data, _version: r.version })), updatedAt: rows.reduce((m, r) => r.updated_at > m ? r.updated_at : m, null) });
  } catch (err) { next(err); }
});

recipesRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const r = req.body; check(r);
    const result = await transaction(async client => {
      const { rows } = await client.query(`INSERT INTO recipes (id, name, kategorie, aktiv, data, updated_by)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING RETURNING version`, params(r, req.authUser.email));
      if (!rows.length) throw httpError(409, 'Rezept-ID existiert bereits');
      await addLog(req.authUser.email, 'new', { recipeId: r.id, recipeName: r.name }, client);
      return rows[0];
    });
    res.status(201).json({ ok: true, version: result.version, recipe: { ...clean(r), _version: result.version } });
  } catch (err) { next(err); }
});

recipesRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const r = req.body; check(r);
    if (r.id !== req.params.id || !Number.isInteger(r._version) || r._version < 1) throw httpError(400, 'Rezept-ID oder _version ungültig');
    const result = await transaction(async client => {
      const { rows } = await client.query(`UPDATE recipes SET name=$2, kategorie=$3, aktiv=$4, data=$5,
        version=version+1, updated_at=now(), updated_by=$6 WHERE id=$1 AND version=$7 RETURNING version`, [...params(r, req.authUser.email), r._version]);
      if (!rows.length) {
        const { rows: current } = await client.query('SELECT data, version FROM recipes WHERE id = $1', [r.id]);
        if (!current.length) throw httpError(404, 'Rezept nicht gefunden');
        throw httpError(409, 'Rezept wurde zwischenzeitlich geändert', { current: { ...current[0].data, _version: current[0].version } });
      }
      await addLog(req.authUser.email, 'edit', { recipeId: r.id, recipeName: r.name }, client);
      return rows[0];
    });
    res.json({ ok: true, version: result.version, recipe: { ...clean(r), _version: result.version } });
  } catch (err) { next(err); }
});

recipesRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const version = req.body?._version;
    if (!Number.isInteger(version) || version < 1) throw httpError(400, '_version erforderlich');
    await transaction(async client => {
      const { rows } = await client.query('DELETE FROM recipes WHERE id = $1 AND version = $2 RETURNING name', [req.params.id, version]);
      if (!rows.length) throw httpError(409, 'Rezept wurde geändert oder gelöscht. Bitte neu laden.');
      await addLog(req.authUser.email, 'del', { recipeId: req.params.id, recipeName: rows[0].name }, client);
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

recipesRouter.post('/bulk', requireAdmin, async (req, res, next) => {
  try {
    const { recipes, mode = 'upsert' } = req.body || {};
    if (mode !== 'upsert') throw httpError(400, 'Vollständige Wiederherstellung über die Sicherungs-Vorschau ausführen.');
    if (!Array.isArray(recipes) || !recipes.length || recipes.length > 5000) throw httpError(400, 'recipes (1–5000 Rezepte) erforderlich');
    recipes.forEach(check);
    if (new Set(recipes.map(r => r.id)).size !== recipes.length) throw httpError(400, 'Doppelte Rezept-IDs im Import');
    const result = await transaction(async client => {
      let inserted = 0, updated = 0;
      for (const r of recipes) {
        const { rows } = await client.query(`INSERT INTO recipes (id, name, kategorie, aktiv, data, updated_by)
          VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET name=$2, kategorie=$3, aktiv=$4,
          data=$5, version=recipes.version+1, updated_at=now(), updated_by=$6
          WHERE recipes.version=$7 RETURNING (xmax = 0) AS is_insert`, [...params(r, req.authUser.email), r._version ?? 0]);
        if (!rows.length) throw httpError(409, `„${r.name}“ wurde geändert oder vor der Vorschau nicht geladen. Import abgebrochen; Vorschau neu öffnen.`);
        if (rows[0].is_insert) inserted++; else updated++;
      }
      await addLog(req.authUser.email, 'import', { details: { inserted, updated, total: recipes.length } }, client);
      return { inserted, updated };
    });
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});
