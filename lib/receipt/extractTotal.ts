/**
 * Total extraction over reconstructed rows. Each row reads "label … price", so
 * we classify the row (item / subtotal / tax / change / total) by its keywords
 * and score its price. Key rules:
 *   - "subtotal"/"tax"/"change" rows are demoted hard and NEVER get the total
 *     bonus (note "subtotal" contains "total" — negative check wins).
 *   - a real "total" row gets a large bonus; among several, the lowest/largest
 *     wins (grand total sits last and is usually the biggest).
 */
import { CURRENCY_SIGNS, NEGATIVE_KEYWORDS, TOTAL_KEYWORDS } from './keywords';
import { buildRows, rowPrice } from './rows';
import type { AmountCandidate, OcrResult, RowKind } from './types';

/** Lowercase + strip diacritics so keyword matching is accent-insensitive. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Sub-classes of "negative" rows, so the confirm UI can label them.
const TAX_WORDS = ['tax', 'vat', 'gst', 'hst', 'tva', 'mwst', 'iva', 'налог', 'ндс', '税'];
const CHANGE_WORDS = [
  'change',
  'cash',
  'tender',
  'cambio',
  'rendu',
  'rest',
  'wechselgeld',
  'сдача',
];
const SUBTOTAL_WORDS = ['subtotal', 'sub total', 'sub-total', 'zwischensumme', 'zwischen'];

export interface ExtractOptions {
  defaultCurrency?: string;
  /** Minor-unit digits for the resolved currency (default 2). */
  decimals?: number;
}

function detectCurrency(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const { token, code } of CURRENCY_SIGNS) {
    if (lower.includes(token)) return code;
  }
  return undefined;
}

function hasAny(normText: string, words: string[]): boolean {
  return words.some((w) => normText.includes(normalize(w)));
}

function classifyRow(normText: string): RowKind {
  // Negative classes win over "total" because "subtotal" contains "total".
  if (hasAny(normText, SUBTOTAL_WORDS)) return 'subtotal';
  if (hasAny(normText, TAX_WORDS)) return 'tax';
  if (hasAny(normText, CHANGE_WORDS)) return 'change';
  if (hasAny(normText, NEGATIVE_KEYWORDS)) return 'subtotal';
  if (hasAny(normText, TOTAL_KEYWORDS)) return 'total';
  return 'item';
}

export function extractCandidates(
  ocr: OcrResult,
  opts: ExtractOptions = {}
): AmountCandidate[] {
  const decimals = opts.decimals ?? 2;
  const rows = buildRows(ocr, decimals);
  const rowCount = rows.length || 1;
  const candidates: AmountCandidate[] = [];

  rows.forEach((row) => {
    const price = rowPrice(row);
    if (!price) return;

    const norm = normalize(row.text);
    const kind = classifyRow(norm);
    const isNegative = kind === 'subtotal' || kind === 'tax' || kind === 'change';
    const currency = detectCurrency(row.text) ?? opts.defaultCurrency;
    const hadDecimal = /[.,]\d{1,2}\b/.test(price.raw);

    let score = 0;
    if (kind === 'total') score += 120;
    // Hard demotion — and crucially no total bonus was added above.
    if (isNegative) score -= 100;

    // Position: grand total sits low on the receipt.
    score += (row.index / rowCount) * 25;

    // Looks like money.
    if (hadDecimal || decimals === 0) score += 15;
    else score -= 10;

    // Mild magnitude bonus — the total is usually among the larger numbers.
    score += Math.min(Math.log10(price.value + 1) * 3, 12);

    candidates.push({
      value: price.value,
      currency,
      lineIndex: row.index,
      raw: price.raw,
      score,
      context: row.text.trim(),
      kind,
    });
  });

  return candidates.sort((a, b) => b.score - a.score);
}

export interface ExtractedTotal {
  amount: number | null;
  currency: string;
  candidates: AmountCandidate[];
}

export function extractTotal(
  ocr: OcrResult,
  opts: ExtractOptions = {}
): ExtractedTotal {
  const candidates = extractCandidates(ocr, opts);
  const best = candidates[0] ?? null;
  const fallbackCurrency =
    best?.currency ??
    detectCurrency(ocr.lines.map((l) => l.text).join(' ')) ??
    opts.defaultCurrency ??
    'USD';

  return {
    amount: best ? best.value : null,
    currency: fallbackCurrency,
    candidates,
  };
}
