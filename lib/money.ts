/**
 * Money is stored everywhere as integer minor units (e.g. cents). Never floats.
 * These helpers are the only place we cross the integer <-> display boundary.
 */

/** Currencies that have no minor unit (0 decimal places). */
const ZERO_DECIMAL = new Set([
  'JPY',
  'KRW',
  'VND',
  'CLP',
  'ISK',
  'HUF',
  'UGX',
  'XAF',
  'XOF',
  'RWF',
  'PYG',
  'GNF',
]);

/** Currencies with 3 minor-unit digits. */
const THREE_DECIMAL = new Set(['BHD', 'KWD', 'OMR', 'TND', 'IQD', 'JOD', 'LYD']);

export function decimalsFor(currency: string): number {
  const c = currency.toUpperCase();
  if (ZERO_DECIMAL.has(c)) return 0;
  if (THREE_DECIMAL.has(c)) return 3;
  return 2;
}

/** Convert a human decimal string/number into integer minor units. */
export function toMinorUnits(value: number, currency = 'USD'): number {
  const factor = Math.pow(10, decimalsFor(currency));
  return Math.round(value * factor);
}

/** Convert integer minor units back to a major-unit number for math/display. */
export function toMajorUnits(minor: number, currency = 'USD'): number {
  const factor = Math.pow(10, decimalsFor(currency));
  return minor / factor;
}

/**
 * Format integer minor units as a localized currency string. Falls back to a
 * plain formatted number if the runtime Intl data lacks the currency.
 */
export function formatMoney(
  minor: number,
  currency = 'USD',
  locale?: string
): string {
  const decimals = decimalsFor(currency);
  const major = toMajorUnits(minor, currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major);
  } catch {
    const num = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major);
    return `${currency} ${num}`;
  }
}

/** Clamp a ratio (spent/allocated) into [0, 1] for progress UI. */
export function progressRatio(spentMinor: number, allocatedMinor: number): number {
  if (allocatedMinor <= 0) return 0;
  return Math.min(1, Math.max(0, spentMinor / allocatedMinor));
}
