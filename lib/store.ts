/**
 * In-memory cache over the SQLite layer. SQLite is the source of truth; this
 * store hydrates on launch and mirrors every write. Derived totals are computed
 * by the selectors below, never stored.
 */
import { create } from 'zustand';

import * as db from './db';
import type { Envelope, EnvelopeTotals, Transaction } from './db/types';
import { envelopePalette } from './theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface BudgetState {
  hydrated: boolean;
  defaultCurrency: string;
  themeMode: ThemeMode;
  envelopes: Envelope[];
  transactions: Transaction[];

  // Digital receipts (experimental notification capture).
  drEnabled: boolean;
  drApps: string[];
  /** True once the user has enabled it AND picked at least one app. */
  drConfiguredOnce: boolean;

  hydrate: () => void;
  setDefaultCurrency: (currency: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setDrEnabled: (enabled: boolean) => void;
  setDrApps: (apps: string[]) => void;

  addEnvelope: (input: {
    name: string;
    allocated: number;
    color?: string;
    icon?: string | null;
  }) => Envelope;
  updateEnvelope: (
    id: string,
    patch: Partial<Pick<Envelope, 'name' | 'allocated' | 'color' | 'icon'>>
  ) => void;
  deleteEnvelope: (id: string) => void;
  reorderEnvelopes: (orderedIds: string[]) => void;

  /** Record a spend or top-up. `amount` is signed minor units. */
  addTransaction: (input: db.NewTransaction) => Transaction;
  /** Convenience: positive top-up into an envelope. */
  topUp: (envelopeId: string, amount: number, currency: string, note?: string) => Transaction;
  updateTransaction: (
    id: string,
    patch: Partial<Pick<Transaction, 'note' | 'merchant' | 'lineItems'>>
  ) => void;
  deleteTransaction: (id: string) => void;

  /** Wipe all envelopes + transactions (keeps settings like theme/currency). */
  resetAll: () => void;
}

export const useBudget = create<BudgetState>((set, get) => ({
  hydrated: false,
  defaultCurrency: 'USD',
  themeMode: 'dark', // app defaults to the black/red dark theme
  envelopes: [],
  transactions: [],
  drEnabled: false,
  drApps: [],
  drConfiguredOnce: false,

  hydrate: () => {
    db.initDb();
    const storedMode = db.getSetting('themeMode') as ThemeMode | null;
    const storedCurrency = db.getSetting('defaultCurrency');
    let drApps: string[] = [];
    try {
      drApps = JSON.parse(db.getSetting('drApps') ?? '[]');
    } catch {
      drApps = [];
    }
    set({
      envelopes: db.getEnvelopes(),
      transactions: db.getTransactions(),
      themeMode: storedMode ?? 'dark',
      defaultCurrency: storedCurrency ?? 'USD',
      drEnabled: db.getSetting('drEnabled') === 'true',
      drApps,
      drConfiguredOnce: db.getSetting('drConfiguredOnce') === 'true',
      hydrated: true,
    });
  },

  setDefaultCurrency: (currency) => {
    const code = currency.toUpperCase();
    db.setSetting('defaultCurrency', code);
    set({ defaultCurrency: code });
  },

  setThemeMode: (mode) => {
    db.setSetting('themeMode', mode);
    set({ themeMode: mode });
  },

  setDrEnabled: (enabled) => {
    db.setSetting('drEnabled', enabled ? 'true' : 'false');
    set({ drEnabled: enabled });
  },

  setDrApps: (apps) => {
    db.setSetting('drApps', JSON.stringify(apps));
    // "Fully configured" once it's enabled with at least one app chosen.
    const configured = get().drConfiguredOnce || (get().drEnabled && apps.length > 0);
    if (configured && !get().drConfiguredOnce) {
      db.setSetting('drConfiguredOnce', 'true');
    }
    set({ drApps: apps, drConfiguredOnce: configured });
  },

  addEnvelope: (input) => {
    const existing = get().envelopes;
    const color =
      input.color ?? envelopePalette[existing.length % envelopePalette.length];
    const env = db.insertEnvelope({
      name: input.name,
      allocated: input.allocated,
      color,
      icon: input.icon ?? null,
      sortOrder: existing.length,
    });
    set({ envelopes: [...existing, env] });
    return env;
  },

  updateEnvelope: (id, patch) => {
    db.updateEnvelopeRow(id, patch);
    set({
      envelopes: get().envelopes.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  },

  deleteEnvelope: (id) => {
    db.deleteEnvelopeRow(id);
    set({
      envelopes: get().envelopes.filter((e) => e.id !== id),
      transactions: get().transactions.filter((t) => t.envelopeId !== id),
    });
  },

  reorderEnvelopes: (orderedIds) => {
    db.reorderEnvelopes(orderedIds);
    const byId = new Map(get().envelopes.map((e) => [e.id, e]));
    const next = orderedIds
      .map((id, i) => {
        const e = byId.get(id);
        return e ? { ...e, sortOrder: i } : null;
      })
      .filter((e): e is Envelope => e !== null);
    set({ envelopes: next });
  },

  addTransaction: (input) => {
    const txn = db.insertTransaction(input);
    set({ transactions: [txn, ...get().transactions] });
    return txn;
  },

  topUp: (envelopeId, amount, currency, note) => {
    return get().addTransaction({
      envelopeId,
      amount: Math.abs(amount),
      currency,
      note: note ?? 'Top-up',
      source: 'manual',
    });
  },

  updateTransaction: (id, patch) => {
    db.updateTransactionRow(id, patch);
    set({
      transactions: get().transactions.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      ),
    });
  },

  deleteTransaction: (id) => {
    db.deleteTransactionRow(id);
    set({ transactions: get().transactions.filter((t) => t.id !== id) });
  },

  resetAll: () => {
    db.resetDb();
    set({ envelopes: [], transactions: [] });
  },
}));

// ---- selectors (pure; call with state from the hook) -------------------------

export function envelopeTotals(
  envelopeId: string,
  transactions: Transaction[],
  allocated: number
): EnvelopeTotals {
  let spent = 0;
  let toppedUp = 0;
  for (const t of transactions) {
    if (t.envelopeId !== envelopeId) continue;
    if (t.amount < 0) spent += -t.amount;
    else toppedUp += t.amount;
  }
  return { spent, toppedUp, remaining: allocated + toppedUp - spent };
}

export interface BudgetSummary {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
}

export function budgetSummary(
  envelopes: Envelope[],
  transactions: Transaction[]
): BudgetSummary {
  let totalAllocated = 0;
  let totalSpent = 0;
  let totalToppedUp = 0;
  for (const e of envelopes) totalAllocated += e.allocated;
  for (const t of transactions) {
    if (t.amount < 0) totalSpent += -t.amount;
    else totalToppedUp += t.amount;
  }
  return {
    totalAllocated,
    totalSpent,
    totalRemaining: totalAllocated + totalToppedUp - totalSpent,
  };
}
