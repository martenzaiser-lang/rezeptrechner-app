// Legt den Render-Service "rezeptrechner-api" per Render-API an
// (Spiegel der render.yaml) und wartet, bis das erste Deploy live ist.
// Braucht RENDER_API_KEY + DATABASE_URL in server/.env.
//
// Aufruf: node scripts/deploy-render.js

import 'dotenv/config';
import { randomBytes } from 'node:crypto';

const KEY = process.env.RENDER_API_KEY;
if (!KEY) {
  console.error('RENDER_API_KEY fehlt in server/.env');
  process.exit(1);
}
const API = 'https://api.render.com/v1';
const HEADERS = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const NETLIFY_URL = 'https://teigmaster-neu.netlify.app';
const SERVICE_NAME = 'rezeptrechner-api';

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  return json;
}

// 1. Owner ermitteln
const owners = await api('GET', '/owners?limit=10');
const owner = owners[0]?.owner;
if (!owner) {
  console.error('Kein Render-Owner gefunden — API-Key pruefen.');
  process.exit(1);
}
console.log(`[render] Owner: ${owner.name} (${owner.id})`);

// 2. Existiert der Service schon?
const existing = await api('GET', `/services?name=${SERVICE_NAME}&limit=5`);
let service = existing.find((s) => s.service?.name === SERVICE_NAME)?.service;

if (service) {
  console.log(`[render] Service existiert bereits: ${service.id}`);
} else {
  // 3. Service anlegen (wie render.yaml)
  const jwtSecret = randomBytes(48).toString('hex');
  const body = {
    type: 'web_service',
    name: SERVICE_NAME,
    ownerId: owner.id,
    repo: 'https://github.com/martenzaiser-lang/rezeptrechner-app',
    branch: 'main',
    autoDeploy: 'yes',
    rootDir: 'server',
    serviceDetails: {
      runtime: 'node',
      region: 'frankfurt',
      plan: 'free',
      healthCheckPath: '/api/health',
      envSpecificDetails: {
        buildCommand: 'npm install',
        startCommand: 'npm run migrate && npm run start',
      },
    },
    envVars: [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'DATABASE_URL', value: process.env.DATABASE_URL },
      { key: 'JWT_SECRET', value: jwtSecret },
      { key: 'JWT_EXPIRES_IN', value: '7d' },
      { key: 'CORS_ORIGIN', value: NETLIFY_URL },
    ],
  };
  try {
    const created = await api('POST', '/services', body);
    service = created.service || created;
  } catch (err) {
    // Aeltere API-Variante: "env" statt "runtime"
    if (String(err.message).includes('runtime')) {
      body.serviceDetails.env = 'node';
      delete body.serviceDetails.runtime;
      const created = await api('POST', '/services', body);
      service = created.service || created;
    } else {
      throw err;
    }
  }
  console.log(`[render] Service angelegt: ${service.id}`);
}

const url = service.serviceDetails?.url || `https://${SERVICE_NAME}.onrender.com`;
console.log(`[render] URL: ${url}`);

// 4. Auf das erste Live-Deploy warten (Build dauert einige Minuten)
const start = Date.now();
while (Date.now() - start < 15 * 60 * 1000) {
  const deploys = await api('GET', `/services/${service.id}/deploys?limit=1`);
  const d = deploys[0]?.deploy;
  const status = d?.status || 'unbekannt';
  process.stdout.write(`[render] Deploy-Status: ${status}          \r`);
  if (status === 'live') {
    console.log(`\n[render] LIVE nach ${Math.round((Date.now() - start) / 1000)}s`);
    process.exit(0);
  }
  if (['build_failed', 'update_failed', 'canceled'].includes(status)) {
    console.error(`\n[render] Deploy fehlgeschlagen: ${status} — Logs im Render-Dashboard pruefen.`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 15000));
}
console.error('\n[render] Timeout nach 15 min.');
process.exit(1);
