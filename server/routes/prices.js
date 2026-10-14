// Zutatpreise (€/kg + Lieferant). Ehemals localStorage 'rz_preise'.
// PUT ist Bulk-Upsert — Preise-Modal und BAEKO-CSV-Import schicken
// die geaenderten Eintraege gesammelt.

import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { addLog } from '../services/changelog-service.js';
import { validatePrices } from '../../shared/validation.js';

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
  let client;
  try {
    client = await pool.connect();
    const { prices } = req.body || {};
    const errors = validatePrices(prices);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });
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
    await addLog(req.authUser.email, 'price', { details: { count: prices.length } }, client);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client?.release();
  }
});
