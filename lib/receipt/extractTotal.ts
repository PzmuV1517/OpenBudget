/**
 * Heuristic total extraction. Combines four signals, none authoritative alone:
 *   1. Total keywords on the line (strong positive)
 *   2. Negative keywords like subtotal/tax/change (strong negative)
 *   3. Geometry — totals sit low on the receipt (positive, when bbox present)
 *   4. Magnitude / position — the total is usually the largest and near the end
 */
import {
  CURRENCY_SIGNS,
  NEGATIVE_KEYWORDS,
  TOTAL_KEYWORDS,
} from './keywords';
import { normalizeAmount } from './normalizeAmount';
import type { AmountCandidate, OcrResult } from './types';

/** Lowercase + strip diacritics so keyword matching is accent-insensitive. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Matches digit groups that may carry separators: "1.234,56", "12,50", "1 234".
const AMOUNT_RE = /\d[\d.,\s']*\d|\d/g;

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

function hasKeyword(normLine: string, keywords: string[]): boolean {
  return keywords.some((k) => normLine.includes(normalize(k)));
}

export function extractCandidates(
  ocr: OcrResult,
  opts: ExtractOptions = {}
): AmountCandidate[] {
  const decimals = opts.decimals ?? 2;
  const lineCount = ocr.lines.length || 1;
  const candidates: AmountCandidate[] = [];

  ocr.lines.forEach((line, lineIndex) => {
    const normLine = normalize(line.text);
    const isTotalLine = hasKeyword(normLine, TOTAL_KEYWORDS);
    const isNegativeLine = hasKeyword(normLine, NEGATIVE_KEYWORDS);
    const lineCurrency = detectCurrency(line.text);

    const matches = line.text.match(AMOUNT_RE);
    if (!matches) return;

    for (const raw of matches) {
      const value = normalizeAmount(raw, { decimals });
      if (value === null || value <= 0) continue;

      const hadDecimal = /[.,]\d{1,2}\b/.test(raw);
      let score = 0;

      // Keyword signals dominate.
      if (isTotalLine) score += 100;
      if (isNegativeLine) score -= 80;

      // Position within the line list — later lines score higher. (Precise
      // bbox geometry is layered on in a second pass below.)
      score += (lineIndex / lineCount) * 25;

      // Amounts written with decimals look like money; bare integers (counts,
      // years, item codes) are demoted unless the currency has no minor unit.
      if (hadDecimal || decimals === 0) score += 15;
      else score -= 10;

      // Mild magnitude bonus — totals tend to be among the larger numbers.
      score += Math.min(Math.log10(value + 1) * 3, 12);

      candidates.push({
        value,
        currency: lineCurrency ?? opts.defaultCurrency,
        lineIndex,
        raw: raw.trim(),
        score,
      });
    }
  });

  // Geometry refinement: if any bbox is present, prefer candidates lower down.
  const withGeometry = ocr.lines.some((l) => l.bbox);
  if (withGeometry) {
    const maxY = Math.max(
      ...ocr.lines.map((l) => (l.bbox ? l.bbox.y + l.bbox.height : 0)),
      1
    );
    for (const c of candidates) {
      const box = ocr.lines[c.lineIndex].bbox;
      if (box) c.score += (box.y / maxY) * 20;
    }
  }

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
