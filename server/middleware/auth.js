import jwt from 'jsonwebtoken';
import { t } from '../lib/i18n.js';

const JWT_SECRET = process.env.JWT_SECRET || 'task360-secret-change-in-production';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req, res, next) {
  // Support Bearer token in header or ?token= query param (for SSE)
  let token = null;
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: t(req.locale, 'errors.tokenNotProvided') });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: t(req.locale, 'errors.tokenInvalid') });
  }
}
