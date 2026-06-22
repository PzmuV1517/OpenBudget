import { extractMerchant } from '../extractMerchant';
import type { OcrLine, OcrResult } from '../types';

const line = (text: string, y?: number, height?: number): OcrLine =>
  y != null
    ? { text, bbox: { x: 0, y, width: 200, height: height ?? 12 } }
    : { text };

const ocr = (...lines: OcrLine[]): OcrResult => ({ lines });

describe('extractMerchant', () => {
  test('font size wins: store name over OCR fragments (the Best Buy case)', () => {
    // "eipt" is the tail of "receipt"; the logo is the largest text.
    const r = extractMerchant(
      ocr(
        line('eipt', 4, 10),
        line('BEST BUY', 20, 34),
        line('1234 Market St', 70, 10),
        line('TOTAL 49.99', 200, 12)
      )
    );
    expect(r).toBe('BEST BUY');
  });

  test('no geometry: prefers the substantial multi-word capitalized line', () => {
    const r = extractMerchant(ocr(line('eipt'), line('BEST BUY'), line('air'), line('png')));
    expect(r).toBe('BEST BUY');
  });

  test('consonant junk like "png" never wins', () => {
    const r = extractMerchant(ocr(line('png'), line('Trader Joes')));
    expect(r).toBe('Trader Joes');
  });

  test('skips contact / URL / boilerplate lines', () => {
    const r = extractMerchant(
      ocr(
        line('www.bestbuy.com', 4, 12),
        line('Tel 555-123-4567', 18, 12),
        line('WHOLE FOODS', 36, 30),
        line('RECEIPT', 60, 12)
      )
    );
    expect(r).toBe('WHOLE FOODS');
  });

  test('returns undefined when there is no name-like line', () => {
    expect(extractMerchant(ocr(line('12.99'), line('$ 4.50')))).toBeUndefined();
    expect(extractMerchant(ocr())).toBeUndefined();
  });
});
