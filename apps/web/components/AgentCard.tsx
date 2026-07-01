import Link from "next/link";

import type { AgentStatus } from "@nemesis/db";
import { RISK_LABELS, getTemplateById, getTemplateChain, getTemplateExecutionCoverage } from "@nemesis/templates";

const STATUS_STYLES: Record<AgentStatus, string> = {
  active:              "text-nm-resolve border-nm-resolve",
  paused:              "text-nm-muted border-nm-border",
  "awaiting-approval": "text-nm-fragment-red border-nm-fragment-red",
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  active:              "active",
  paused:              "paused",
  "awaiting-approval": "awaiting approval",
};
function formatLastChecked(value: string | null) {
  if (!value) return "never checked";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "unknown";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
export interface AgentCardViewModel {
  id: string;
  walletLabel: string;
  templateId: string;
  name: string;
  status: AgentStatus;
  lastEvent: string | null;
  lastCheckedAt: string | null;
}

interface AgentCardProps {
  agent: AgentCardViewModel;
}

export function AgentCard({ agent }: AgentCardProps) {
  const template = getTemplateById(agent.templateId);
  const chain = template ? getTemplateChain(template) : "unknown";
  const execution = template ? getTemplateExecutionCoverage(template) : null;
  const nextAction = agent.status === "paused"
    ? "resume when ready"
    : agent.status === "awaiting-approval"
      ? "review pending state"
      : "monitoring for matches";

  return (
    <div className="card-premium corner-fragment group border border-nm-border p-5">
      {/* Left accent bar */}
      <div className="card-accent-bar" aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-sm font-bold uppercase tracking-widest2 text-nm-fg transition-colors duration-200 group-hover:text-white">
            {agent.name}
          </h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {agent.id} - {agent.walletLabel}
          </p>
        </div>
        <span
          className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 ${STATUS_STYLES[agent.status]}`}
        >
          {STATUS_LABELS[agent.status]}
        </span>
      </div>

      <div className="mt-4 grid gap-2 border-y border-nm-border/60 py-3">
        <div className="grid gap-1 sm:grid-cols-[76px_1fr]">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">event</p>
          <p className="text-sm leading-relaxed text-nm-muted transition-colors duration-300 group-hover:text-nm-fg/70">
            {agent.lastEvent ?? "Waiting for first monitoring cycle."}
          </p>
        </div>
        <div className="grid gap-1 sm:grid-cols-[76px_1fr]">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">next</p>
          <p className="text-sm leading-relaxed text-nm-fg">{nextAction}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
          {chain}
        </span>
        {template && (
          <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {RISK_LABELS[template.risk]} risk
          </span>
        )}
        {execution && (
          <span className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 ${execution.mode === "wallet-signable" ? "border-nm-fragment-blue text-nm-fragment-blue" : "border-nm-border text-nm-muted"}`}>
            {execution.mode === "wallet-signable" ? "wallet-signable" : "review-only"}
          </span>
        )}
        <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
          {formatLastChecked(agent.lastCheckedAt)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <Link
          href={`/agents/${agent.id}`}
          className="card-arrow font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red"
        >
          {"view agent ->"}
        </Link>
        {template && (
          <Link
            href={`/templates/${template.id}`}
            className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted transition-colors duration-200 hover:text-nm-fg"
          >
            {"view template ->"}
          </Link>
        )}
      </div>
    </div>
  );
}
