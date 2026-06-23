/**
 * Orchestrates the receipt pipeline: OCR result -> total + currency + merchant.
 * Keep this the single public entry point for parsing; screens call only this.
 */
import { decimalsFor, toMinorUnits } from '../money';
import { scoreTotalConfidence } from './confidence';
import { extractMerchant } from './extractMerchant';
import { extractTotal } from './extractTotal';
import { isMoneyShaped, looksLikeNoise } from './patterns';
import type { AmountCandidate, OcrResult, ParsedReceipt, ReceiptItem } from './types';

export interface ParseOptions {
  defaultCurrency?: string;
}

/** Strip the price (and stray currency glyphs) off a row to get the item name. */
function nameFromRow(context: string, priceRaw: string): string {
  const at = context.lastIndexOf(priceRaw);
  const withoutPrice =
    at >= 0 ? context.slice(0, at) + context.slice(at + priceRaw.length) : context;
  return withoutPrice
    .replace(/[$€£¥₩₹₺₪฿]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Item rows (top-to-bottom) become editable line items. We're strict here so
 * header/footer junk never shows up as an item:
 *   - the price must be money-shaped (has decimals), which rejects ZIPs, phone
 *     fragments, and store numbers that are bare integers
 *   - the row must not look like contact info or an address
 *   - the leftover name must contain letters and not start with a digit
 */
function itemsFromCandidates(
  candidates: AmountCandidate[],
  decimals: number
): ReceiptItem[] {
  return candidates
    .filter((c) => c.kind === 'item')
    .filter((c) => isMoneyShaped(c.raw, decimals))
    .filter((c) => !looksLikeNoise(c.context))
    .sort((a, b) => a.lineIndex - b.lineIndex)
    .map((c) => ({ name: nameFromRow(c.context, c.raw), price: c.value }))
    .filter(
      (item) =>
        item.name.length >= 2 &&
        /\p{L}/u.test(item.name) &&
        !/^\d{3,}/.test(item.name) // leftover starts with a long number → junk
    );
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
    merchant: extractMerchant(ocr),
    confidence: scoreTotalConfidence(finalPass.candidates),
    items: itemsFromCandidates(finalPass.candidates, decimals),
    rawText,
    candidates: finalPass.candidates,
  };
}
