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
  getRezeptAllergene, getRezeptSpuren,
  formatAllergene, getRezeptAllergenStatus, getRezeptZutatenStatus,
} from '../../client/src/lib/calc/naehrwerteLookup.js';
import { getRezeptVerkaufsZutaten, getRezeptKenntlichmachung } from '../../client/src/lib/calc/verkaufsZutaten.js';

import { produktRezept } from '../../client/src/lib/calc/produktion.js';
import { produktNaehrwerte } from '../../client/src/lib/calc/produktNaehrwerte.js';
import { rezeptZutaten, aufgeloesteRezepte } from '../../client/src/lib/calc/rezeptZutaten.js';

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
      "SELECT data, aktiv FROM recipes ORDER BY name"
    );
    const { rows: customRows } = await pool.query(
      'SELECT name, data FROM custom_ingredients'
    );
    const customZutaten = rezeptZutaten(rows.map(r => r.data), customRows);
    const resolved = new Map(aufgeloesteRezepte(rows.map(r => r.data), customZutaten).map(r => [r.id, r]));

    const produkte = rows.filter(r => r.aktiv).flatMap(({ data }) => {
      const namen = data.produkte?.length ? data.produkte.map(p => p.name) : [data.name];
      return namen.map(name => {
        const r = produktRezept(resolved.get(data.id), name);
        const allergene = getRezeptAllergene(r, customZutaten);
        const allergenStatus = getRezeptAllergenStatus(r, customZutaten);
        const zutatenStatus = getRezeptZutatenStatus(r, customZutaten);
        const allergeneText = allergenStatus.vollstaendig ? formatAllergene(allergene,true)
          : 'Allergenangaben unvollständig – Rezeptdaten prüfen.' + (allergene.length ? ' Bekannte Allergene: ' + formatAllergene(allergene,true) : '');
        const spuren = getRezeptSpuren(r, customZutaten).filter(s => !allergene.includes(s));
        const profil = produktNaehrwerte(r, customZutaten);
        const nw = profil.werte;
        const naehrwerte = profil.deklarationVollstaendig ? {
          kj: Math.round(nw.kj), kcal: Math.round(nw.kcal),
          eiweiss_g: +nw.eiweiss.toFixed(1), fett_g: +nw.fett.toFixed(1),
          gesaettigte_fettsaeuren_g: +nw.gfs.toFixed(1), kohlenhydrate_g: +nw.kh.toFixed(1),
          zucker_g: +nw.zucker.toFixed(1), ballaststoffe_g: nw.ballaststoffe == null ? null : +nw.ballaststoffe.toFixed(1), salz_g: +nw.salz.toFixed(2),
        } : null;
        return { name:r.name, kategorie:r.kategorie || '', allergene, allergeneText,
          allergeneVollstaendig:allergenStatus.vollstaendig,
          zutatenVollstaendig:zutatenStatus.vollstaendig,
          deklarationVollstaendig:profil.deklarationVollstaendig,
          deklarationsFehler:profil.deklarationsFehler,
          spuren, spurenText:formatAllergene(spuren,true), zutatenverzeichnis:zutatenStatus.vollstaendig ? getRezeptVerkaufsZutaten(r,customZutaten) : [],
          kenntlichmachung:zutatenStatus.vollstaendig ? getRezeptKenntlichmachung(r,customZutaten) : [], naehrwerte,
          naehrwerteBezug:profil.deklarationVollstaendig ? profil.bezug : 'Unvollständige Daten: ' + profil.deklarationsFehler.join(', '),
        };
      });
    });

    res.json({ stand: new Date().toISOString(), anzahl: produkte.length, produkte });
  } catch (err) {
    next(err);
  }
});
