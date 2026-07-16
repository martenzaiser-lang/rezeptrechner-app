// Zutatpreise (€/kg + Lieferant). Ehemals localStorage 'rz_preise'.
// PUT ist Bulk-Upsert — Preise-Modal und BAEKO-CSV-Import schicken
// die geaenderten Eintraege gesammelt.

import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { addLog } from '../services/changelog-service.js';

export const pricesRouter = Router();

pricesRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT zutat_name, preis_eur_kg, lieferant FROM prices ORDER BY zutat_name'
    );
    res.json({ prices: rows });
  } catch (err) {
    next(err);
  }
});

pricesRouter.put('/', requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { prices } = req.body || {};
    if (!Array.isArray(prices) || prices.length === 0) {
      return res.status(400).json({ error: 'prices (Array) erforderlich' });
    }
    await client.query('BEGIN');
    for (const p of prices) {
      const preis = Number(p.preis_eur_kg);
      if (!p.zutat_name || !Number.isFinite(preis)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Ungültiger Preis-Eintrag: ${p?.zutat_name || '?'}` });
      }
      if (p.deleted) {
        await client.query('DELETE FROM prices WHERE zutat_name = $1', [p.zutat_name]);
      } else {
        await client.query(
          `INSERT INTO prices (zutat_name, preis_eur_kg, lieferant) VALUES ($1, $2, $3)
           ON CONFLICT (zutat_name) DO UPDATE
             SET preis_eur_kg = $2, lieferant = $3, updated_at = now()`,
          [p.zutat_name, preis, p.lieferant || null]
        );
      }
    }
    await client.query('COMMIT');
    await addLog(req.authUser.email, 'price', { details: { count: prices.length } });
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});
