import Link from "next/link";

import type { AgentTemplate } from "@nemesis/templates";
import { RISK_LABELS } from "@nemesis/templates";

const RISK_STYLES: Record<AgentTemplate["risk"], string> = {
  low:   "text-nm-resolve border-nm-resolve",
  mid:   "text-nm-fragment-blue border-nm-fragment-blue",
  high:  "text-nm-fragment-red border-nm-fragment-red",
  degen: "text-nm-fragment-red border-nm-fragment-red",
};

interface TemplateCardProps {
  template: AgentTemplate;
}

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Link
      href={`/templates/${template.id}`}
      className="card-premium corner-fragment group flex flex-col justify-between border border-nm-border p-5"
    >
      <div>
        {/* Left accent bar that draws down on hover */}
        <div className="card-accent-bar" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3">
          <h3 className="font-mono text-sm font-bold uppercase tracking-widest2 text-nm-fg transition-colors duration-200 group-hover:text-white">
            {template.name}
          </h3>
          <span
            className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 ${RISK_STYLES[template.risk]}`}
          >
            {RISK_LABELS[template.risk]}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-nm-muted transition-colors duration-300 group-hover:text-nm-fg/70">
          {template.summary}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {template.protocols.map((protocol) => (
          <span
            key={protocol}
            className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted transition-colors duration-200 group-hover:border-nm-fragment-red/40 group-hover:text-nm-muted"
          >
            {protocol}
          </span>
        ))}
      </div>

      {/* Arrow that slides in on hover */}
      <div className="mt-4 flex items-center gap-2 overflow-hidden">
        <span className="card-arrow font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">
          deploy →
        </span>
      </div>
    </Link>
  );
}
