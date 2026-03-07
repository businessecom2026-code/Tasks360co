/**
 * Locale Routes — GET/POST /api/locale
 *
 * GET  /api/locale — returns detected locale (from middleware)
 * POST /api/locale — persists user's locale choice in cookie (1 year)
 */

import { Router } from 'express';

const SUPPORTED_LOCALES = [
  'pt-BR', 'pt-PT', 'es-ES', 'it-IT', 'en-US', 'en-GB',
  'zh-CN', 'fr-FR', 'de-DE', 'uk-UA',
];

export function localeRoutes() {
  const router = Router();

  // Return the detected locale
  router.get('/', (req, res) => {
    res.json({ locale: req.locale || 'pt-BR' });
  });

  // Persist user's locale choice
  router.post('/', (req, res) => {
    const { locale } = req.body;

    if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
      return res.status(400).json({ error: 'Invalid locale' });
    }

    res.cookie('locale', locale, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: false,
      sameSite: 'lax',
    });

    res.json({ locale });
  });

  return router;
}
