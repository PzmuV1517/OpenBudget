/** Domain types. All money fields are integer minor units. */

export type TransactionSource = 'manual' | 'scan';

export interface Envelope {
  id: string;
  name: string;
  allocated: number; // minor units
  color: string;
  icon: string | null;
  sortOrder: number;
  createdAt: number; // epoch ms
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
  createdAt: number; // epoch ms
}

/** Derived per-envelope figures, computed never stored. */
export interface EnvelopeTotals {
  spent: number; // positive amount spent (sum of negative txns, sign-flipped)
  toppedUp: number; // sum of positive non-allocation top-ups
  remaining: number; // allocated + sum(all txns)
}
