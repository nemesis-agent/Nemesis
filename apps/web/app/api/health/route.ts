import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const DATABASE_URL = process.env.DATABASE_URL;
const RUNNER_HEALTH_KEY = "telegram-runner";
const RUNNER_STALE_AFTER_MS = 5 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var nemesisHealthPool: Pool | undefined;
}

interface RuntimeHealthRow {
  status: "starting" | "healthy" | "degraded" | "error";
  details: string | null;
  last_heartbeat_at: Date;
  updated_at: Date;
}

function getHealthPool() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL must be set.");
  }

  globalThis.nemesisHealthPool ??= new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  return globalThis.nemesisHealthPool;
}

function parseDetails(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function readRunnerHealth(pool: Pool) {
  try {
    const { rows } = await pool.query(
      "SELECT status, details, last_heartbeat_at, updated_at FROM runtime_health WHERE key = $1",
      [RUNNER_HEALTH_KEY],
    );
    const row = rows[0] as RuntimeHealthRow | undefined;
    if (!row) {
      return { status: "unknown", stale: true, lastHeartbeatAt: null, ageSeconds: null, details: {} };
    }

    const ageMs = Date.now() - row.last_heartbeat_at.getTime();
    return {
      status: row.status,
      stale: ageMs > RUNNER_STALE_AFTER_MS,
      lastHeartbeatAt: row.last_heartbeat_at.toISOString(),
      ageSeconds: Math.max(0, Math.round(ageMs / 1000)),
      details: parseDetails(row.details),
    };
  } catch {
    return { status: "unavailable", stale: true, lastHeartbeatAt: null, ageSeconds: null, details: {} };
  }
}

export async function GET() {
  try {
    const pool = getHealthPool();
    await pool.query("SELECT 1");
    const runner = await readRunnerHealth(pool);
    const runnerHealthy = runner.status === "healthy" && !runner.stale;

    return NextResponse.json({
      status: runnerHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      database: "connected",
      runner,
    }, { status: 200 });
  } catch (error) {
    console.error("[Health Check Error]:", error);
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: "database unavailable",
    }, { status: 503 });
  }
}
