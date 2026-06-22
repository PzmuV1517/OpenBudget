/**
 * Locale-agnostic amount normalization. Receipts use '.' or ',' for decimals
 * and the other (plus space or apostrophe) for thousands, depending on locale.
 * We infer which is which from structure rather than assuming a locale.
 *
 * Returns the value in MAJOR units (e.g. 12.5) or null if it isn't a number.
 */

export interface NormalizeOptions {
  /** Minor-unit digit count for the target currency (default 2). */
  decimals?: number;
}

const NON_NUMERIC = /[^\d.,]/g;

export function normalizeAmount(
  input: string,
  opts: NormalizeOptions = {}
): number | null {
  const decimals = opts.decimals ?? 2;

  // Strip everything but digits and the two separator characters. Spaces and
  // apostrophes (Swiss thousands) simply vanish — they are never decimals.
  const cleaned = input.replace(NON_NUMERIC, '');
  if (!/\d/.test(cleaned)) return null;

  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  let decimalSep: '.' | ',' | null = null;
  let thousandsSep: '.' | ',' | null = null;

  if (hasDot && hasComma) {
    // The rightmost separator is the decimal one; the other is thousands.
    decimalSep = cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',') ? '.' : ',';
    thousandsSep = decimalSep === '.' ? ',' : '.';
  } else if (hasDot || hasComma) {
    const sep: '.' | ',' = hasDot ? '.' : ',';
    const parts = cleaned.split(sep);
    if (parts.length > 2) {
      // Repeated separator can only be thousands grouping: 1.234.567
      thousandsSep = sep;
    } else {
      const after = parts[1] ?? '';
      // A single separator with exactly 3 trailing digits is ambiguous; for a
      // 2-decimal currency it's almost always thousands (1,234 -> 1234). For a
      // 0-decimal currency, any separator is thousands.
      if (decimals === 0) {
        thousandsSep = sep;
      } else if (after.length === 3 && parts[0].length >= 1) {
        thousandsSep = sep;
      } else {
        decimalSep = sep;
      }
    }
  }

  let normalized = cleaned;
  if (thousandsSep) normalized = normalized.split(thousandsSep).join('');
  if (decimalSep) normalized = normalized.replace(decimalSep, '.');

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
