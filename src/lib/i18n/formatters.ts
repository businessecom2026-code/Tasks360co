/**
 * i18n — Currency, Date & Relative Time Formatters
 *
 * Uses Intl.NumberFormat / Intl.DateTimeFormat tied to active locale.
 */

import { LOCALES, type LocaleCode } from './locales';

/**
 * Format a monetary amount using locale conventions.
 *
 * formatCurrency(29.90, 'pt-BR') → "R$ 29,90"
 * formatCurrency(29.90, 'en-US') → "$29.90"
 * formatCurrency(29.90, 'de-DE') → "29,90 €"
 */
export function formatCurrency(amount: number, locale: LocaleCode): string {
  const { currency } = LOCALES[locale];
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date using locale conventions.
 *
 * formatDate(new Date(), 'pt-BR') → "06/03/2026"
 * formatDate(new Date(), 'en-US') → "3/6/2026"
 * formatDate(new Date(), 'de-DE') → "06.03.2026"
 */
export function formatDate(
  date: string | Date,
  locale: LocaleCode,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Format a date as a short datetime string.
 *
 * formatDateTime(new Date(), 'pt-BR') → "06/03/2026 14:30"
 */
export function formatDateTime(date: string | Date, locale: LocaleCode): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Format relative time (e.g., "5 min atrás", "2 hours ago").
 *
 * Uses Intl.RelativeTimeFormat when available, fallback to simple strings.
 */
export function formatRelativeTime(dateStr: string, locale: LocaleCode): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffSec < 60) return rtf.format(-diffSec, 'second');
    if (diffMin < 60) return rtf.format(-diffMin, 'minute');
    if (diffHour < 24) return rtf.format(-diffHour, 'hour');
    if (diffDay < 30) return rtf.format(-diffDay, 'day');
    return formatDate(dateStr, locale);
  } catch {
    // Fallback for environments without RelativeTimeFormat
    if (diffSec < 60) return `${diffSec}s`;
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    return `${diffDay}d`;
  }
}
