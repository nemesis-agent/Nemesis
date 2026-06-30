import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const DATABASE_URL = process.env.DATABASE_URL;
const RUNNER_HEALTH_KEY = "telegram-runner";
const TELEGRAM_HEALTH_KEY = "telegram-bot";
const RUNNER_STALE_AFTER_MS = 5 * 60 * 1000;
const TELEGRAM_STALE_AFTER_MS = 5 * 60 * 1000;
const RPC_TIMEOUT_MS = 2_500;
const DEFAULT_BASE_RPC_URL = "https://mainnet.base.org";
const DEFAULT_SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
const APP_STARTED_AT = Date.now();

declare global {
  // eslint-disable-next-line no-var
  var nemesisHealthPool: Pool | undefined;
}

type RuntimeHealthStatus = "starting" | "healthy" | "degraded" | "error";
type PublicStatus = RuntimeHealthStatus | "unhealthy" | "unknown" | "unavailable";

interface RuntimeHealthRow {
  status: RuntimeHealthStatus;
  details: string | null;
  last_heartbeat_at: Date;
  updated_at: Date;
}

interface RuntimeHealthView {
  status: PublicStatus;
  stale: boolean;
  lastHeartbeatAt: string | null;
  ageSeconds: number | null;
  event: string | null;
  details: Record<string, unknown>;
}

function getHealthPool() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL must be set.");

  globalThis.nemesisHealthPool ??= new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  return globalThis.nemesisHealthPool;
}

function parseDetails(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function publicDetailValue(value: unknown): unknown {
  if (typeof value === "string") return value.slice(0, 160);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 8).map(publicDetailValue);
  return undefined;
}

function pickPublicDetails(details: Record<string, unknown>): Record<string, unknown> {
  const allowed = [
    "event",
    "activeAgents",
    "evaluatedAgents",
    "proposedAgents",
    "durationMs",
    "cycleStartedAt",
    "lockState",
    "pollingState",
    "attempt",
    "baseRpcEndpoints",
  ];
  const picked: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in details)) continue;
    const value = publicDetailValue(details[key]);
    if (value !== undefined) picked[key] = value;
  }
  return picked;
}

async function readRuntimeHealth(pool: Pool, key: string, staleAfterMs: number): Promise<RuntimeHealthView> {
  try {
    const { rows } = await pool.query(
      "SELECT status, details, last_heartbeat_at, updated_at FROM runtime_health WHERE key = $1",
      [key],
    );
    const row = rows[0] as RuntimeHealthRow | undefined;
    if (!row) {
      return { status: "unknown", stale: true, lastHeartbeatAt: null, ageSeconds: null, event: null, details: {} };
    }

    const ageMs = Date.now() - row.last_heartbeat_at.getTime();
    const details = pickPublicDetails(parseDetails(row.details));
    return {
      status: row.status,
      stale: ageMs > staleAfterMs,
      lastHeartbeatAt: row.last_heartbeat_at.toISOString(),
      ageSeconds: Math.max(0, Math.round(ageMs / 1000)),
      event: typeof details.event === "string" ? details.event : null,
      details,
    };
  } catch {
    return { status: "unavailable", stale: true, lastHeartbeatAt: null, ageSeconds: null, event: null, details: {} };
  }
}

function configuredBaseRpcUrls(): string[] {
  const configured = [
    process.env.BASE_RPC_URL,
    ...(process.env.BASE_RPC_FALLBACK_URLS ?? "").split(","),
    DEFAULT_BASE_RPC_URL,
  ];
  return [...new Set(configured.map((url) => url?.trim()).filter((url): url is string => Boolean(url)))];
}

function configuredSolanaRpcUrl(): string {
  return process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? DEFAULT_SOLANA_RPC_URL;
}

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "invalid-endpoint";
  }
}

function errorCategory(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("timeout") || message.includes("aborted")) return "timeout";
  if (message.includes("429")) return "rate_limited";
  if (message.includes("fetch") || message.includes("network")) return "network_error";
  return "unavailable";
}

async function fetchWithTimeout(endpoint: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    return await fetch(endpoint, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function probeBaseRpc() {
  const startedAt = Date.now();
  const endpoints = configuredBaseRpcUrls();
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json() as { result?: string };
      if (body.result !== "0x2105") throw new Error("unexpected_chain");
      return {
        status: "healthy",
        chain: "base",
        latencyMs: Date.now() - startedAt,
        endpointHost: endpointHost(endpoint),
        fallbackCount: Math.max(0, endpoints.indexOf(endpoint)),
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    status: "degraded",
    chain: "base",
    latencyMs: Date.now() - startedAt,
    endpointHost: null,
    fallbackCount: endpoints.length,
    error: errorCategory(lastError),
  };
}

async function probeSolanaRpc() {
  const endpoint = configuredSolanaRpcUrl();
  const startedAt = Date.now();
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth", params: [] }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json() as { result?: string; error?: unknown };
    if (body.error || body.result !== "ok") throw new Error("unhealthy_rpc_response");
    return { status: "healthy", chain: "solana", latencyMs: Date.now() - startedAt, endpointHost: endpointHost(endpoint) };
  } catch (error) {
    return { status: "degraded", chain: "solana", latencyMs: Date.now() - startedAt, endpointHost: endpointHost(endpoint), error: errorCategory(error) };
  }
}

async function measureDatabase(pool: Pool) {
  const startedAt = Date.now();
  await pool.query("SELECT 1");
  return { status: "connected", latencyMs: Date.now() - startedAt };
}

function deploymentInfo() {
  const commit = process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "unknown";
  return {
    name: "NEMESIS",
    environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "unknown",
    version: process.env.npm_package_version ?? "0.1.0",
    commit: commit === "unknown" ? "unknown" : commit.slice(0, 12),
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ? process.env.RAILWAY_DEPLOYMENT_ID.slice(0, 8) : "unknown",
    uptimeSeconds: Math.max(0, Math.round((Date.now() - APP_STARTED_AT) / 1000)),
  };
}

export async function GET() {
  try {
    const pool = getHealthPool();
    const [database, runner, telegram, baseRpc, solanaRpc] = await Promise.all([
      measureDatabase(pool),
      readRuntimeHealth(pool, RUNNER_HEALTH_KEY, RUNNER_STALE_AFTER_MS),
      readRuntimeHealth(pool, TELEGRAM_HEALTH_KEY, TELEGRAM_STALE_AFTER_MS),
      probeBaseRpc(),
      probeSolanaRpc(),
    ]);

    const runnerHealthy = runner.status === "healthy" && !runner.stale;
    const telegramHealthy = telegram.status === "healthy" && !telegram.stale;
    const rpcHealthy = baseRpc.status === "healthy" && solanaRpc.status === "healthy";
    const status = runnerHealthy && telegramHealthy && rpcHealthy ? "healthy" : "degraded";

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      app: deploymentInfo(),
      database,
      runner,
      telegram,
      rpc: { base: baseRpc, solana: solanaRpc },
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Health Check Error]:", errorCategory(error));
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      app: deploymentInfo(),
      database: { status: "disconnected", latencyMs: null },
      error: "database unavailable",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}