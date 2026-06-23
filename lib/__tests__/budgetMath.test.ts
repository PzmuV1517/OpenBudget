import {
  budgetSummary,
  envelopeOwed,
  envelopeTotals,
  groupEnvelopes,
  ringRatios,
  stackTotals,
  topEnvelopes,
} from '../budgetMath';
import type { Creditor, Envelope, Transaction } from '../db/types';
import type { ConvertFn } from '../rates';

// Tests use a single currency, so convert is identity.
const conv: ConvertFn = (m) => m;

const env = (id: string, allocated: number, stack: string | null = null): Envelope => ({
  id,
  name: id,
  allocated,
  color: '#fff',
  icon: null,
  stack,
  currency: 'USD',
  sortOrder: 0,
  createdAt: 0,
});

const spend = (envelopeId: string, amount: number): Transaction => ({
  id: `t-${Math.random()}`,
  envelopeId,
  amount: -amount,
  currency: 'USD',
  note: null,
  merchant: null,
  source: 'manual',
  rawOcr: null,
  lineItems: null,
  createdAt: 0,
});

const owe = (envelopeId: string, amount: number): Creditor => ({
  id: `c-${Math.random()}`,
  envelopeId,
  name: 'Sam',
  amount,
  currency: 'USD',
  note: null,
  createdAt: 0,
});

describe('budgetMath', () => {
  test('envelopeTotals computes spent and remaining', () => {
    const t = envelopeTotals('a', [spend('a', 3000), spend('b', 100)], 10000, 'USD', conv);
    expect(t.spent).toBe(3000);
    expect(t.remaining).toBe(7000);
  });

  test('envelopeOwed sums only that envelope', () => {
    const creditors = [owe('a', 2000), owe('a', 500), owe('b', 999)];
    expect(envelopeOwed(creditors, 'a', 'USD', conv)).toBe(2500);
    expect(envelopeOwed(creditors, 'b', 'USD', conv)).toBe(999);
    expect(envelopeOwed(creditors, 'c', 'USD', conv)).toBe(0);
  });

  test('groupEnvelopes merges by stack name, keeps singles, preserves order', () => {
    const envs = [
      env('cardCash', 10000, 'Cash'),
      env('groceries', 40000),
      env('actualCash', 5000, 'Cash'),
    ];
    const rows = groupEnvelopes(envs);
    // Stack appears at the first member's position (index 0), groceries after.
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: 'stack', name: 'Cash' });
    expect((rows[0] as { envelopes: Envelope[] }).envelopes.map((e) => e.id)).toEqual([
      'cardCash',
      'actualCash',
    ]);
    expect(rows[1]).toMatchObject({ kind: 'single' });
  });

  test('stackTotals aggregates budget, spent, remaining, owed across members', () => {
    const members = [env('cardCash', 10000, 'Cash'), env('actualCash', 5000, 'Cash')];
    const txns = [spend('cardCash', 2000), spend('actualCash', 1000)];
    const creditors = [owe('actualCash', 3000)];
    const totals = stackTotals(members, txns, creditors, 'USD', conv);
    expect(totals.budget).toBe(15000);
    expect(totals.spent).toBe(3000);
    expect(totals.remaining).toBe(12000);
    expect(totals.owed).toBe(3000);
  });

  test('ringRatios: empty envelope with only owed money is 100% blue', () => {
    // allocated 0, nothing in hand, $50 owed.
    const r = ringRatios(0, 5000, 0);
    expect(r.fill).toBe(0);
    expect(r.owed).toBe(1);
    expect(r.owedPct).toBe(100);
    expect(r.fillPct).toBe(0);
  });

  test('ringRatios: collected money (in hand, no owed) is fully filled', () => {
    const r = ringRatios(5000, 0, 5000);
    expect(r.fill).toBe(1);
    expect(r.owed).toBe(0);
    expect(r.fillPct).toBe(100);
  });

  test('ringRatios: funded envelope with no owed behaves as remaining/budget', () => {
    const r = ringRatios(7000, 0, 10000);
    expect(r.fillPct).toBe(70);
    expect(r.owed).toBe(0);
  });

  test('ringRatios: budget + owed is the denominator (in-hand vs promised)', () => {
    // remaining 70, owed 50, budget 100 -> base 150
    const r = ringRatios(7000, 5000, 10000);
    expect(r.fillPct).toBe(Math.round((7000 / 15000) * 100)); // 47
    expect(r.owedPct).toBe(Math.round((5000 / 15000) * 100)); // 33
  });

  test('topEnvelopes ranks by spending count', () => {
    const a = env('a', 100);
    const b = env('b', 100);
    const c = env('c', 100);
    const txns = [spend('b', 1), spend('b', 1), spend('b', 1), spend('a', 1)];
    const top = topEnvelopes([a, b, c], txns, 2);
    expect(top.map((e) => e.id)).toEqual(['b', 'a']);
  });

  test('budgetSummary totals across envelopes', () => {
    const s = budgetSummary([env('a', 10000), env('b', 5000)], [spend('a', 2000)], 'USD', conv);
    expect(s.totalAllocated).toBe(15000);
    expect(s.totalSpent).toBe(2000);
    expect(s.totalRemaining).toBe(13000);
  });
});
