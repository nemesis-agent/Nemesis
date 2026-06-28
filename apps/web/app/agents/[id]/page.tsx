import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AgentStatusToggle } from "@/components/AgentStatusToggle";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { ProposalRecordRow } from "@/components/ProposalRecordRow";
import { ScrollReveal } from "@/components/ScrollReveal";
import { WalletSessionGate } from "@/components/WalletSessionGate";
import { Pool } from "pg";
import type { Agent, AgentStatus, Proposal, ProposalStatus } from "@nemesis/db";
import { getSession, getSessionWalletKeys } from "@/lib/auth";
import { getTemplateById } from "@nemesis/templates";

interface AgentDetailPageProps {
  params: Promise<{ id: string }>;
}

// Reads live from Postgres - pause/resume mutate this row, and a scheduler
// can add new proposals at any time, so this can never be statically
// cached. See CONTEXT.md, "What changed in the database pass".
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

interface ProposalRow {
  id: string;
  agent_id: string;
  title: string;
  details: string;
  proposed_action: string;
  estimated_gas_usd: string;
  status: ProposalStatus;
  tx_hash: string | null;
  unsigned_tx_payload: string | null;
  execution_state: string | null;
  created_at: Date;
}

const agentDetailPool = new Pool({ connectionString: process.env.DATABASE_URL });

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    templateId: row.template_id,
    name: row.name,
    status: row.status,
    parameters: JSON.parse(row.parameters),
    lastCheckedAt: row.last_checked_at ? row.last_checked_at.toISOString() : null,
    lastEvent: row.last_event,
    runtimeState: row.runtime_state ? JSON.parse(row.runtime_state) : {},
    createdAt: row.created_at.toISOString(),
  };
}

function rowToProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    details: JSON.parse(row.details),
    proposedAction: row.proposed_action,
    estimatedGasUsd: row.estimated_gas_usd,
    status: row.status,
    txHash: row.tx_hash,
    unsignedTxPayload: row.unsigned_tx_payload,
    executionState: row.execution_state ? JSON.parse(row.execution_state) : {},
    createdAt: row.created_at.toISOString(),
  };
}

async function getAgentDetail(id: string): Promise<Agent | undefined> {
  const { rows } = await agentDetailPool.query("SELECT * FROM agents WHERE id = $1", [id]);
  const row = rows[0] as AgentRow | undefined;
  return row ? rowToAgent(row) : undefined;
}

async function listAgentProposals(agentId: string): Promise<Proposal[]> {
  const { rows } = await agentDetailPool.query("SELECT * FROM proposals WHERE agent_id = $1 ORDER BY created_at DESC", [agentId]);
  return (rows as ProposalRow[]).map(rowToProposal);
}

export async function generateMetadata() {
  return {
    title: "agent - NEMESIS",
  };
}


const STATUS_STYLES = {
  active: "text-nm-resolve border-nm-resolve",
  paused: "text-nm-muted border-nm-border",
  "awaiting-approval": "text-nm-fragment-red border-nm-fragment-red",
} as const;

const STATUS_LABELS = {
  active: "active",
  paused: "paused",
  "awaiting-approval": "awaiting approval",
} as const;

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = await params;
  const session = await getSession();
  const walletKeys = getSessionWalletKeys(session);
  if (walletKeys.length === 0) redirect("/");

  const agent = await getAgentDetail(id);
  if (!agent) notFound();
  if (!walletKeys.some((walletKey) => walletKey.toLowerCase() === agent.walletAddress.toLowerCase())) notFound();

  const template = getTemplateById(agent.templateId);
  const proposals = await listAgentProposals(agent.id);

  const approvedCount = proposals.filter((p) => p.status === "approved").length;
  const pendingCount = proposals.filter((p) => p.status === "pending").length;

  return (
    <WalletSessionGate walletKeys={walletKeys}>
      <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Back */}
      <Link
        href="/dashboard"
        className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted"
      >
        &lt;- agents
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">
            {agent.name}
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {agent.id} . {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
          </p>
        </div>
        <span
          className={`shrink-0 border px-2 py-0.5 font-mono text-xs uppercase tracking-widest2 ${STATUS_STYLES[agent.status]}`}
        >
          {STATUS_LABELS[agent.status]}
        </span>
      </div>

      <div className="mt-6">
        <FragmentDivider />
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: "proposals", value: proposals.length },
          { label: "approved", value: approvedCount },
          { label: "pending", value: pendingCount },
        ].map((stat, index) => (
          <ScrollReveal key={stat.label} delayMs={index * 60}>
            <div className="border border-nm-border p-3 sm:p-4">
              <p className="font-mono text-2xl font-bold text-nm-fg">
                <AnimatedCounter value={stat.value} />
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                {stat.label}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Template info */}
      {template && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">
              template
            </h2>
            <Link
              href={`/templates/${template.id}`}
              className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red"
            >
              view full spec -&gt;
            </Link>
          </div>

          <div className="mt-3 border border-nm-border p-5">
            <p className="font-mono text-sm font-bold uppercase tracking-widest2 text-nm-fg">
              {template.name}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-nm-muted">{template.summary}</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                  condition
                </p>
                <p className="mt-1 text-sm leading-relaxed text-nm-fg">{template.condition}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                  action
                </p>
                <p className="mt-1 text-sm leading-relaxed text-nm-fg">{template.action}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {template.protocols.map((protocol) => (
                <span
                  key={protocol}
                  className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted"
                >
                  {protocol}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Parameters */}
      {template && template.parameters.length > 0 && (
        <section className="mt-8">
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">
            parameters
          </h2>
          <div className="mt-3 divide-y divide-nm-border border border-nm-border">
            {template.parameters.map((param) => {
              const value = agent.parameters[param.key] ?? param.default;
              return (
                <div
                  key={param.key}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <span className="text-sm text-nm-muted">{param.label}</span>
                  <span className="shrink-0 font-mono text-xs text-nm-fg">
                    {String(value)}
                    {param.unit ? ` ${param.unit}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Last event */}
      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">
          last event
        </h2>
        <div className="mt-3 border border-nm-border p-4">
          <p className="text-sm leading-relaxed text-nm-fg">{agent.lastEvent ?? "Not checked yet"}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {agent.lastCheckedAt ?? "never"}
          </p>
        </div>
      </section>

      {/* Proposal history */}
      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">
          proposal history
        </h2>
        {proposals.length === 0 ? (
          <div className="mt-3 border border-nm-border p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">
              no proposals yet
            </p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {proposals.map((proposal, index) => (
              <ScrollReveal key={proposal.id} delayMs={index * 50}>
                <ProposalRecordRow proposal={proposal} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      {/* Actions */}
      <section className="mt-10">
        <FragmentDivider />
        <div className="mt-6 flex flex-wrap gap-3">
          <AgentStatusToggle agentId={agent.id} status={agent.status} />
          <Button href="/dashboard" variant="secondary" magnetic>
            back to dashboard
          </Button>
        </div>
      </section>
      </div>
    </WalletSessionGate>
  );
}
