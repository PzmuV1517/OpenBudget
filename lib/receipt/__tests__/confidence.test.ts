import { parseOcr } from '../parseReceipt';
import type { OcrResult } from '../types';

const ocr = (...lines: string[]): OcrResult => ({
  lines: lines.map((text) => ({ text })),
});

describe('total confidence', () => {
  test('clear TOTAL line with decimals → high confidence', () => {
    const r = parseOcr(
      ocr('STORE', 'Item A 2.00', 'SUBTOTAL 6.00', 'TAX 0.47', 'TOTAL 6.47'),
      { defaultCurrency: 'USD' }
    );
    expect(r.amount).toBe(6.47);
    expect(r.confidence.level).toBe('high');
    expect(r.confidence.score).toBeGreaterThanOrEqual(0.7);
    expect(r.confidence.reasons).toContain('On a "total" row');
  });

  test('no keyword, just numbers → not high confidence', () => {
    const r = parseOcr(ocr('SHOP', 'Coffee 3.50', 'Cake 4.25'), {
      defaultCurrency: 'USD',
    });
    expect(r.confidence.level).not.toBe('high');
  });

  test('nothing numeric → zero confidence', () => {
    const r = parseOcr(ocr('THANK YOU', 'COME AGAIN'));
    expect(r.amount).toBeNull();
    expect(r.confidence.score).toBe(0);
    expect(r.confidence.level).toBe('low');
  });

  test('confidence score is bounded to [0,1]', () => {
    const r = parseOcr(ocr('GRAND TOTAL 19.99 USD'), { defaultCurrency: 'USD' });
    expect(r.confidence.score).toBeGreaterThanOrEqual(0);
    expect(r.confidence.score).toBeLessThanOrEqual(1);
  });
});
