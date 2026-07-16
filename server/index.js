// Express-Backend für den Rezeptrechner.
// Architektur-Muster aus der Etiketten-App: Helmet, CORS, Rate-Limit,
// JWT-Auth, zentraler Error-Handler.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { pool } from './db.js';

const app = express();

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
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 300 }));

// Health: prueft auch die DB-Verbindung (Cloud-Status-Indicator im Client).
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: true });
  } catch (err) {
    res.status(503).json({ ok: false, db: false, error: err.message });
  }
});

// Router werden in Phase 1 ergänzt (auth, recipes, settings, prices, ...).

// Zentraler Error-Handler
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Interner Fehler' });
});

app.listen(config.PORT, () => {
  console.log(`[server] Rezeptrechner-API läuft auf Port ${config.PORT} (${config.NODE_ENV})`);
});
