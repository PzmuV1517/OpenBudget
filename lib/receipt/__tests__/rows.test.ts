import { extractTotal } from '../extractTotal';
import { parseOcr } from '../parseReceipt';
import type { BBox, OcrLine, OcrResult } from '../types';

// Helper: place text at a row (y) and column (x). Labels go left, prices right.
const at = (text: string, x: number, y: number): OcrLine => {
  const bbox: BBox = { x, y, width: 80, height: 14 };
  return { text, bbox };
};
const ocr = (...lines: OcrLine[]): OcrResult => ({ lines });

/**
 * The real-world failure: ML Kit splits each label and its price into separate
 * lines that share a y. Subtotal/tax/total all read the same value column.
 */
function bestBuyish(): OcrResult {
  return ocr(
    at('BEST BUY', 20, 0),
    at('HDMI Cable', 10, 40),
    at('19.99', 220, 40),
    at('USB-C Hub', 10, 60),
    at('30.00', 220, 60),
    at('SUBTOTAL', 10, 100),
    at('49.99', 220, 100),
    at('TAX', 10, 120),
    at('4.12', 220, 120),
    at('TOTAL', 10, 140),
    at('54.11', 220, 140)
  );
}

describe('row reconstruction → total', () => {
  test('pairs the TOTAL label with its price across split lines', () => {
    const r = extractTotal(bestBuyish(), { defaultCurrency: 'USD' });
    expect(r.amount).toBe(54.11);
  });

  test('does not pick subtotal, tax, or an item price', () => {
    const r = extractTotal(bestBuyish(), { defaultCurrency: 'USD' });
    expect(r.amount).not.toBe(49.99); // subtotal
    expect(r.amount).not.toBe(4.12); // tax
    expect(r.amount).not.toBe(30.0); // item
  });

  test('the total row is classified and confidence is high', () => {
    const r = parseOcr(bestBuyish(), { defaultCurrency: 'USD' });
    expect(r.amount).toBe(54.11);
    expect(r.candidates[0].kind).toBe('total');
    expect(r.confidence.level).toBe('high');
  });

  test('subtotal row is classified as subtotal, not total', () => {
    const r = extractTotal(bestBuyish(), { defaultCurrency: 'USD' });
    const subtotal = r.candidates.find((c) => c.value === 49.99);
    expect(subtotal?.kind).toBe('subtotal');
    const tax = r.candidates.find((c) => c.value === 4.12);
    expect(tax?.kind).toBe('tax');
  });
});
