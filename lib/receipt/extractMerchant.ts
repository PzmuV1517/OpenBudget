/**
 * Picks the merchant/store name. The old version returned the first line with
 * any letters, so OCR fragments near the top (e.g. "eipt" from "receipt", or a
 * misread logo) won. This scores every top-region line instead, with FONT SIZE
 * as the dominant signal: a store name is almost always the largest text near
 * the top. Falls back to letter/word heuristics when bounding boxes are absent.
 */
import { normalize } from './extractTotal';
import { NEGATIVE_KEYWORDS, TOTAL_KEYWORDS } from './keywords';
import type { OcrResult } from './types';

// Lines that look like contact info / boilerplate, never the store name.
const NOISE_PATTERNS: RegExp[] = [
  /www\.|https?:|\.com\b|\.net\b|\.org\b/i,
  /\btel\b|\bphone\b|\bfax\b|\bemail\b/i,
  /\breceipt\b|\binvoice\b|\border\b|\btransaction\b|\bcashier\b|\bregister\b|\bcustomer\b/i,
  /store\s*#|reg\s*#|\bvat\b|\btax\s*id\b/i,
  /\d{1,2}[:/]\d{2}/, // time or date fragments
  /\b\d{3}[-.\s]?\d{3,4}\b/, // phone-like
];

const BOILERPLATE = [
  'receipt',
  'invoice',
  'customer',
  'cashier',
  'register',
  'order',
  'transaction',
  'thank you',
  'welcome',
  'tel',
  'fax',
  'www',
];

interface Scored {
  text: string;
  score: number;
}

export function extractMerchant(ocr: OcrResult): string | undefined {
  const lines = ocr.lines;
  if (lines.length === 0) return undefined;

  const heights = lines.map((l) => l.bbox?.height ?? 0);
  const maxHeight = Math.max(...heights, 1);

  const tops = lines
    .filter((l) => l.bbox)
    .map((l) => l.bbox!.y);
  const minY = tops.length ? Math.min(...tops) : 0;
  const maxBottom = lines.reduce(
    (m, l) => (l.bbox ? Math.max(m, l.bbox.y + l.bbox.height) : m),
    1
  );
  const span = Math.max(maxBottom - minY, 1);

  let best: Scored | null = null;

  lines.forEach((line, i) => {
    const text = line.text.trim();
    if (text.length < 2) return;
    const norm = normalize(text);

    // Reject keyword, negative-keyword and contact/boilerplate lines.
    if (TOTAL_KEYWORDS.some((k) => norm.includes(normalize(k)))) return;
    if (NEGATIVE_KEYWORDS.some((k) => norm.includes(normalize(k)))) return;
    if (NOISE_PATTERNS.some((re) => re.test(text))) return;

    const letters = (text.match(/\p{L}/gu) ?? []).length;
    const alphaRatio = letters / text.length;
    // Mostly digits/symbols, or too few letters → not a name (kills "eipt"-ish
    // is allowed by length but loses on the signals below; kills "12.99", "##").
    if (alphaRatio < 0.5 || letters < 3) return;

    let score = 0;

    // 1) Font size — the dominant cue. Biggest text ≈ the logo/name.
    if (line.bbox) score += (line.bbox.height / maxHeight) * 50;

    // 2) Vertical position — prefer the top of the receipt.
    if (line.bbox) {
      const rel = (line.bbox.y - minY) / span; // 0 top .. 1 bottom
      score += (1 - rel) * 25;
    } else {
      score += Math.max(0, 5 - i) * 4; // no geometry: use line order
    }

    // 3) Substance — more letters and multiple words look like a real name.
    score += Math.min(letters, 16);
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words >= 2) score += 6;

    // 4) Word-likeness — a vowel rules out consonant junk ("png", "tx").
    if (/[aeiouy]/i.test(text)) score += 4;
    else score -= 10;

    // 5) Caps — store logos are often all-caps / title case.
    const uppers = (text.match(/\p{Lu}/gu) ?? []).length;
    if (uppers / Math.max(letters, 1) > 0.6) score += 4;

    // 6) Demote leftover boilerplate words.
    if (BOILERPLATE.some((b) => norm.includes(b))) score -= 20;

    if (!best || score > best.score) {
      best = { text: text.replace(/\s+/g, ' '), score };
    }
  });

  return best ? (best as Scored).text : undefined;
}
