/**
 * SQLite access layer. The store talks to these functions; nothing else touches
 * the database directly. All money in/out is integer minor units.
 */
import * as SQLite from 'expo-sqlite';

import { uid } from '../id';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';
import type {
  Creditor,
  Envelope,
  LineItem,
  Transaction,
  TransactionSource,
} from './types';

const DB_NAME = 'openbudget.db';

let db: SQLite.SQLiteDatabase | null = null;

function conn(): SQLite.SQLiteDatabase {
  if (!db) db = SQLite.openDatabaseSync(DB_NAME);
  return db;
}

/** Run DDL + migrations. Idempotent; call once on launch. */
export function initDb(): void {
  const c = conn();
  c.execSync(SCHEMA_SQL);
  const row = c.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current < SCHEMA_VERSION) {
    if (current < 2) {
      // v1 -> v2: itemized bills. Fresh DBs already have the column from the
      // CREATE TABLE above, so tolerate the "duplicate column" error.
      try {
        c.execSync('ALTER TABLE transactions ADD COLUMN line_items TEXT');
      } catch {
        // column already exists
      }
    }
    if (current < 3) {
      // v2 -> v3: envelope stacks + creditors. (creditors table is created by
      // SCHEMA_SQL above via IF NOT EXISTS.)
      try {
        c.execSync('ALTER TABLE envelopes ADD COLUMN stack TEXT');
      } catch {
        // column already exists
      }
    }
    if (current < 4) {
      // v3 -> v4: per-envelope currency.
      try {
        c.execSync('ALTER TABLE envelopes ADD COLUMN currency TEXT');
      } catch {
        // column already exists
      }
    }
    c.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

// ---- row mappers -------------------------------------------------------------

interface EnvelopeRow {
  id: string;
  name: string;
  allocated: number;
  color: string | null;
  icon: string | null;
  stack: string | null;
  currency: string | null;
  sort_order: number;
  created_at: number;
}

interface CreditorRow {
  id: string;
  envelope_id: string;
  name: string | null;
  amount: number;
  currency: string;
  note: string | null;
  created_at: number;
}

interface TxnRow {
  id: string;
  envelope_id: string;
  amount: number;
  currency: string;
  note: string | null;
  merchant: string | null;
  source: string;
  raw_ocr: string | null;
  line_items: string | null;
  created_at: number;
}

/** Parse the stored line_items JSON, tolerating malformed/legacy values. */
function parseLineItems(json: string | null): LineItem[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as LineItem[]) : null;
  } catch {
    return null;
  }
}

function mapEnvelope(r: EnvelopeRow): Envelope {
  return {
    id: r.id,
    name: r.name,
    allocated: r.allocated,
    color: r.color ?? '#3B82F6',
    icon: r.icon,
    stack: r.stack ?? null,
    currency: r.currency ?? 'USD',
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  };
}

function mapCreditor(r: CreditorRow): Creditor {
  return {
    id: r.id,
    envelopeId: r.envelope_id,
    name: r.name,
    amount: r.amount,
    currency: r.currency,
    note: r.note,
    createdAt: r.created_at,
  };
}

function mapTxn(r: TxnRow): Transaction {
  return {
    id: r.id,
    envelopeId: r.envelope_id,
    amount: r.amount,
    currency: r.currency,
    note: r.note,
    merchant: r.merchant,
    source: r.source as TransactionSource,
    rawOcr: r.raw_ocr,
    lineItems: parseLineItems(r.line_items),
    createdAt: r.created_at,
  };
}

// ---- envelopes ---------------------------------------------------------------

