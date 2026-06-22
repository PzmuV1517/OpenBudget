/**
 * Orchestrates the receipt pipeline: OCR result -> total + currency + merchant.
 * Keep this the single public entry point for parsing; screens call only this.
 */
import { decimalsFor, toMinorUnits } from '../money';
import { extractTotal, normalize } from './extractTotal';
import { NEGATIVE_KEYWORDS, TOTAL_KEYWORDS } from './keywords';
import type { OcrResult, ParsedReceipt } from './types';

export interface ParseOptions {
  defaultCurrency?: string;
}

/** Guess the merchant: first non-empty line that isn't an amount/keyword line. */
function guessMerchant(ocr: OcrResult): string | undefined {
  const skip = [...TOTAL_KEYWORDS, ...NEGATIVE_KEYWORDS].map(normalize);
  for (const line of ocr.lines.slice(0, 5)) {
    const text = line.text.trim();
    if (text.length < 3) continue;
    const norm = normalize(text);
    if (skip.some((k) => norm.includes(k))) continue;
    if (/^[\d\s.,:$€£¥-]+$/.test(text)) continue; // mostly numbers/symbols
    // Prefer a line with letters; collapse internal whitespace.
    if (/\p{L}/u.test(text)) return text.replace(/\s+/g, ' ');
  }
  return undefined;
}

export function parseOcr(
  ocr: OcrResult,
  opts: ParseOptions = {}
): ParsedReceipt {
  const defaultCurrency = (opts.defaultCurrency ?? 'USD').toUpperCase();

  // First pass to discover the currency, then re-extract with its decimal rule
  // so separator inference matches the currency (e.g. JPY has 0 decimals).
  const first = extractTotal(ocr, { defaultCurrency, decimals: 2 });
  const currency = (first.currency ?? defaultCurrency).toUpperCase();
  const decimals = decimalsFor(currency);

  const finalPass =
    decimals === 2
      ? first
      : extractTotal(ocr, { defaultCurrency: currency, decimals });

  const amount = finalPass.amount;
  const rawText = ocr.lines.map((l) => l.text).join('\n');

  return {
    amount,
    amountMinor: amount != null ? toMinorUnits(amount, currency) : null,
    currency,
    merchant: guessMerchant(ocr),
    rawText,
    candidates: finalPass.candidates,
  };
}
