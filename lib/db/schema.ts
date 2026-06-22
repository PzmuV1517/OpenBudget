/** SQLite DDL. Bump SCHEMA_VERSION and add a migration when this changes. */

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS envelopes (
  id          TEXT PRIMARY KEY NOT NULL,
  name        TEXT NOT NULL,
  allocated   INTEGER NOT NULL DEFAULT 0,
  color       TEXT,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT PRIMARY KEY NOT NULL,
  envelope_id TEXT NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  currency    TEXT NOT NULL,
  note        TEXT,
  merchant    TEXT,
  source      TEXT NOT NULL,
  raw_ocr     TEXT,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_txn_envelope ON transactions(envelope_id);
CREATE INDEX IF NOT EXISTS idx_txn_created  ON transactions(created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
`;
