import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("NEMESIS: DATABASE_URL is not set. The Supabase Postgres migration requires this variable.");
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  wallet_address    TEXT PRIMARY KEY,
  telegram_chat_id  TEXT UNIQUE,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS link_codes (
  code              TEXT PRIMARY KEY,
  wallet_address    TEXT NOT NULL,
  expires_at        TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at           TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agents (
  id                TEXT PRIMARY KEY,
  wallet_address    TEXT NOT NULL,
  template_id       TEXT NOT NULL,
  name              TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('active', 'paused', 'awaiting-approval')),
  parameters        TEXT NOT NULL DEFAULT '{}',
  runtime_state     TEXT NOT NULL DEFAULT '{}',
  last_checked_at   TIMESTAMP WITH TIME ZONE,
  last_event        TEXT,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  unsigned_tx_payload TEXT,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agents_wallet ON agents(wallet_address);
CREATE INDEX IF NOT EXISTS idx_proposals_agent ON proposals(agent_id);
CREATE INDEX IF NOT EXISTS idx_link_codes_wallet ON link_codes(wallet_address);
`;

// Initialize schema on import
if (DATABASE_URL) {
  pool.query(SCHEMA)
    .then(() => {
      return pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='proposals' AND column_name='unsigned_tx_payload'
          ) THEN
            ALTER TABLE proposals ADD COLUMN unsigned_tx_payload TEXT;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='agents' AND column_name='runtime_state'
          ) THEN
            ALTER TABLE agents ADD COLUMN runtime_state TEXT NOT NULL DEFAULT '{}';
          END IF;
        END $$;
      `);
    })
    .catch(err => {
      console.error("Failed to initialize database schema or run migrations:", err);
    });
}

