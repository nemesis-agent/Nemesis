import Link from "next/link";

import type { Agent, AgentStatus } from "@nemesis/db";
import { getTemplateById } from "@nemesis/templates";

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

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const template = getTemplateById(agent.templateId);

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
            {agent.id} · {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
          </p>
        </div>
        <span
          className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 ${STATUS_STYLES[agent.status]}`}
        >
          {STATUS_LABELS[agent.status]}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-nm-muted transition-colors duration-300 group-hover:text-nm-fg/70">
        {agent.lastEvent ?? "Not checked yet"}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
        last checked {agent.lastCheckedAt ?? "never"}
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        <Link
          href={`/agents/${agent.id}`}
          className="card-arrow font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red"
        >
          view agent →
        </Link>
        {template && (
          <Link
            href={`/templates/${template.id}`}
            className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted transition-colors duration-200 hover:text-nm-fg"
          >
            view template →
          </Link>
        )}
      </div>
    </div>
  );
}
