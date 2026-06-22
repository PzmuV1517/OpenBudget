/**
 * Reconstructs horizontal rows from OCR lines. ML Kit emits a receipt's label
 * and its price as SEPARATE lines (they're far apart with a column gap), so to
 * know what a price represents we regroup lines that share a vertical band into
 * one row, ordered left-to-right. Then a row reads as "label … price" and we
 * can tell item / subtotal / tax / total apart.
 *
 * Without bounding boxes (web stub, geometry-less OCR) each line is its own row.
 */
import { normalizeAmount } from './normalizeAmount';
import type { OcrLine, OcrResult } from './types';

export interface RowAmount {
  value: number; // major units
  raw: string;
  x: number; // left edge, for picking the rightmost (the price)
}

export interface Row {
  index: number; // top-to-bottom order
  text: string; // reconstructed left-to-right
  y: number; // representative vertical center
  amounts: RowAmount[];
}

// Digit groups that may carry separators: "1.234,56", "12,50", "1 234".
const AMOUNT_RE = /\d[\d.,\s']*\d|\d/g;

function lineAmounts(line: OcrLine, decimals: number): RowAmount[] {
  const matches = line.text.match(AMOUNT_RE);
  if (!matches) return [];
  const x = line.bbox?.x ?? 0;
  const out: RowAmount[] = [];
  for (const raw of matches) {
    const value = normalizeAmount(raw, { decimals });
    if (value === null || value <= 0) continue;
    out.push({ value, raw: raw.trim(), x });
  }
  return out;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function buildRows(ocr: OcrResult, decimals: number): Row[] {
  const hasGeometry = ocr.lines.some((l) => l.bbox);

  if (!hasGeometry) {
    return ocr.lines.map((line, index) => ({
      index,
      text: line.text,
      y: index,
      amounts: lineAmounts(line, decimals),
    }));
  }

  const boxed = ocr.lines.filter((l) => l.bbox);
  const tol = median(boxed.map((l) => l.bbox!.height)) * 0.7 || 8;

  const sorted = [...boxed].sort(
    (a, b) =>
      a.bbox!.y + a.bbox!.height / 2 - (b.bbox!.y + b.bbox!.height / 2)
  );

  // Greedily group consecutive lines whose vertical centers are within tol.
  const groups: { lines: OcrLine[]; yc: number }[] = [];
  for (const line of sorted) {
    const yc = line.bbox!.y + line.bbox!.height / 2;
    const g = groups[groups.length - 1];
    if (g && Math.abs(yc - g.yc) <= tol) {
      g.lines.push(line);
      g.yc = (g.yc * (g.lines.length - 1) + yc) / g.lines.length;
    } else {
      groups.push({ lines: [line], yc });
    }
  }

  return groups.map((g, index) => {
    const ordered = [...g.lines].sort((a, b) => a.bbox!.x - b.bbox!.x);
    return {
      index,
      text: ordered.map((l) => l.text).join('  '),
      y: g.yc,
      amounts: ordered.flatMap((l) => lineAmounts(l, decimals)),
    };
  });
}

/** The price for a row is its rightmost amount (e.g. line total, not qty/unit). */
export function rowPrice(row: Row): RowAmount | null {
  if (row.amounts.length === 0) return null;
  return row.amounts.reduce((best, a) => (a.x >= best.x ? a : best));
}
