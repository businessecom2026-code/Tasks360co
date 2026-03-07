/**
 * Backend i18n — Translation Helper
 *
 * Loads JSON translation files from src/lib/i18n/messages/ and provides
 * a t(locale, key, params?) function for server-side string resolution.
 *
 * Files are cached in memory after first load.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = join(__dirname, '..', '..', 'src', 'lib', 'i18n', 'messages');
const DEFAULT_LOCALE = 'pt-BR';

// In-memory cache: locale → parsed JSON
const cache = new Map();

/**
 * Load messages for a locale (cached).
 */
function loadMessages(locale) {
  if (cache.has(locale)) return cache.get(locale);

  try {
    const filePath = join(MESSAGES_DIR, `${locale}.json`);
    const content = readFileSync(filePath, 'utf8');
    const messages = JSON.parse(content);
    cache.set(locale, messages);
    return messages;
  } catch {
    // Fallback to default locale
    if (locale !== DEFAULT_LOCALE) {
      return loadMessages(DEFAULT_LOCALE);
    }
    console.error(`[i18n] Failed to load messages for ${locale}`);
    return {};
  }
}

/**
 * Resolve a dot-notation key against nested object.
 */
function resolveKey(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Translate a key for a given locale.
 *
 * @param {string} locale - e.g. 'pt-BR'
 * @param {string} key - dot-notation key, e.g. 'errors.tokenNotProvided'
 * @param {object} [params] - interpolation params, e.g. { count: 5 }
 * @returns {string} Translated string, or the key itself as fallback
 */
export function t(locale, key, params) {
  const messages = loadMessages(locale || DEFAULT_LOCALE);
  const count = params?.count;

  // Plural resolution
  let resolved;
  if (count !== undefined && count !== 1) {
    resolved = resolveKey(messages, key + '_plural');
  }
  if (!resolved) {
    resolved = resolveKey(messages, key);
  }

  // Fallback to default locale
  if (!resolved && locale !== DEFAULT_LOCALE) {
    const fallback = loadMessages(DEFAULT_LOCALE);
    if (count !== undefined && count !== 1) {
      resolved = resolveKey(fallback, key + '_plural');
    }
    if (!resolved) {
      resolved = resolveKey(fallback, key);
    }
  }

  if (!resolved) return key;

  // Interpolation: replace {{varName}}
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      resolved = resolved.replaceAll(`{{${k}}}`, String(v));
    }
  }

  return resolved;
}
