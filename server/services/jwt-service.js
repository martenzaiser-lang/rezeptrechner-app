// JWT-Erzeugung und -Pruefung. Laufzeit 7 Tage — deckt die bisherige
// 7-Tage-Offline-Session der alten App ab.

import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signLoginToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}
