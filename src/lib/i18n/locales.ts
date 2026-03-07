/**
 * i18n — Locale Configuration (Source of Truth)
 *
 * Maps each supported locale to metadata:
 * label, flag emoji, currency code, currency symbol, text direction.
 */

export const LOCALES = {
  'pt-BR': { label: 'Português (Brasil)',   flag: '🇧🇷', currency: 'BRL', currencySymbol: 'R$', dir: 'ltr' as const },
  'pt-PT': { label: 'Português (Portugal)', flag: '🇵🇹', currency: 'EUR', currencySymbol: '€',  dir: 'ltr' as const },
  'es-ES': { label: 'Español',              flag: '🇪🇸', currency: 'EUR', currencySymbol: '€',  dir: 'ltr' as const },
  'it-IT': { label: 'Italiano',             flag: '🇮🇹', currency: 'EUR', currencySymbol: '€',  dir: 'ltr' as const },
  'en-US': { label: 'English (US)',          flag: '🇺🇸', currency: 'USD', currencySymbol: '$',  dir: 'ltr' as const },
  'en-GB': { label: 'English (UK)',          flag: '🇬🇧', currency: 'GBP', currencySymbol: '£',  dir: 'ltr' as const },
  'zh-CN': { label: '中文 (简体)',            flag: '🇨🇳', currency: 'CNY', currencySymbol: '¥',  dir: 'ltr' as const },
  'fr-FR': { label: 'Français',             flag: '🇫🇷', currency: 'EUR', currencySymbol: '€',  dir: 'ltr' as const },
  'de-DE': { label: 'Deutsch',              flag: '🇩🇪', currency: 'EUR', currencySymbol: '€',  dir: 'ltr' as const },
  'uk-UA': { label: 'Українська',           flag: '🇺🇦', currency: 'UAH', currencySymbol: '₴',  dir: 'ltr' as const },
} as const;

export type LocaleCode = keyof typeof LOCALES;

export const DEFAULT_LOCALE: LocaleCode = 'pt-BR';

export const LOCALE_CODES = Object.keys(LOCALES) as LocaleCode[];

export function isValidLocale(code: string): code is LocaleCode {
  return code in LOCALES;
}
