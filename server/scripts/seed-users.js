// Seed: legt die 3 Benutzer an (idempotenter Upsert).
// Passwoerter kommen aus server/.env (SEED_*_PASSWORD) — Marten traegt
// dort die bestehenden Firebase-Passwoerter ein, damit sich fuer die
// Mitarbeiter nichts aendert. Lokal wie gegen die Render/Neon-Prod-DB
// ausfuehrbar: npm run seed

import 'dotenv/config';
import { hashPassword, upsertUser } from '../services/auth-service.js';
import { pool } from '../db.js';

const USERS = [
  { email: 'marten@oetzmann.de', role: 'admin', envVar: 'SEED_ADMIN_PASSWORD' },
  { email: 'teigmacher@oetzmann.de', role: 'teigmacher', envVar: 'SEED_TEIGMACHER_PASSWORD' },
  { email: 'kuchen@oetzmann.de', role: 'kuchenmacher', envVar: 'SEED_KUCHEN_PASSWORD' },
];

let ok = 0;
for (const u of USERS) {
  const password = process.env[u.envVar];
  if (!password) {
    console.warn(`[seed] ${u.email}: ${u.envVar} nicht gesetzt — übersprungen`);
    continue;
  }
  const hash = await hashPassword(password);
  await upsertUser(u.email, hash, u.role);
  console.log(`[seed] ${u.email} (${u.role}) angelegt/aktualisiert`);
  ok++;
}

console.log(`[seed] Fertig: ${ok}/${USERS.length} Benutzer.`);
await pool.end();
