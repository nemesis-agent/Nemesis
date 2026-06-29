import { pool } from "./client.js";

export type RuntimeHealthStatus = "starting" | "healthy" | "degraded" | "error";

export interface RuntimeHealth {
  key: string;
  status: RuntimeHealthStatus;
  details: Record<string, unknown>;
  lastHeartbeatAt: string;
  updatedAt: string;
}

interface RuntimeHealthRow {
  key: string;
  status: RuntimeHealthStatus;
  details: string | null;
  last_heartbeat_at: Date;
  updated_at: Date;
}

function rowToRuntimeHealth(row: RuntimeHealthRow): RuntimeHealth {
  return {
    key: row.key,
    status: row.status,
    details: row.details ? JSON.parse(row.details) : {},
    lastHeartbeatAt: row.last_heartbeat_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function recordRuntimeHealth(
  key: string,
  status: RuntimeHealthStatus,
  details: Record<string, unknown> = {},
): Promise<void> {
  await pool.query(
    `INSERT INTO runtime_health (key, status, details, last_heartbeat_at, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (key)
     DO UPDATE SET
       status = EXCLUDED.status,
       details = EXCLUDED.details,
       last_heartbeat_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP`,
    [key, status, JSON.stringify(details)],
  );
}

export async function getRuntimeHealth(key: string): Promise<RuntimeHealth | undefined> {
  const { rows } = await pool.query("SELECT * FROM runtime_health WHERE key = $1", [key]);
  const row = rows[0] as RuntimeHealthRow | undefined;
  return row ? rowToRuntimeHealth(row) : undefined;
}