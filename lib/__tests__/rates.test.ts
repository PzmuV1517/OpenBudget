import { convertMinor, type Rates } from '../rates';

const rates: Rates = {
  base: 'USD',
  rates: { USD: 1, EUR: 0.5, JPY: 100 },
  fetchedAt: 0,
};

describe('convertMinor', () => {
  test('same currency is a no-op', () => {
    expect(convertMinor(1234, 'USD', 'USD', rates)).toBe(1234);
  });

  test('USD -> EUR halves (rate 0.5), staying in 2-decimal minor units', () => {
    // $10.00 -> €5.00
    expect(convertMinor(1000, 'USD', 'EUR', rates)).toBe(500);
  });

  test('crosses decimal scales: USD -> JPY (0 decimals)', () => {
    // $10.00 -> ¥1000 (JPY has no minor unit)
    expect(convertMinor(1000, 'USD', 'JPY', rates)).toBe(1000);
  });

  test('EUR -> USD via base', () => {
    // €5.00 -> $10.00
    expect(convertMinor(500, 'EUR', 'USD', rates)).toBe(1000);
  });

  test('falls back to 1:1 when rates are missing', () => {
    expect(convertMinor(1000, 'USD', 'GBP', rates)).toBe(1000); // no GBP rate
    expect(convertMinor(1000, 'USD', 'EUR', null)).toBe(1000); // no rates at all
  });
});
