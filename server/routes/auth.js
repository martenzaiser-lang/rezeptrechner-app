// Auth-Endpoints: Login + Token-Check.

import { Router } from 'express';
import { z } from 'zod';
import { findUserByEmail, verifyPassword } from '../services/auth-service.js';
import { signLoginToken } from '../services/jwt-service.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

// Email maskieren fuer Logs (Datenminimierung).
function maskEmail(email) {
  const [local, domain] = String(email).split('@');
  if (!domain) return '<?>';
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`;
}

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

/**
 * POST /api/auth/login
 * Body: { email, password } → { token, email, role }
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    }
    const email = parsed.data.email.toLowerCase().trim();

    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
      console.log(`[auth] Login fehlgeschlagen ${maskEmail(email)}`);
      return res.status(401).json({ error: 'E-Mail oder Passwort falsch' });
    }

    const token = signLoginToken(user);
    console.log(`[auth] Login OK ${maskEmail(email)} (${user.role})`);
    res.json({ token, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me — Token-Validierung beim App-Start.
 */
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ email: req.authUser.email, role: req.authUser.role });
});