export function getEnvelopes(): Envelope[] {
  return conn()
    .getAllSync<EnvelopeRow>(
      'SELECT * FROM envelopes ORDER BY sort_order ASC, created_at ASC'
    )
    .map(mapEnvelope);
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
  conn().runSync(
    `INSERT INTO envelopes (id, name, allocated, color, icon, stack, currency, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      env.id,
      env.name,
      env.allocated,
      env.color,
      env.icon,
      env.stack,
      env.currency,
      env.sortOrder,
      env.createdAt,
    ]
  );
  return env;
}

export function updateEnvelopeRow(
  id: string,
  patch: Partial<
    Pick<Envelope, 'name' | 'allocated' | 'color' | 'icon' | 'stack' | 'currency' | 'sortOrder'>
  >
): void {
  const fields: string[] = [];
  const values: SQLite.SQLiteBindValue[] = [];
  if (patch.name !== undefined) (fields.push('name = ?'), values.push(patch.name));
  if (patch.allocated !== undefined)
    (fields.push('allocated = ?'), values.push(patch.allocated));
  if (patch.color !== undefined) (fields.push('color = ?'), values.push(patch.color));
  if (patch.icon !== undefined) (fields.push('icon = ?'), values.push(patch.icon));
  if (patch.stack !== undefined) (fields.push('stack = ?'), values.push(patch.stack));
  if (patch.currency !== undefined)
    (fields.push('currency = ?'), values.push(patch.currency));
  if (patch.sortOrder !== undefined)
    (fields.push('sort_order = ?'), values.push(patch.sortOrder));
  if (fields.length === 0) return;
  values.push(id);
  conn().runSync(`UPDATE envelopes SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function deleteEnvelopeRow(id: string): void {
  // ON DELETE CASCADE clears the envelope's transactions.
  conn().runSync('DELETE FROM envelopes WHERE id = ?', [id]);
}

/** Persist a new ordering as one transaction. */
export function reorderEnvelopes(orderedIds: string[]): void {
  const c = conn();
  c.withTransactionSync(() => {
    orderedIds.forEach((id, i) => {
      c.runSync('UPDATE envelopes SET sort_order = ? WHERE id = ?', [i, id]);
    });
  });
}

// ---- transactions ------------------------------------------------------------

export function getTransactions(envelopeId?: string): Transaction[] {
  const c = conn();
  const rows = envelopeId
    ? c.getAllSync<TxnRow>(
        'SELECT * FROM transactions WHERE envelope_id = ? ORDER BY created_at DESC',
        [envelopeId]
      )
    : c.getAllSync<TxnRow>('SELECT * FROM transactions ORDER BY created_at DESC');
  return rows.map(mapTxn);
}

export interface NewTransaction {
  envelopeId: string;
  amount: number; // signed minor units
  currency: string;
  note?: string | null;
  merchant?: string | null;
  source: TransactionSource;
  rawOcr?: string | null;
  lineItems?: LineItem[] | null;
}

export function insertTransaction(input: NewTransaction): Transaction {
  const lineItems = input.lineItems && input.lineItems.length > 0 ? input.lineItems : null;
  const txn: Transaction = {
    id: uid('txn_'),
    envelopeId: input.envelopeId,
    amount: input.amount,
    currency: input.currency,
    note: input.note ?? null,
    merchant: input.merchant ?? null,
    source: input.source,
    rawOcr: input.rawOcr ?? null,
    lineItems,
    createdAt: Date.now(),
  };
  conn().runSync(
    `INSERT INTO transactions
       (id, envelope_id, amount, currency, note, merchant, source, raw_ocr, line_items, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      txn.id,
      txn.envelopeId,
      txn.amount,
      txn.currency,
      txn.note,
      txn.merchant,
      txn.source,
      txn.rawOcr,
      lineItems ? JSON.stringify(lineItems) : null,
      txn.createdAt,
    ]
  );
  return txn;
}

export function updateTransactionRow(
  id: string,
  patch: Partial<Pick<Transaction, 'note' | 'merchant' | 'lineItems'>>
): void {
  const fields: string[] = [];
  const values: SQLite.SQLiteBindValue[] = [];
  if (patch.note !== undefined) (fields.push('note = ?'), values.push(patch.note));
  if (patch.merchant !== undefined)
    (fields.push('merchant = ?'), values.push(patch.merchant));
  if (patch.lineItems !== undefined) {
    const li = patch.lineItems && patch.lineItems.length > 0 ? patch.lineItems : null;
    fields.push('line_items = ?');
    values.push(li ? JSON.stringify(li) : null);
  }
  if (fields.length === 0) return;
  values.push(id);
  conn().runSync(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function deleteTransactionRow(id: string): void {
  conn().runSync('DELETE FROM transactions WHERE id = ?', [id]);
}

// ---- settings (key/value) ----------------------------------------------------

export function getSetting(key: string): string | null {
  const row = conn().getFirstSync<{ value: string | null }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  conn().runSync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

// ---- creditors ---------------------------------------------------------------

export function getCreditors(): Creditor[] {
  return conn()
    .getAllSync<CreditorRow>('SELECT * FROM creditors ORDER BY created_at DESC')
    .map(mapCreditor);
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
  conn().runSync(
    `INSERT INTO creditors (id, envelope_id, name, amount, currency, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cr.id, cr.envelopeId, cr.name, cr.amount, cr.currency, cr.note, cr.createdAt]
  );
  return cr;
}

export function updateCreditorRow(
  id: string,
  patch: Partial<Pick<Creditor, 'name' | 'amount' | 'note' | 'envelopeId'>>
): void {
  const fields: string[] = [];
  const values: SQLite.SQLiteBindValue[] = [];
  if (patch.name !== undefined) (fields.push('name = ?'), values.push(patch.name));
  if (patch.amount !== undefined) (fields.push('amount = ?'), values.push(patch.amount));
  if (patch.note !== undefined) (fields.push('note = ?'), values.push(patch.note));
  if (patch.envelopeId !== undefined)
    (fields.push('envelope_id = ?'), values.push(patch.envelopeId));
  if (fields.length === 0) return;
  values.push(id);
  conn().runSync(`UPDATE creditors SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function deleteCreditorRow(id: string): void {
  conn().runSync('DELETE FROM creditors WHERE id = ?', [id]);
}

/** New cycle: wipe all transactions so every envelope returns to its allocation. */
export function refreshBudget(): void {
  conn().runSync('DELETE FROM transactions');
}

/** Test/dev helper: wipe everything. */
export function resetDb(): void {
  const c = conn();
  c.withTransactionSync(() => {
    c.runSync('DELETE FROM creditors');
    c.runSync('DELETE FROM transactions');
    c.runSync('DELETE FROM envelopes');
  });
}
