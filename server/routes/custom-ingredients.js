// Custom-Zutaten (eigene Naehrwerte/Allergene des Admins).
// Ehemals localStorage 'nw_custom' — jetzt in der DB, damit alle Geraete
// dieselben Daten sehen.

import { Router } from 'express';
import { getDataSnapshot } from '../services/data-cache.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { addLog } from '../services/changelog-service.js';
import { transaction, httpError } from '../services/transaction.js';
import { validateCustomIngredient } from '../../shared/validation.js';

export const customIngredientsRouter = Router();

customIngredientsRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { ingredients } = await getDataSnapshot();
    res.json({ ingredients });
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
    const errors = validateCustomIngredient(data);
    if (errors.length) throw httpError(400, errors.join(' '));
    await transaction(async client => {
    await client.query(
      `INSERT INTO custom_ingredients (name, data) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET data = $2, updated_at = now()`,
      [name, JSON.stringify(data)]
    );
    await addLog(req.authUser.email, 'custom_ingredient', { details: { name } }, client);
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

customIngredientsRouter.delete('/:name', requireAdmin, async (req, res, next) => {
  try {
    await transaction(async client => {
    const { rowCount } = await client.query(
      'DELETE FROM custom_ingredients WHERE name = $1',
      [req.params.name]
    );
    if (!rowCount) throw httpError(404, 'Zutat nicht gefunden');
    await addLog(req.authUser.email, 'custom_ingredient', {
      details: { name: req.params.name, deleted: true },
    }, client);
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
