// Env-Validierung beim Boot (zod, Fail-Fast in Production).
// Neue Env-Vars hier UND in .env.example eintragen.

import 'dotenv/config';
import { z } from 'zod';

const isProd = process.env.NODE_ENV === 'production';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4001),
  DATABASE_URL: isProd ? z.string().min(1) : z.string().optional(),
  JWT_SECRET: isProd ? z.string().min(32) : z.string().min(1).default('dev-secret-nicht-fuer-produktion'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5174'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[config] Ungültige Umgebungsvariablen:', parsed.error.issues);
  process.exit(1);
}

export const config = parsed.data;
