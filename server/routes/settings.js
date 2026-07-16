// Einstellungen (Baeckerei-Name etc.) als Key/Value-JSONB.
// Lesen: alle Rollen. Schreiben: Admin.

import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { addLog } from '../services/changelog-service.js';

export const settingsRouter = Router();

settingsRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

settingsRouter.put('/', requireAdmin, async (req, res, next) => {
  try {
    const settings = req.body || {};
    const keys = Object.keys(settings);
    if (!keys.length) {
      return res.status(400).json({ error: 'Keine Einstellungen übergeben' });
    }
    for (const key of keys) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
        [key, JSON.stringify(settings[key])]
      );
    }
    await addLog(req.authUser.email, 'settings', { details: { keys } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
