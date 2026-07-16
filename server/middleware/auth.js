// Auth-Middleware: requireAuth (gueltiges JWT) und requireAdmin.
// JEDE Schreiboperation laeuft ueber requireAdmin — Baecker-Clients
// koennen strukturell nichts ueberschreiben (ersetzt die alte
// "Baker pusht nie"-Konvention durch echte Autorisierung).

import { verifyToken } from '../services/jwt-service.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  try {
    req.authUser = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Sitzung abgelaufen — bitte neu anmelden' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Nur für Administratoren' });
    }
    next();
  });
}
