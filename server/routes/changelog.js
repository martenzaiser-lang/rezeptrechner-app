// Aenderungsprotokoll (nur Admin, lesend — Eintraege schreibt der Server
// automatisch bei Mutationen).

import { Router } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

export const changelogRouter = Router();

changelogRouter.get('/', requireAdmin, async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(Number.parseInt(req.query.limit, 10) || 200, 1000));
    const beforeId = req.query.beforeId;
    if (beforeId != null && !/^[1-9]\d*$/.test(String(beforeId))) return res.status(400).json({ error: 'beforeId muss eine positive Eintrags-ID sein.' });
    const { rows } = await pool.query(
      `SELECT id, ts, user_email, action, recipe_id, recipe_name, details
       FROM change_log WHERE ($2::integer IS NULL OR id < $2) ORDER BY id DESC LIMIT $1`,
      [limit, beforeId || null]
    );
    res.json({ entries: rows, nextBeforeId: rows.length === limit ? rows.at(-1).id : null });
  } catch (err) {
    next(err);
  }
});
