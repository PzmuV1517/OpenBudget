/**
 * Web shim for the SQLite layer. expo-sqlite is native-only here, so for the
 * browser UI preview we back the exact same API with in-memory arrays. Data
 * resets on reload — this exists to eyeball screens before running on a device,
 * not for real persistence. Metro picks this file for `platform === 'web'`.
 */
import { uid } from '../id';
import type {
  Creditor,
  Envelope,
  LineItem,
  Transaction,
  TransactionSource,
} from './types';

let envelopes: Envelope[] = [];
let transactions: Transaction[] = [];
let creditors: Creditor[] = [];

export function initDb(): void {
  // Starts empty — same first-boot experience as the native SQLite layer.
}

export function getEnvelopes(): Envelope[] {
  return [...envelopes].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt
  );
}

export interface NewEnvelope {
  name: string;
  allocated: number;
  color: string;
  icon?: string | null;
  stack?: string | null;
  currency: string;
  sortOrder: number;
}

export function insertEnvelope(input: NewEnvelope): Envelope {
  const env: Envelope = {
    id: uid('env_'),
    name: input.name,
    allocated: input.allocated,
    color: input.color,
    icon: input.icon ?? null,
    stack: input.stack ?? null,
    currency: input.currency,
    sortOrder: input.sortOrder,
    createdAt: Date.now(),
  };
  envelopes.push(env);
  return env;
}

export function updateEnvelopeRow(
  id: string,
  patch: Partial<
    Pick<Envelope, 'name' | 'allocated' | 'color' | 'icon' | 'stack' | 'currency' | 'sortOrder'>
  >
): void {
  envelopes = envelopes.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

export function deleteEnvelopeRow(id: string): void {
  envelopes = envelopes.filter((e) => e.id !== id);
  transactions = transactions.filter((t) => t.envelopeId !== id);
}

export function reorderEnvelopes(orderedIds: string[]): void {
  const order = new Map(orderedIds.map((id, i) => [id, i]));
  envelopes = envelopes.map((e) =>
    order.has(e.id) ? { ...e, sortOrder: order.get(e.id)! } : e
  );
}

export function getTransactions(envelopeId?: string): Transaction[] {
  return transactions
    .filter((t) => (envelopeId ? t.envelopeId === envelopeId : true))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export interface NewTransaction {
  envelopeId: string;
  amount: number;
  currency: string;
  note?: string | null;
  merchant?: string | null;
  source: TransactionSource;
  rawOcr?: string | null;
  lineItems?: LineItem[] | null;
}

export function insertTransaction(input: NewTransaction): Transaction {
  const txn: Transaction = {
    id: uid('txn_'),
    envelopeId: input.envelopeId,
    amount: input.amount,
    currency: input.currency,
    note: input.note ?? null,
    merchant: input.merchant ?? null,
    source: input.source,
    rawOcr: input.rawOcr ?? null,
    lineItems: input.lineItems && input.lineItems.length > 0 ? input.lineItems : null,
    createdAt: Date.now(),
  };
  transactions.unshift(txn);
  return txn;
}

export function updateTransactionRow(
  id: string,
  patch: Partial<Pick<Transaction, 'note' | 'merchant' | 'lineItems'>>
): void {
  transactions = transactions.map((t) => {
    if (t.id !== id) return t;
    const next = { ...t, ...patch };
    if (patch.lineItems !== undefined) {
      next.lineItems = patch.lineItems && patch.lineItems.length > 0 ? patch.lineItems : null;
    }
    return next;
  });
}

export function deleteTransactionRow(id: string): void {
  transactions = transactions.filter((t) => t.id !== id);
}

// Settings persist in localStorage on web so the theme survives a reload, even
// though envelopes/transactions are in-memory only.
export function getSetting(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(`ob.${key}`) ?? null;
  } catch {
    return null;
  }
}

export function setSetting(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(`ob.${key}`, value);
  } catch {
    // Ignore — preview still works without persistence.
  }
}

// ---- creditors ---------------------------------------------------------------

export function getCreditors(): Creditor[] {
  return [...creditors].sort((a, b) => b.createdAt - a.createdAt);
}

export interface NewCreditor {
  envelopeId: string;
  name?: string | null;
  amount: number;
  currency: string;
  note?: string | null;
}

export function insertCreditor(input: NewCreditor): Creditor {
  const cr: Creditor = {
    id: uid('cr_'),
    envelopeId: input.envelopeId,
    name: input.name ?? null,
    amount: input.amount,
    currency: input.currency,
    note: input.note ?? null,
    createdAt: Date.now(),
  };
  creditors.unshift(cr);
  return cr;
}

export function updateCreditorRow(
  id: string,
  patch: Partial<Pick<Creditor, 'name' | 'amount' | 'note' | 'envelopeId'>>
): void {
  creditors = creditors.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export function deleteCreditorRow(id: string): void {
  creditors = creditors.filter((c) => c.id !== id);
}

export function refreshBudget(): void {
  transactions = [];
}

export function resetDb(): void {
  envelopes = [];
  transactions = [];
  creditors = [];
}
