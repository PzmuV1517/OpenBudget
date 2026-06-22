/**
 * SQLite access layer. The store talks to these functions; nothing else touches
 * the database directly. All money in/out is integer minor units.
 */
import * as SQLite from 'expo-sqlite';

import { uid } from '../id';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';
import type { Envelope, Transaction, TransactionSource } from './types';

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
    // Future migrations slot in here, keyed by `current`.
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
  sort_order: number;
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
  created_at: number;
}

function mapEnvelope(r: EnvelopeRow): Envelope {
  return {
    id: r.id,
    name: r.name,
    allocated: r.allocated,
    color: r.color ?? '#3B82F6',
    icon: r.icon,
    sortOrder: r.sort_order,
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
  sortOrder: number;
}

export function insertEnvelope(input: NewEnvelope): Envelope {
  const env: Envelope = {
    id: uid('env_'),
    name: input.name,
    allocated: input.allocated,
    color: input.color,
    icon: input.icon ?? null,
    sortOrder: input.sortOrder,
    createdAt: Date.now(),
  };
  conn().runSync(
    `INSERT INTO envelopes (id, name, allocated, color, icon, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [env.id, env.name, env.allocated, env.color, env.icon, env.sortOrder, env.createdAt]
  );
  return env;
}

export function updateEnvelopeRow(
  id: string,
  patch: Partial<Pick<Envelope, 'name' | 'allocated' | 'color' | 'icon' | 'sortOrder'>>
): void {
  const fields: string[] = [];
  const values: SQLite.SQLiteBindValue[] = [];
  if (patch.name !== undefined) (fields.push('name = ?'), values.push(patch.name));
  if (patch.allocated !== undefined)
    (fields.push('allocated = ?'), values.push(patch.allocated));
  if (patch.color !== undefined) (fields.push('color = ?'), values.push(patch.color));
  if (patch.icon !== undefined) (fields.push('icon = ?'), values.push(patch.icon));
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
    createdAt: Date.now(),
  };
  conn().runSync(
    `INSERT INTO transactions
       (id, envelope_id, amount, currency, note, merchant, source, raw_ocr, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      txn.id,
      txn.envelopeId,
      txn.amount,
      txn.currency,
      txn.note,
      txn.merchant,
      txn.source,
      txn.rawOcr,
      txn.createdAt,
    ]
  );
  return txn;
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

/** Test/dev helper: wipe everything. */
export function resetDb(): void {
  const c = conn();
  c.withTransactionSync(() => {
    c.runSync('DELETE FROM transactions');
    c.runSync('DELETE FROM envelopes');
  });
}
