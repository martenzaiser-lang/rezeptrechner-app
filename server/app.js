// Express-App (ohne listen) — getrennt vom Server-Start, damit
// supertest die App direkt testen kann.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { getDataSnapshot } from './services/data-cache.js';
import { authRouter } from './routes/auth.js';
import { recipesRouter } from './routes/recipes.js';
import { settingsRouter } from './routes/settings.js';
import { customIngredientsRouter } from './routes/custom-ingredients.js';
import { pricesRouter } from './routes/prices.js';
import { changelogRouter } from './routes/changelog.js';
import { lmivRouter } from './routes/lmiv.js';
import { backupRouter } from './routes/backup.js';

export const app = express();

// Render sitzt hinter einem Proxy — noetig, damit Rate-Limit die echte
// Client-IP sieht (X-Forwarded-For) statt der Proxy-IP.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    // Mehrere Origins erlaubt (Test-Site + spaeter teigmaster), kommasepariert.
    origin: config.CORS_ORIGIN.split(',').map((s) => s.trim()),
    exposedHeaders: ['ETag'],
  })
);
app.use(express.json({ limit: '5mb' }));

// Login-Bruteforce bremsen; normale API-Calls grosszuegig.
// In Tests deaktiviert (parallele Requests wuerden das Limit reissen).
if (config.NODE_ENV !== 'test') {
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
  app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 300 }));
}

// Dieselbe DB-Prüfung wie die Leser verwenden: häufige Healthchecks dürfen
// Neon nicht dauerhaft wach halten. Zeitpunkt der letzten Prüfung offenlegen.
app.get('/api/health', async (_req, res) => {
  try {
    const { checkedAt } = await getDataSnapshot();
    res.json({ ok: true, db: true, dbCheckedAt: new Date(checkedAt).toISOString(), version: process.env.RENDER_GIT_COMMIT || 'lokal' });
  } catch (err) {
    res.status(503).json({ ok: false, db: false });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/custom-ingredients', customIngredientsRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/changelog', changelogRouter);
app.use('/api/lmiv', lmivRouter);
app.use('/api/backup', backupRouter);

// Zentraler Error-Handler
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: status >= 500 ? 'Serverfehler. Bitte erneut versuchen.' : err.message, ...(status < 500 ? err.details : {}) });
});
