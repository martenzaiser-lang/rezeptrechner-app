// Aenderungsprotokoll (nur Admin, lesend — Eintraege schreibt der Server
// automatisch bei Mutationen).

import { Router } from 'express';
import { pool } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

export const changelogRouter = Router();

changelogRouter.get('/', requireAdmin, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const { rows } = await pool.query(
      `SELECT ts, user_email, action, recipe_id, recipe_name, details
       FROM change_log ORDER BY ts DESC LIMIT $1`,
      [limit]
    );
    res.json({ entries: rows });
  } catch (err) {
    next(err);
  }
});
