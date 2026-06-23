/** Domain types. All money fields are integer minor units. */

export type TransactionSource = 'manual' | 'scan';

/** A persisted line item. Price is in integer MINOR units (like all money). */
export interface LineItem {
  name: string;
  price: number;
}

export interface Envelope {
  id: string;
  name: string;
  allocated: number; // minor units
  color: string;
  icon: string | null;
  /** Optional stack name; envelopes sharing one are merged on the home screen. */
  stack: string | null;
  /** ISO 4217 currency the allocation is held in. */
  currency: string;
  sortOrder: number;
  createdAt: number; // epoch ms
}

/** Money someone owes you, earmarked to an envelope, not yet collected. */
export interface Creditor {
  id: string;
  envelopeId: string;
  name: string | null;
  amount: number; // minor units, positive
  currency: string;
  note: string | null;
  createdAt: number;
}

export interface Transaction {
  id: string;
  envelopeId: string;
  amount: number; // minor units; negative = spend, positive = top-up
  currency: string; // ISO 4217
  note: string | null;
  merchant: string | null;
  source: TransactionSource;
  rawOcr: string | null;
  /** Itemized bill, if the user kept one; otherwise null. */
  lineItems: LineItem[] | null;
  createdAt: number; // epoch ms
}

/** Derived per-envelope figures, computed never stored. */
export interface EnvelopeTotals {
  spent: number; // positive amount spent (sum of negative txns, sign-flipped)
  toppedUp: number; // sum of positive non-allocation top-ups
  remaining: number; // allocated + sum(all txns)
}
