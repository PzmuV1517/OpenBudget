/**
 * Orchestrates the receipt pipeline: OCR result -> total + currency + merchant.
 * Keep this the single public entry point for parsing; screens call only this.
 */
import { decimalsFor, toMinorUnits } from '../money';
import { scoreTotalConfidence } from './confidence';
import { extractMerchant } from './extractMerchant';
import { extractTotal } from './extractTotal';
import type { OcrResult, ParsedReceipt } from './types';

export interface ParseOptions {
  defaultCurrency?: string;
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
    rawText,
    candidates: finalPass.candidates,
  };
}
