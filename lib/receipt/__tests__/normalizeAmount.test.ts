import { normalizeAmount } from '../normalizeAmount';

describe('normalizeAmount', () => {
  test('plain US decimal', () => {
    expect(normalizeAmount('12.50')).toBe(12.5);
    expect(normalizeAmount('1234.56')).toBe(1234.56);
  });

  test('European comma decimal', () => {
    expect(normalizeAmount('12,50')).toBe(12.5);
    expect(normalizeAmount('0,99')).toBe(0.99);
  });

  test('dot thousands + comma decimal (EU)', () => {
    expect(normalizeAmount('1.234,56')).toBe(1234.56);
    expect(normalizeAmount('1.234.567,89')).toBe(1234567.89);
  });

  test('comma thousands + dot decimal (US)', () => {
    expect(normalizeAmount('1,234.56')).toBe(1234.56);
    expect(normalizeAmount('1,234,567.89')).toBe(1234567.89);
  });

  test('space and apostrophe thousands separators', () => {
    expect(normalizeAmount('1 234,56')).toBe(1234.56);
    expect(normalizeAmount("1'234.56")).toBe(1234.56);
    expect(normalizeAmount('1 234 567.89')).toBe(1234567.89);
  });

  test('single separator with 3 trailing digits reads as thousands', () => {
    expect(normalizeAmount('1,234')).toBe(1234);
    expect(normalizeAmount('1.234')).toBe(1234);
    expect(normalizeAmount('12,345')).toBe(12345);
  });

  test('single separator with 2 trailing digits reads as decimal', () => {
    expect(normalizeAmount('5,5')).toBe(5.5);
    expect(normalizeAmount('99,99')).toBe(99.99);
  });

  test('repeated separator is always thousands grouping', () => {
    expect(normalizeAmount('1.234.567')).toBe(1234567);
    expect(normalizeAmount('1,234,567')).toBe(1234567);
  });

  test('strips currency symbols and noise', () => {
    expect(normalizeAmount('$12.50')).toBe(12.5);
    expect(normalizeAmount('€ 1.234,56')).toBe(1234.56);
    expect(normalizeAmount('TOTAL: 42,00 lei')).toBe(42.0);
  });

  test('zero-decimal currency treats separators as thousands', () => {
    expect(normalizeAmount('1,234', { decimals: 0 })).toBe(1234);
    expect(normalizeAmount('12,345', { decimals: 0 })).toBe(12345);
  });

  test('non-numeric input returns null', () => {
    expect(normalizeAmount('abc')).toBeNull();
    expect(normalizeAmount('')).toBeNull();
    expect(normalizeAmount('$')).toBeNull();
  });
});
