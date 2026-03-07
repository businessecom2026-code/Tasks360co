/**
 * Rate Limiting Middleware
 *
 * Three tiers:
 * - globalLimiter: 100 req/min per IP (all routes)
 * - authLimiter: 5 req/min per IP (login, register)
 * - uploadLimiter: 10 req/min per IP (file uploads, AI processing)
 *
 * Webhooks are exempted from global limiting.
 */

import rateLimit from 'express-rate-limit';
import { t } from '../lib/i18n.js';

/**
 * Build a handler that returns a localized rate-limit error.
 * express-rate-limit v7 `handler` receives (req, res, next, options).
 */
function rateLimitHandler(req, res) {
  const locale = req.locale || 'pt-BR';
  res.status(429).json({ error: t(locale, 'toast.rateLimited') });
}

/**
 * Global rate limiter — 100 requests per minute per IP.
 * Skips webhook routes (they come from external services).
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl?.startsWith('/api/webhooks'),
  handler: rateLimitHandler,
});

/**
 * Auth rate limiter — 5 requests per minute per IP.
 * Protects login and register endpoints from brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Upload rate limiter — 10 requests per minute per IP.
 * Protects file upload and AI processing endpoints.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
