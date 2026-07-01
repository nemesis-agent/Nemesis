import Link from "next/link";

import type { AgentTemplate } from "@nemesis/templates";
import { RISK_LABELS, getTemplateChain, getTemplateExecutionCoverage, isTemplateProductionReady } from "@nemesis/templates";

const RISK_STYLES: Record<AgentTemplate["risk"], string> = {
  low:   "text-nm-resolve border-nm-resolve",
  mid:   "text-nm-fragment-blue border-nm-fragment-blue",
  high:  "text-nm-fragment-red border-nm-fragment-red",
  degen: "text-nm-fragment-red border-nm-fragment-red",
};
function compactText(value: string, max = 112) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}...`;
}
interface TemplateCardProps {
  template: AgentTemplate;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const isProductionReady = isTemplateProductionReady(template);
  const execution = getTemplateExecutionCoverage(template);
  const chain = getTemplateChain(template);
  const signable = execution.mode === "wallet-signable";

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
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 ${RISK_STYLES[template.risk]}`}
            >
              {RISK_LABELS[template.risk]}
            </span>
            <span className="border border-nm-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
              {chain}
            </span>
            <span className="border border-nm-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
              {signable ? "signable" : "review"}
            </span>
            {!isProductionReady && (
              <span className="border border-nm-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                gated
              </span>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-nm-muted transition-colors duration-300 group-hover:text-nm-fg/70">
          {template.summary}
        </p>
        <div className="mt-4 grid gap-2 border-y border-nm-border/60 py-3">
          <div className="grid gap-1 sm:grid-cols-[72px_1fr]">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">trigger</p>
            <p className="text-xs leading-relaxed text-nm-muted">{compactText(template.condition)}</p>
          </div>
          <div className="grid gap-1 sm:grid-cols-[72px_1fr]">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-blue">proposal</p>
            <p className="text-xs leading-relaxed text-nm-muted">{compactText(template.action)}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 ${signable ? "border-nm-fragment-blue text-nm-fragment-blue" : "border-nm-border text-nm-muted"}`}>
            {execution.label}
          </span>
          <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {execution.wallet}
          </span>
        </div>
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
          {isProductionReady ? "deploy ->" : "review ->"}
        </span>
      </div>
    </Link>
  );
}
