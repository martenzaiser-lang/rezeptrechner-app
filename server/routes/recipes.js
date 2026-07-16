// Rezept-Endpoints.
//
// - GET liefert alle Rezepte mit ETag (aus max(updated_at) + count):
//   der Client pollt alle 90 s; bei unveraendertem Stand kommt 304.
// - PUT prueft den mitgeschickten version-Zaehler (optimistische Sperre):
//   bei Mismatch 409 mit aktuellem Serverstand (Client zeigt Konfliktdialog).
// - Schreiben ist Admin-only.

import { Router } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { addLog } from '../services/changelog-service.js';

export const recipesRouter = Router();

// Rezept-Objekt: bewusst lose validiert (Struktur kommt 1:1 aus der alten
// App und enthaelt viele optionale Felder) — nur das Noetigste hart pruefen.
const recipeSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(300),
  kategorie: z.string().max(100).optional().default(''),
  aktiv: z.boolean().optional().default(true),
}).passthrough();

async function computeEtag() {
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(updated_at)::TEXT, '') AS max_ts, COUNT(*)::TEXT AS cnt FROM recipes`
  );
  const raw = `${rows[0].max_ts}|${rows[0].cnt}`;
  return '"' + createHash('sha1').update(raw).digest('hex').slice(0, 20) + '"';
}

/**
 * GET /api/recipes — alle Rezepte (alle Rollen; Rollen-Filterung ist wie
 * in der alten App UI-Sache). ETag/If-None-Match → 304.
 */
recipesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const etag = await computeEtag();
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    const { rows } = await pool.query(
      'SELECT data, version, updated_at FROM recipes ORDER BY name'
    );
    res.set('ETag', etag);
    res.json({
      recipes: rows.map((r) => ({ ...r.data, _version: r.version })),
      updatedAt: rows.length
        ? rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), rows[0].updated_at)
        : null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/recipes — neues Rezept (Admin).
 */
recipesRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const parsed = recipeSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültiges Rezept (id und name erforderlich)' });
    }
    const recipe = parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO recipes (id, name, kategorie, aktiv, data, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING
       RETURNING version`,
      [recipe.id, recipe.name, recipe.kategorie || '', recipe.aktiv !== false,
       JSON.stringify(recipe), req.authUser.email]
    );
    if (!rows.length) {
      return res.status(409).json({ error: 'Rezept-ID existiert bereits' });
    }
    await addLog(req.authUser.email, 'new', { recipeId: recipe.id, recipeName: recipe.name });
    res.status(201).json({ ok: true, version: rows[0].version });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/recipes/:id — Rezept aktualisieren (Admin).
 * Body: Rezept-Objekt + _version (der beim Lesen erhaltene Stand).
 */
recipesRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const clientVersion = Number(body._version);
    delete body._version;

    const parsed = recipeSchema.safeParse(body);
    if (!parsed.success || parsed.data.id !== req.params.id) {
      return res.status(400).json({ error: 'Ungültiges Rezept' });
    }
    if (!Number.isInteger(clientVersion)) {
      return res.status(400).json({ error: '_version fehlt' });
    }
    const recipe = parsed.data;

    const { rows } = await pool.query(
      `UPDATE recipes
       SET name = $2, kategorie = $3, aktiv = $4, data = $5,
           version = version + 1, updated_at = now(), updated_by = $6
       WHERE id = $1 AND version = $7
       RETURNING version`,
      [recipe.id, recipe.name, recipe.kategorie || '', recipe.aktiv !== false,
       JSON.stringify(recipe), req.authUser.email, clientVersion]
    );

    if (!rows.length) {
      // Version-Mismatch oder Rezept geloescht → aktuellen Stand mitliefern.
      const { rows: current } = await pool.query(
        'SELECT data, version FROM recipes WHERE id = $1',
        [recipe.id]
      );
      if (!current.length) {
        return res.status(404).json({ error: 'Rezept nicht gefunden' });
      }
      return res.status(409).json({
        error: 'Rezept wurde zwischenzeitlich geändert',
        current: { ...current[0].data, _version: current[0].version },
      });
    }

    await addLog(req.authUser.email, 'edit', { recipeId: recipe.id, recipeName: recipe.name });
    res.json({ ok: true, version: rows[0].version });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/recipes/:id (Admin)
 */
recipesRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM recipes WHERE id = $1 RETURNING name',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Rezept nicht gefunden' });
    }
    await addLog(req.authUser.email, 'del', { recipeId: req.params.id, recipeName: rows[0].name });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/recipes/bulk — Import (Excel/JSON/Migration), Admin.
 * Body: { recipes: [...], mode: 'upsert' | 'replace' }
 * - upsert: Update-by-ID, neue werden angelegt (Standard fuer Excel-Import)
 * - replace: kompletter Austausch (nur Migration/JSON-Restore)
 * Atomar in einer Transaktion.
 */
recipesRouter.post('/bulk', requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { recipes, mode = 'upsert' } = req.body || {};
    if (!Array.isArray(recipes) || recipes.length === 0) {
      return res.status(400).json({ error: 'recipes (Array) erforderlich' });
    }
    for (const r of recipes) {
      if (!recipeSchema.safeParse(r).success) {
        return res.status(400).json({ error: `Ungültiges Rezept im Import: ${r?.name || r?.id || '?'}` });
      }
    }

    await client.query('BEGIN');
    if (mode === 'replace') {
      await client.query('DELETE FROM recipes');
    }
    let inserted = 0;
    let updated = 0;
    for (const r of recipes) {
      const result = await client.query(
        `INSERT INTO recipes (id, name, kategorie, aktiv, data, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE
           SET name = $2, kategorie = $3, aktiv = $4, data = $5,
               version = recipes.version + 1, updated_at = now(), updated_by = $6
         RETURNING (xmax = 0) AS is_insert`,
        [r.id, r.name, r.kategorie || '', r.aktiv !== false, JSON.stringify(r), req.authUser.email]
      );
      if (result.rows[0].is_insert) inserted++;
      else updated++;
    }
    await client.query('COMMIT');

    await addLog(req.authUser.email, 'import', {
      details: { mode, inserted, updated, total: recipes.length },
    });
    res.json({ ok: true, inserted, updated });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});
