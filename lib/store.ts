/**
 * In-memory cache over the SQLite layer. SQLite is the source of truth; this
 * store hydrates on launch and mirrors every write. Derived totals are computed
 * by the selectors below, never stored.
 */
import { create } from 'zustand';

import * as db from './db';
import type { Creditor, Envelope, Transaction } from './db/types';
import { fetchRates, type Rates } from './rates';
import { envelopePalette } from './theme';

// Pure derived-value helpers live in budgetMath; re-exported for existing callers.
export {
  envelopeTotals,
  budgetSummary,
  envelopeOwed,
  ringRatios,
  topEnvelopes,
  groupEnvelopes,
  stackTotals,
  type BudgetSummary,
  type HomeRow,
  type StackTotals,
} from './budgetMath';

export type ThemeMode = 'light' | 'dark' | 'system';

interface BudgetState {
  hydrated: boolean;
  defaultCurrency: string;
  themeMode: ThemeMode;
  /** Cached exchange rates, or null if never fetched. */
  rates: Rates | null;
  envelopes: Envelope[];
  transactions: Transaction[];
  creditors: Creditor[];

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
  /** Best-effort online refresh of exchange rates; no-op when offline. */
  refreshRates: () => Promise<void>;

  addEnvelope: (input: {
    name: string;
    allocated: number;
    color?: string;
    icon?: string | null;
    stack?: string | null;
    currency?: string;
  }) => Envelope;
  updateEnvelope: (
    id: string,
    patch: Partial<
      Pick<Envelope, 'name' | 'allocated' | 'color' | 'icon' | 'stack' | 'currency'>
    >
  ) => void;
  deleteEnvelope: (id: string) => void;
  reorderEnvelopes: (orderedIds: string[]) => void;

  /** New cycle: clears the ledger so every envelope returns to its allocation. */
  refreshBudget: () => void;

  // Creditors — money owed to you, earmarked to an envelope.
  addCreditor: (input: db.NewCreditor) => Creditor;
  updateCreditor: (
    id: string,
    patch: Partial<Pick<Creditor, 'name' | 'amount' | 'note' | 'envelopeId'>>
  ) => void;
  deleteCreditor: (id: string) => void;
  /** Collected: move the owed money into the envelope as a top-up this cycle. */
  collectCreditor: (id: string) => void;

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
  rates: null,
  envelopes: [],
  transactions: [],
  creditors: [],
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
    let rates: Rates | null = null;
    try {
      const raw = db.getSetting('rates');
      rates = raw ? (JSON.parse(raw) as Rates) : null;
    } catch {
      rates = null;
    }
    set({
      envelopes: db.getEnvelopes(),
      transactions: db.getTransactions(),
      creditors: db.getCreditors(),
      rates,
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

  refreshRates: async () => {
    const fresh = await fetchRates();
    if (fresh) {
      db.setSetting('rates', JSON.stringify(fresh));
      set({ rates: fresh });
    }
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
      stack: input.stack ?? null,
      currency: input.currency ?? get().defaultCurrency,
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

  refreshBudget: () => {
    db.refreshBudget();
    set({ transactions: [] });
  },

  addCreditor: (input) => {
    const cr = db.insertCreditor(input);
    set({ creditors: [cr, ...get().creditors] });
    return cr;
  },

  updateCreditor: (id, patch) => {
    db.updateCreditorRow(id, patch);
    set({
      creditors: get().creditors.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  },

  deleteCreditor: (id) => {
    db.deleteCreditorRow(id);
    set({ creditors: get().creditors.filter((c) => c.id !== id) });
  },

  collectCreditor: (id) => {
    const cr = get().creditors.find((c) => c.id === id);
    if (!cr) return;
    // The owed money becomes real money in the envelope this cycle.
    get().addTransaction({
      envelopeId: cr.envelopeId,
      amount: Math.abs(cr.amount),
      currency: cr.currency,
      note: cr.name ? `Debt collected: ${cr.name}` : 'Debt collected',
      source: 'manual',
    });
    db.deleteCreditorRow(id);
    set({ creditors: get().creditors.filter((c) => c.id !== id) });
  },

  resetAll: () => {
    db.resetDb();
    set({ envelopes: [], transactions: [], creditors: [] });
  },
}));
