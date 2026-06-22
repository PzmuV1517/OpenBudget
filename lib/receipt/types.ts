/** Shared types for the pure receipt-parsing pipeline (no React, no native). */

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrLine {
  text: string;
  /** Optional layout box. Geometry sharpens total detection when present. */
  bbox?: BBox;
}

export interface OcrResult {
  lines: OcrLine[];
}

export interface AmountCandidate {
  /** Parsed value in major units (e.g. 12.50). */
  value: number;
  /** Currency guessed for this candidate, if any (ISO 4217). */
  currency?: string;
  /** Line index this came from. */
  lineIndex: number;
  /** Raw matched substring. */
  raw: string;
  /** Heuristic confidence score; higher is more likely the total. */
  score: number;
}

export interface ParsedReceipt {
  /** Best-guess total in integer minor units, or null if nothing found. */
  amountMinor: number | null;
  /** Best-guess total in major units, or null. */
  amount: number | null;
  currency: string;
  merchant?: string;
  rawText: string;
  /** All ranked candidates, best first — handy for the confirm UI. */
  candidates: AmountCandidate[];
}
