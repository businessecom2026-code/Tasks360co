/**
 * i18n Middleware — Express Locale Detection
 *
 * Priority:
 *   1. Cookie `locale` (user's manual choice)
 *   2. Accept-Language header (browser)
 *   3. Fallback → pt-BR
 */

const SUPPORTED_LOCALES = [
  'pt-BR', 'pt-PT', 'es-ES', 'it-IT', 'en-US', 'en-GB',
  'zh-CN', 'fr-FR', 'de-DE', 'uk-UA',
];

const DEFAULT_LOCALE = 'pt-BR';

/**
 * Parse Accept-Language header and return best matching locale.
 * e.g. "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
 */
function parseAcceptLanguage(header) {
  if (!header) return DEFAULT_LOCALE;

  const entries = header
    .split(',')
    .map(part => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.trim(), quality: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { lang } of entries) {
    // Exact match
    if (SUPPORTED_LOCALES.includes(lang)) return lang;

    // Partial match: "pt" → "pt-BR"
    const prefix = lang.split('-')[0].toLowerCase();
    const partial = SUPPORTED_LOCALES.find(c => c.toLowerCase().startsWith(prefix));
    if (partial) return partial;
  }

  return DEFAULT_LOCALE;
}

/**
 * Express middleware that sets req.locale.
 */
export function i18nMiddleware(req, _res, next) {
  // 1. Cookie (user already chose)
  const cookieLocale = req.cookies?.locale;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    req.locale = cookieLocale;
    return next();
  }

  // 2. Accept-Language header
  req.locale = parseAcceptLanguage(req.headers['accept-language']);
  next();
}
