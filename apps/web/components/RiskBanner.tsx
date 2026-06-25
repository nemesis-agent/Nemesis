import { RISK_LABELS, type AgentTemplate } from "@nemesis/templates";

interface RiskBannerProps {
  template: AgentTemplate;
}

/**
 * Static warning shown on the template detail page for "high" and
 * "degen" risk templates. For the interactive acknowledgment a user must
 * actively confirm before deploying, see RiskAcknowledgmentModal.
 */
export function RiskBanner({ template }: RiskBannerProps) {
  if (template.risk !== "high" && template.risk !== "degen") return null;
  if (!template.riskNote) return null;

  return (
    <div className="border border-nm-fragment-red p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">
        {RISK_LABELS[template.risk]} risk
      </p>
      <p className="mt-2 text-sm leading-relaxed text-nm-fg">{template.riskNote}</p>
    </div>
  );
}
