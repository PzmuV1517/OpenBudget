/**
 * Pure budget math — no store, no SQLite, fully unit-testable. Derived figures
 * are computed here and never stored.
 */
import type { Creditor, Envelope, EnvelopeTotals, Transaction } from './db/types';
import type { ConvertFn } from './rates';

/**
 * Spent / topped-up / remaining for one envelope, all in the envelope's own
 * currency. Transactions in other currencies are converted in.
 */
export function envelopeTotals(
  envelopeId: string,
  transactions: Transaction[],
  allocated: number,
  currency: string,
  convert: ConvertFn
): EnvelopeTotals {
  let spent = 0;
  let toppedUp = 0;
  for (const t of transactions) {
    if (t.envelopeId !== envelopeId) continue;
    const amt = convert(Math.abs(t.amount), t.currency, currency);
    if (t.amount < 0) spent += amt;
    else toppedUp += amt;
  }
  return { spent, toppedUp, remaining: allocated + toppedUp - spent };
}

export interface BudgetSummary {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
}

/** Whole-budget totals, converted into the default (base) currency. */
export function budgetSummary(
  envelopes: Envelope[],
  transactions: Transaction[],
  base: string,
  convert: ConvertFn
): BudgetSummary {
  let totalAllocated = 0;
  let totalSpent = 0;
  let totalToppedUp = 0;
  for (const e of envelopes) totalAllocated += convert(e.allocated, e.currency, base);
  for (const t of transactions) {
    const amt = convert(Math.abs(t.amount), t.currency, base);
    if (t.amount < 0) totalSpent += amt;
    else totalToppedUp += amt;
  }
  return {
    totalAllocated,
    totalSpent,
    totalRemaining: totalAllocated + totalToppedUp - totalSpent,
  };
}

/** The N envelopes with the most spending transactions, most-used first. */
export function topEnvelopes(
  envelopes: Envelope[],
  transactions: Transaction[],
  n: number
): Envelope[] {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    if (t.amount < 0) counts.set(t.envelopeId, (counts.get(t.envelopeId) ?? 0) + 1);
  }
  return [...envelopes]
    .sort(
      (a, b) =>
        (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) ||
        a.sortOrder - b.sortOrder
    )
    .slice(0, n);
}

/** Sum of outstanding money owed to an envelope, in the envelope's currency. */
export function envelopeOwed(
  creditors: Creditor[],
  envelopeId: string,
  currency: string,
  convert: ConvertFn
): number {
  let sum = 0;
  for (const c of creditors) {
    if (c.envelopeId === envelopeId) sum += convert(c.amount, c.currency, currency);
  }
  return sum;
}

/**
 * Ring fractions for an envelope. Owed money counts toward the total, so the
 * denominator is budget + owed: an empty envelope with only owed money reads as
 * 100% blue (`owed`), and once collected that money becomes in-hand `fill` (the
 * colored arc). `fill` = money in hand, `owed` = promised but not yet collected.
 */
export function ringRatios(
  remaining: number,
  owed: number,
  budget: number
): { fill: number; owed: number; fillPct: number; owedPct: number } {
  const base = budget + owed;
  if (base <= 0) return { fill: 0, owed: 0, fillPct: 0, owedPct: 0 };
  const fill = Math.min(1, Math.max(0, remaining / base));
  const owedFrac = Math.min(1, Math.max(0, owed / base));
  return {
    fill,
    owed: owedFrac,
    fillPct: Math.round(fill * 100),
    owedPct: Math.round(owedFrac * 100),
  };
}

/** Home-screen rows: a bare envelope, or a stack grouping several envelopes. */
export type HomeRow =
  | { kind: 'single'; envelope: Envelope }
  | { kind: 'stack'; name: string; envelopes: Envelope[] };

/**
 * Group envelopes for the home screen. Envelopes sharing a `stack` name merge
 * into one row, placed where the first member sits; the rest render solo.
 * Input is assumed already ordered (by sort order).
 */
export function groupEnvelopes(envelopes: Envelope[]): HomeRow[] {
  const rows: HomeRow[] = [];
  const stackRow = new Map<string, Extract<HomeRow, { kind: 'stack' }>>();
  for (const env of envelopes) {
    const stack = env.stack?.trim();
    if (stack) {
      const existing = stackRow.get(stack);
      if (existing) {
        existing.envelopes.push(env);
      } else {
        const row = { kind: 'stack' as const, name: stack, envelopes: [env] };
        stackRow.set(stack, row);
        rows.push(row);
      }
    } else {
      rows.push({ kind: 'single', envelope: env });
    }
  }
  return rows;
}

export interface StackTotals {
  /** Total budget (allocations + top-ups) across members. */
  budget: number;
  spent: number;
  remaining: number;
  owed: number;
}

/** Stack aggregate, converted into the default (base) currency. */
export function stackTotals(
  members: Envelope[],
  transactions: Transaction[],
  creditors: Creditor[],
  base: string,
  convert: ConvertFn
): StackTotals {
  let budget = 0;
  let spent = 0;
  let remaining = 0;
  let owed = 0;
  for (const e of members) {
    const t = envelopeTotals(e.id, transactions, e.allocated, e.currency, convert);
    budget += convert(e.allocated + t.toppedUp, e.currency, base);
    spent += convert(t.spent, e.currency, base);
    remaining += convert(t.remaining, e.currency, base);
    owed += convert(envelopeOwed(creditors, e.id, e.currency, convert), e.currency, base);
  }
  return { budget, spent, remaining, owed };
}
