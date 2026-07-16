// Custom-Zutaten (eigene Naehrwerte/Allergene des Admins).
// Ehemals localStorage 'nw_custom' — jetzt in der DB, damit alle Geraete
// dieselben Daten sehen.

import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { addLog } from '../services/changelog-service.js';

export const customIngredientsRouter = Router();

customIngredientsRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT name, data FROM custom_ingredients ORDER BY name'
    );
    res.json({ ingredients: rows });
  } catch (err) {
    next(err);
  }
});

customIngredientsRouter.put('/:name', requireAdmin, async (req, res, next) => {
  try {
    const name = req.params.name.trim();
    const data = req.body;
    if (!name || !data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Name und Daten erforderlich' });
    }
    await pool.query(
      `INSERT INTO custom_ingredients (name, data) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET data = $2, updated_at = now()`,
      [name, JSON.stringify(data)]
    );
    await addLog(req.authUser.email, 'custom_ingredient', { details: { name } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

customIngredientsRouter.delete('/:name', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM custom_ingredients WHERE name = $1',
      [req.params.name]
    );
    if (!rowCount) return res.status(404).json({ error: 'Zutat nicht gefunden' });
    await addLog(req.authUser.email, 'custom_ingredient', {
      details: { name: req.params.name, deleted: true },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
