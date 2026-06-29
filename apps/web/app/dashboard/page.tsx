import Link from "next/link";
import { redirect } from "next/navigation";

import { AgentCard } from "@/components/AgentCard";
import { Button } from "@/components/Button";
import { ConnectTelegramCard } from "@/components/ConnectTelegramCard";
import { FragmentDivider } from "@/components/FragmentDivider";
import { ScrollReveal } from "@/components/ScrollReveal";
import { WalletSessionGate } from "@/components/WalletSessionGate";
import { Pool } from "pg";
import { getSession, getSessionWalletKeys } from "@/lib/auth";
import { maskIdentifier } from "@/lib/privacy";
import type { AgentStatus } from "@nemesis/db";
import type { AgentCardViewModel } from "@/components/AgentCard";

// Reads live from Postgres on every request - agents can be paused/resumed
// and new proposals can land at any time, so this page must never be
// statically cached. See CONTEXT.md, "What changed in the database pass".
export const dynamic = "force-dynamic";
interface AgentRow {
  id: string;
  wallet_address: string;
  template_id: string;
  name: string;
  status: AgentStatus;
  parameters: string;
  last_checked_at: Date | null;
  last_event: string | null;
  runtime_state: string | null;
  created_at: Date;
}

interface RuntimeHealthRow {
  status: "starting" | "healthy" | "degraded" | "error";
  details: string | null;
  last_heartbeat_at: Date;
}

interface DashboardRuntimeHealth {
  status: "starting" | "healthy" | "degraded" | "error" | "unknown" | "unavailable";
  stale: boolean;
  lastHeartbeatAt: string | null;
  ageSeconds: number | null;
  details: Record<string, unknown>;
}

const dashboardPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
const RUNNER_HEALTH_KEY = "telegram-runner";
const RUNNER_STALE_AFTER_MS = 5 * 60 * 1000;

function rowToAgent(row: AgentRow): AgentCardViewModel {
  return {
    id: row.id,
    walletLabel: maskIdentifier(row.wallet_address),
    templateId: row.template_id,
    name: row.name,
    status: row.status,
    lastCheckedAt: row.last_checked_at ? row.last_checked_at.toISOString() : null,
    lastEvent: row.last_event,
  };
}

async function listDashboardAgents(walletKeys: string[]): Promise<AgentCardViewModel[]> {
  if (walletKeys.length === 0) return [];
  const { rows } = await dashboardPool.query(
    "SELECT * FROM agents WHERE wallet_address = ANY($1::text[]) ORDER BY created_at DESC",
    [walletKeys],
  );
  return (rows as AgentRow[]).map(rowToAgent);
}

function parseRuntimeDetails(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function getDashboardRuntimeHealth(): Promise<DashboardRuntimeHealth> {
  try {
    const { rows } = await dashboardPool.query(
      "SELECT status, details, last_heartbeat_at FROM runtime_health WHERE key = $1",
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
      details: parseRuntimeDetails(row.details),
    };
  } catch {
    return { status: "unavailable", stale: true, lastHeartbeatAt: null, ageSeconds: null, details: {} };
  }
}

function formatAge(seconds: number | null) {
  if (seconds === null) return "never";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function RunnerHealthCard({ health }: { health: DashboardRuntimeHealth }) {
  const healthy = health.status === "healthy" && !health.stale;
  const event = typeof health.details.event === "string" ? health.details.event.replaceAll("_", " ") : "waiting for heartbeat";
  const activeAgents = typeof health.details.activeAgents === "number" ? health.details.activeAgents : null;

  return (
    <div className="border border-nm-border bg-nm-bg p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">runner health</h2>
          <p className="mt-2 text-sm text-nm-muted">Agent evaluation heartbeat and last cycle state.</p>
        </div>
        <span className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 ${healthy ? "border-nm-resolve text-nm-resolve" : "border-nm-fragment-red text-nm-fragment-red"}`}>
          {healthy ? "online" : "check"}
        </span>
      </div>
      <dl className="mt-5 grid gap-3 text-xs">
        <div className="flex justify-between gap-4 border-t border-nm-border pt-3">
          <dt className="font-mono uppercase tracking-widest2 text-nm-muted">status</dt>
          <dd className="text-right text-nm-fg">{health.stale ? `${health.status} / stale` : health.status}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-nm-border pt-3">
          <dt className="font-mono uppercase tracking-widest2 text-nm-muted">last beat</dt>
          <dd className="text-right text-nm-fg">{formatAge(health.ageSeconds)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-nm-border pt-3">
          <dt className="font-mono uppercase tracking-widest2 text-nm-muted">cycle</dt>
          <dd className="text-right text-nm-fg">{event}</dd>
        </div>
        {activeAgents !== null && (
          <div className="flex justify-between gap-4 border-t border-nm-border pt-3">
            <dt className="font-mono uppercase tracking-widest2 text-nm-muted">active</dt>
            <dd className="text-right text-nm-fg">{activeAgents}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const walletKeys = getSessionWalletKeys(session);
  if (walletKeys.length === 0) redirect("/");

  const [agents, runnerHealth] = await Promise.all([
    listDashboardAgents(walletKeys),
    getDashboardRuntimeHealth(),
  ]);

  return (
    <WalletSessionGate walletKeys={walletKeys}>
      <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">agents</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nm-muted">
            Agents deployed to your wallet. Proposals are sent to Telegram and listed here -
            nothing moves without your approval.
          </p>
        </div>
        <Button href="/agents/new" variant="primary" magnetic>
          Deploy agent
        </Button>
      </div>

      <div className="mt-10">
        <FragmentDivider />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((agent, index) => (
            <ScrollReveal key={agent.id} delayMs={index * 70}>
              <AgentCard agent={agent} />
            </ScrollReveal>
          ))}

          {agents.length === 0 && (
            <div className="border border-nm-border bg-nm-bg p-8 sm:col-span-2">
              <h2 className="font-mono text-sm font-bold uppercase tracking-widest2 text-nm-fg mb-6">
                Onboarding: 3 Steps to Automation
              </h2>
              
              <div className="flex flex-col gap-6">
                <div className="flex gap-4 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-nm-resolve text-nm-resolve font-mono text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="font-mono text-xs uppercase text-nm-fg">Connect Wallet</h3>
                    <p className="mt-1 text-sm text-nm-muted">Your wallet is connected and signed via SIWE. You&apos;re ready for step 2.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-nm-fragment-blue text-nm-fragment-blue font-mono text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="font-mono text-xs uppercase text-nm-fg">Link Telegram</h3>
                    <p className="mt-1 text-sm text-nm-muted">Use the panel on the right to link your Telegram. This is where you will receive and approve transaction proposals.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-nm-fragment-red text-nm-fragment-red font-mono text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="font-mono text-xs uppercase text-nm-fg">Deploy Master Agent</h3>
                    <p className="mt-1 text-sm text-nm-muted">Tell the Master Agent what you want to automate. It will configure a sub-agent to watch the market for you.</p>
                    <Link
                      href="/agents/new"
                      className="mt-3 inline-block font-mono text-xs uppercase tracking-widest2 text-nm-fg border border-nm-border px-4 py-2 hover:bg-nm-surface transition-colors"
                    >
                      Deploy your first agent -&gt;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <ScrollReveal delayMs={120}>
            <RunnerHealthCard health={runnerHealth} />
          </ScrollReveal>
          <ScrollReveal delayMs={170}>
            <ConnectTelegramCard />
          </ScrollReveal>
        </div>
      </div>
      </div>
    </WalletSessionGate>
  );
}
