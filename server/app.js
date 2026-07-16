// Express-App (ohne listen) — getrennt vom Server-Start, damit
// supertest die App direkt testen kann.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { pool } from './db.js';
import { authRouter } from './routes/auth.js';
import { recipesRouter } from './routes/recipes.js';
import { settingsRouter } from './routes/settings.js';
import { customIngredientsRouter } from './routes/custom-ingredients.js';
import { pricesRouter } from './routes/prices.js';
import { changelogRouter } from './routes/changelog.js';

export const app = express();

// Render sitzt hinter einem Proxy — noetig, damit Rate-Limit die echte
// Client-IP sieht (X-Forwarded-For) statt der Proxy-IP.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    // Mehrere Origins erlaubt (Test-Site + spaeter teigmaster), kommasepariert.
    origin: config.CORS_ORIGIN.split(',').map((s) => s.trim()),
  })
);
app.use(express.json({ limit: '5mb' }));

// Login-Bruteforce bremsen; normale API-Calls grosszuegig.
// In Tests deaktiviert (parallele Requests wuerden das Limit reissen).
if (config.NODE_ENV !== 'test') {
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
  app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 300 }));
}

// Health: prueft auch die DB-Verbindung (Cloud-Status-Indicator im Client).
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: true });
  } catch (err) {
    res.status(503).json({ ok: false, db: false, error: err.message });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/custom-ingredients', customIngredientsRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/changelog', changelogRouter);

// Zentraler Error-Handler
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Interner Fehler' });
});
