import {
  decimalsFor,
  formatMoney,
  progressRatio,
  toMajorUnits,
  toMinorUnits,
} from '../money';

describe('money', () => {
  test('decimalsFor by currency', () => {
    expect(decimalsFor('USD')).toBe(2);
    expect(decimalsFor('eur')).toBe(2);
    expect(decimalsFor('JPY')).toBe(0);
    expect(decimalsFor('KWD')).toBe(3);
  });

  test('minor/major round trip', () => {
    expect(toMinorUnits(12.5, 'USD')).toBe(1250);
    expect(toMinorUnits(280, 'JPY')).toBe(280);
    expect(toMajorUnits(1250, 'USD')).toBe(12.5);
    expect(toMajorUnits(280, 'JPY')).toBe(280);
  });

  test('no float drift on awkward values', () => {
    expect(toMinorUnits(0.1 + 0.2, 'USD')).toBe(30);
    expect(toMinorUnits(19.99, 'USD')).toBe(1999);
  });

  test('formatMoney renders currency', () => {
    // Exact glyphs vary by ICU build; assert the number is present.
    expect(formatMoney(1250, 'USD', 'en-US')).toContain('12.50');
    expect(formatMoney(280, 'JPY', 'ja-JP')).toContain('280');
  });

  test('progressRatio clamps to [0,1]', () => {
    expect(progressRatio(50, 100)).toBe(0.5);
    expect(progressRatio(150, 100)).toBe(1);
    expect(progressRatio(10, 0)).toBe(0);
  });
});
