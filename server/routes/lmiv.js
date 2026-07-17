// LMIV-Endpunkt fuer externe Apps (Personalplaner): Naehrwerte,
// Zutatenverzeichnis (nur Namen, LMIV-konform absteigend — OHNE Mengen,
// Prozente oder sonstige Rezeptdetails!) und Allergene je aktivem Produkt.
//
// Auth: eigener API-Key (Header X-Api-Key, Env LMIV_API_KEY) — bewusst
// getrennt vom Benutzer-Login, damit der Personalplaner keinen
// Rezeptrechner-Account braucht und niemals an Rezepte kommt.
//
// Die Berechnung nutzt DIESELBEN Module wie der Client (npm-Workspace:
// ../client/src/lib + /data) — eine Quelle der Wahrheit.

import { Router } from 'express';
import { timingSafeEqual, createHash } from 'node:crypto';
import { pool } from '../db.js';
import {
  getRezeptAllergene, getRezeptSpuren, getRezeptLmivZutaten,
  formatAllergene, berechneNaehrwerte,
} from '../../client/src/lib/calc/naehrwerteLookup.js';

export const lmivRouter = Router();

function safeEquals(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

function requireApiKey(req, res, next) {
  const key = process.env.LMIV_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'LMIV-API nicht konfiguriert (LMIV_API_KEY fehlt)' });
  }
  if (!req.headers['x-api-key'] || !safeEquals(req.headers['x-api-key'], key)) {
    return res.status(401).json({ error: 'Ungültiger API-Key' });
  }
  next();
}

/**
 * GET /api/lmiv  (Header: X-Api-Key)
 * → { produkte: [{ name, kategorie, allergene, allergeneText, spuren,
 *      spurenText, zutatenverzeichnis, naehrwerte, naehrwerteBezug }] }
 */
lmivRouter.get('/', requireApiKey, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT data FROM recipes WHERE aktiv = true ORDER BY name"
    );
    const { rows: customRows } = await pool.query(
      'SELECT name, data FROM custom_ingredients'
    );
    const customZutaten = customRows.map((c) => ({ name: c.name, ...c.data }));

    const produkte = rows.map(({ data: r }) => {
      const allergene = getRezeptAllergene(r, customZutaten);
      const spuren = getRezeptSpuren(r).filter((s) => !allergene.includes(s));

      // Zutatenverzeichnis: NUR Namen in absteigender Reihenfolge (LMIV),
      // Herstellerprodukte mit Verkehrsbezeichnung + Unterzutaten.
      // KEINE Mengen/Anteile — das Rezept bleibt im Haus.
      const zutatenverzeichnis = getRezeptLmivZutaten(r).map((z) => ({
        name: z.name,
        bezeichnung: z.bezeichnung || null,
        unterzutaten: z.lmiv ? z.lmiv.replace(/<\/?b>/g, '').trim() : null,
      }));

      const nwTeig = berechneNaehrwerte(r, customZutaten);
      const bv = r.backverlust_pct || 0;
      const faktor = bv > 0 && bv < 100 ? 100 / (100 - bv) : 1;
      const naehrwerte =
        nwTeig && nwTeig.fehlend.length === 0
          ? {
              kcal: Math.round(nwTeig.kcal * faktor),
              eiweiss_g: +(nwTeig.eiweiss * faktor).toFixed(1),
              fett_g: +(nwTeig.fett * faktor).toFixed(1),
              gesaettigte_fettsaeuren_g: +(nwTeig.gfs * faktor).toFixed(1),
              kohlenhydrate_g: +(nwTeig.kh * faktor).toFixed(1),
              zucker_g: +(nwTeig.zucker * faktor).toFixed(1),
              ballaststoffe_g: +(nwTeig.ballaststoffe * faktor).toFixed(1),
              salz_g: +(nwTeig.salz * faktor).toFixed(2),
            }
          : null;

      return {
        name: r.name,
        kategorie: r.kategorie || '',
        allergene,
        allergeneText: formatAllergene(allergene, true),
        spuren,
        spurenText: formatAllergene(spuren, true),
        zutatenverzeichnis,
        naehrwerte,
        naehrwerteBezug: naehrwerte
          ? (bv > 0 ? `pro 100 g gebacken (Backverlust ${bv}%)` : 'pro 100 g Teig — Backverlust nicht gepflegt')
          : 'unvollständige Daten',
      };
    });

    res.json({ stand: new Date().toISOString(), anzahl: produkte.length, produkte });
  } catch (err) {
    next(err);
  }
});
