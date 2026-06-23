import { parseOcr } from '../parseReceipt';
import type { BBox, OcrLine, OcrResult } from '../types';

const at = (text: string, x: number, y: number): OcrLine => {
  const bbox: BBox = { x, y, width: 80, height: 14 };
  return { text, bbox };
};
const ocr = (...lines: OcrLine[]): OcrResult => ({ lines });

function receipt(): OcrResult {
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

describe('line item extraction', () => {
  test('extracts item rows with name + price, in order', () => {
    const r = parseOcr(receipt(), { defaultCurrency: 'USD' });
    expect(r.items).toEqual([
      { name: 'HDMI Cable', price: 19.99 },
      { name: 'USB-C Hub', price: 30.0 },
    ]);
  });

  test('does not include subtotal, tax, or total as items', () => {
    const r = parseOcr(receipt(), { defaultCurrency: 'USD' });
    const names = r.items.map((i) => i.name.toLowerCase());
    expect(names.some((n) => n.includes('subtotal'))).toBe(false);
    expect(names.some((n) => n.includes('tax'))).toBe(false);
    expect(names.some((n) => n.includes('total'))).toBe(false);
    expect(r.items.some((i) => i.price === 54.11)).toBe(false);
  });

  test('no items when nothing parses as an item row', () => {
    const r = parseOcr({ lines: [{ text: 'TOTAL 9.99' }] }, { defaultCurrency: 'USD' });
    expect(r.items).toEqual([]);
  });

  test('ignores store address, phone, and ZIP in the header', () => {
    const r = parseOcr(
      ocr(
        at('BEST BUY', 20, 0),
        at('1234 Market St', 10, 20),
        at('Springfield IL 62704', 10, 34),
        at('Tel 555-123-4567', 10, 48),
        at('Store #00231', 10, 62),
        at('HDMI Cable', 10, 100),
        at('19.99', 220, 100),
        at('USB-C Hub', 10, 120),
        at('30.00', 220, 120),
        at('TOTAL', 10, 160),
        at('49.99', 220, 160)
      ),
      { defaultCurrency: 'USD' }
    );
    expect(r.items).toEqual([
      { name: 'HDMI Cable', price: 19.99 },
      { name: 'USB-C Hub', price: 30.0 },
    ]);
    // None of the header noise leaked in.
    const names = r.items.map((i) => i.name.toLowerCase()).join(' ');
    expect(names).not.toMatch(/market|springfield|tel|store/);
  });
});
