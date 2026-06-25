import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Resolves to the same file regardless of which app opens it, as long as
 * each app is run from its own directory via the npm workspace scripts
 * (apps/web, apps/telegram-bot — both exactly two levels below the repo
 * root). Override with NEMESIS_DB_PATH for production deployments where
 * the two apps run from different working directories or you want the
 * database on a specific persistent volume.
 */
const DEFAULT_DB_PATH = resolve(process.cwd(), "../../data/nemesis.db");
const DB_PATH = process.env.NEMESIS_DB_PATH ?? DEFAULT_DB_PATH;

mkdirSync(dirname(DB_PATH), { recursive: true });

const isNewDatabase = !existsSync(DB_PATH);

export const db = new DatabaseSync(DB_PATH);

// SQLite enforces foreign keys only when explicitly turned on per connection.
db.exec("PRAGMA foreign_keys = ON;");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  wallet_address    TEXT PRIMARY KEY,
  telegram_chat_id  TEXT UNIQUE,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS link_codes (
  code              TEXT PRIMARY KEY,
  wallet_address    TEXT NOT NULL,
  expires_at        TEXT NOT NULL,
  used_at           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agents (
  id                TEXT PRIMARY KEY,
  wallet_address    TEXT NOT NULL,
  template_id       TEXT NOT NULL,
  name              TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('active', 'paused', 'awaiting-approval')),
  parameters        TEXT NOT NULL DEFAULT '{}',
  last_checked_at   TEXT,
  last_event        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proposals (
  id                  TEXT PRIMARY KEY,
  agent_id            TEXT NOT NULL REFERENCES agents(id),
  title               TEXT NOT NULL,
  details             TEXT NOT NULL DEFAULT '[]',
  proposed_action     TEXT NOT NULL,
  estimated_gas_usd   TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'skipped')),
  tx_hash             TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agents_wallet ON agents(wallet_address);
CREATE INDEX IF NOT EXISTS idx_proposals_agent ON proposals(agent_id);
CREATE INDEX IF NOT EXISTS idx_link_codes_wallet ON link_codes(wallet_address);
`;

db.exec(SCHEMA);

export { DB_PATH, isNewDatabase };
