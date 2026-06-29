import { pool } from "./client.js";

export interface ConsumeRateLimitInput {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

const RATE_LIMIT_SCHEMA = `
CREATE TABLE IF NOT EXISTS rate_limits (
  key           TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL CHECK (request_count >= 0),
  reset_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);
`;

const CLEANUP_INTERVAL_MS = 5 * 60_000;
let schemaReady: Promise<void> | null = null;
let lastCleanupAt = 0;

function ensureRateLimitSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(RATE_LIMIT_SCHEMA).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function cleanupExpiredRateLimits(now: number): Promise<void> {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  await pool.query("DELETE FROM rate_limits WHERE reset_at < CURRENT_TIMESTAMP - INTERVAL '1 day'");
}

export async function consumeRateLimit(input: ConsumeRateLimitInput): Promise<RateLimitResult> {
  if (!input.key || input.key.length > 160) throw new Error("Invalid rate-limit key.");
  if (!Number.isSafeInteger(input.limit) || input.limit < 1) throw new Error("Invalid rate-limit limit.");
  if (!Number.isSafeInteger(input.windowMs) || input.windowMs < 1_000) throw new Error("Invalid rate-limit window.");

  await ensureRateLimitSchema();

  const { rows } = await pool.query<{ request_count: number; reset_at: Date }>(
    `INSERT INTO rate_limits (key, request_count, reset_at, updated_at)
     VALUES ($1, 1, CURRENT_TIMESTAMP + ($2::bigint * INTERVAL '1 millisecond'), CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET
       request_count = CASE
         WHEN rate_limits.reset_at <= CURRENT_TIMESTAMP THEN 1
         ELSE LEAST(rate_limits.request_count + 1, 2147483647)
       END,
       reset_at = CASE
         WHEN rate_limits.reset_at <= CURRENT_TIMESTAMP
           THEN CURRENT_TIMESTAMP + ($2::bigint * INTERVAL '1 millisecond')
         ELSE rate_limits.reset_at
       END,
       updated_at = CURRENT_TIMESTAMP
     RETURNING request_count, reset_at`,
    [input.key, input.windowMs],
  );

  const row = rows[0];
  if (!row) throw new Error("Rate-limit counter did not return a result.");

  try {
    await cleanupExpiredRateLimits(Date.now());
  } catch {
    // Cleanup is maintenance-only; a successful atomic counter remains authoritative.
    lastCleanupAt = 0;
  }

  return {
    allowed: row.request_count <= input.limit,
    limit: input.limit,
    remaining: Math.max(0, input.limit - row.request_count),
    resetAt: row.reset_at,
  };
}
