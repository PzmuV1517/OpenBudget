import { parseOcr } from '../parseReceipt';
import type { OcrResult } from '../types';

function ocr(...lines: string[]): OcrResult {
  return { lines: lines.map((text) => ({ text })) };
}

describe('parseOcr — total extraction', () => {
  test('US receipt: picks TOTAL line over subtotal/tax', () => {
    const r = parseOcr(
      ocr(
        'WHOLE FOODS MARKET',
        'Bananas        2.40',
        'Milk           3.59',
        'SUBTOTAL       5.99',
        'TAX            0.48',
        'TOTAL          6.47',
        'VISA           6.47'
      ),
      { defaultCurrency: 'USD' }
    );
    expect(r.amount).toBe(6.47);
    expect(r.amountMinor).toBe(647);
    expect(r.currency).toBe('USD');
    expect(r.merchant).toBe('WHOLE FOODS MARKET');
  });

  test('German receipt: comma decimals, EUR symbol, Gesamt keyword', () => {
    const r = parseOcr(
      ocr(
        'REWE',
        'Brot            1,99',
        'Käse            4,50',
        'Zwischensumme   6,49',
        'MwSt 7%         0,42',
        'Gesamt         6,49 €'
      ),
      { defaultCurrency: 'EUR' }
    );
    expect(r.amount).toBe(6.49);
    expect(r.amountMinor).toBe(649);
    expect(r.currency).toBe('EUR');
  });

  test('Romanian receipt: lei currency and Total de plata', () => {
    const r = parseOcr(
      ocr(
        'KAUFLAND',
        'Paine           3,50',
        'Lapte           5,20',
        'TOTAL DE PLATA  8,70 lei'
      ),
      { defaultCurrency: 'RON' }
    );
    expect(r.amount).toBe(8.7);
    expect(r.currency).toBe('RON');
  });

  test('Japanese receipt: zero-decimal yen, 合計 keyword', () => {
    const r = parseOcr(
      ocr('セブンイレブン', 'おにぎり   ¥150', 'お茶      ¥130', '合計      ¥280'),
      { defaultCurrency: 'JPY' }
    );
    expect(r.amount).toBe(280);
    expect(r.amountMinor).toBe(280); // yen has no minor unit
    expect(r.currency).toBe('JPY');
  });

  test('thousands grouping in the grand total', () => {
    const r = parseOcr(
      ocr('ELECTRONICS', 'Laptop      1.299,00', 'TOTAL      1.299,00 €'),
      { defaultCurrency: 'EUR' }
    );
    expect(r.amount).toBe(1299);
    expect(r.amountMinor).toBe(129900);
  });

  test('returns null amount when there are no numbers', () => {
    const r = parseOcr(ocr('THANK YOU', 'COME AGAIN'), { defaultCurrency: 'USD' });
    expect(r.amount).toBeNull();
    expect(r.amountMinor).toBeNull();
  });

  test('geometry: lower bbox wins when keyword is absent', () => {
    const r = parseOcr({
      lines: [
        { text: 'Item A 10.00', bbox: { x: 0, y: 10, width: 100, height: 12 } },
        { text: 'Item B 25.00', bbox: { x: 0, y: 200, width: 100, height: 12 } },
      ],
    });
    // No total keyword; the lower line should rank first.
    expect(r.candidates[0].value).toBe(25);
  });
});
