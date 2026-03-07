/**
 * i18n — Zustand Locale Store (persisted)
 *
 * Provides:
 * - locale: current locale code
 * - t(key, params?): translate a dot-notation key with optional interpolation
 * - setLocale(code): switch locale, lazy-load messages, persist cookie
 * - loadMessages(code): load translation JSON via dynamic import
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type LocaleCode, DEFAULT_LOCALE, isValidLocale } from '../lib/i18n/locales';

// Pre-load pt-BR synchronously to avoid flash of untranslated content
import ptBR from '../lib/i18n/messages/pt-BR.json';

type Messages = Record<string, unknown>;

interface LocaleState {
  locale: LocaleCode;
  messages: Messages;
  isLoading: boolean;
  setLocale: (locale: LocaleCode) => Promise<void>;
  loadMessages: (locale: LocaleCode) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Resolve a dot-notation key against a nested object.
 * e.g. resolveKey({ a: { b: 'hello' } }, 'a.b') → 'hello'
 */
function resolveKey(obj: Messages, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Dynamically import a translation JSON file.
 * Vite code-splits these into separate chunks.
 */
async function importMessages(locale: LocaleCode): Promise<Messages> {
  switch (locale) {
    case 'pt-BR': return (await import('../lib/i18n/messages/pt-BR.json')).default;
    case 'pt-PT': return (await import('../lib/i18n/messages/pt-PT.json')).default;
    case 'es-ES': return (await import('../lib/i18n/messages/es-ES.json')).default;
    case 'it-IT': return (await import('../lib/i18n/messages/it-IT.json')).default;
    case 'en-US': return (await import('../lib/i18n/messages/en-US.json')).default;
    case 'en-GB': return (await import('../lib/i18n/messages/en-GB.json')).default;
    case 'zh-CN': return (await import('../lib/i18n/messages/zh-CN.json')).default;
    case 'fr-FR': return (await import('../lib/i18n/messages/fr-FR.json')).default;
    case 'de-DE': return (await import('../lib/i18n/messages/de-DE.json')).default;
    case 'uk-UA': return (await import('../lib/i18n/messages/uk-UA.json')).default;
    default: return (await import('../lib/i18n/messages/pt-BR.json')).default;
  }
}

/**
 * Detect browser locale and match to a supported locale.
 */
function detectBrowserLocale(): LocaleCode {
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || '';
  if (isValidLocale(browserLang)) return browserLang;

  // Partial match: "pt" → "pt-BR", "en" → "en-US", etc.
  const prefix = browserLang.split('-')[0].toLowerCase();
  const partialMatch: Record<string, LocaleCode> = {
    pt: 'pt-BR', es: 'es-ES', it: 'it-IT', en: 'en-US',
    zh: 'zh-CN', fr: 'fr-FR', de: 'de-DE', uk: 'uk-UA',
  };
  return partialMatch[prefix] || DEFAULT_LOCALE;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: DEFAULT_LOCALE,
      messages: ptBR as Messages,
      isLoading: false,

      loadMessages: async (locale: LocaleCode) => {
        set({ isLoading: true });
        try {
          const messages = await importMessages(locale);
          set({ messages, locale, isLoading: false });
          document.documentElement.lang = locale;
        } catch (err) {
          console.error('[i18n] Failed to load messages for', locale, err);
          set({ isLoading: false });
        }
      },

      setLocale: async (locale: LocaleCode) => {
        if (locale === get().locale && Object.keys(get().messages).length > 0) return;
        await get().loadMessages(locale);

        // Persist choice to server cookie
        try {
          await fetch('/api/locale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locale }),
          });
        } catch {
          // Cookie persistence is best-effort
        }
      },

      t: (key: string, params?: Record<string, string | number>): string => {
        const { messages } = get();
        const count = params?.count;

        // Plural resolution: check key_plural when count !== 1
        let resolved: string | undefined;
        if (count !== undefined && count !== 1) {
          resolved = resolveKey(messages, key + '_plural');
        }
        if (!resolved) {
          resolved = resolveKey(messages, key);
        }

        // Fallback: return the key itself
        if (!resolved) return key;

        // Interpolation: replace {{varName}} with params
        let result = resolved;
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            result = result.replaceAll(`{{${k}}}`, String(v));
          }
        }

        return result;
      },
    }),
    {
      name: 'locale-storage',
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, load messages for the persisted locale
        if (state) {
          const locale = state.locale || detectBrowserLocale();
          state.loadMessages(locale);
        }
      },
    }
  )
);
