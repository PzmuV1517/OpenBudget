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

export type RowKind = 'total' | 'subtotal' | 'tax' | 'change' | 'item';

export interface AmountCandidate {
  /** Parsed value in major units (e.g. 12.50). */
  value: number;
  /** Currency guessed for this candidate, if any (ISO 4217). */
  currency?: string;
  /** Row index this came from (top-to-bottom). */
  lineIndex: number;
  /** Raw matched substring. */
  raw: string;
  /** Heuristic confidence score; higher is more likely the total. */
  score: number;
  /** Full reconstructed row text the amount sits on (label + price). */
  context: string;
  /** What the row represents, by keyword on the row. */
  kind: RowKind;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface TotalConfidence {
  /** 0..1 confidence that the chosen total is correct. */
  score: number;
  level: ConfidenceLevel;
  /** Human-readable signals behind the score (for the confirm UI). */
  reasons: string[];
}

export interface ParsedReceipt {
  /** Best-guess total in integer minor units, or null if nothing found. */
  amountMinor: number | null;
  /** Best-guess total in major units, or null. */
  amount: number | null;
  currency: string;
  merchant?: string;
  /** How sure we are about the detected total. */
  confidence: TotalConfidence;
  rawText: string;
  /** All ranked candidates, best first — handy for the confirm UI. */
  candidates: AmountCandidate[];
}
