import type { AgentTemplate } from "@nemesis/templates";
import { fillApprovalSummary } from "@/lib/format-template";

interface SimulationViewProps {
  template: AgentTemplate;
}

function formatDefaultValue(value: string | number | boolean, unit?: string) {
  return unit ? String(value) + " " + unit : String(value);
}

export function SimulationView({ template }: SimulationViewProps) {
  const observedFields = template.explainability.observedFields.slice(0, 5);
  const defaultParams = template.parameters.slice(0, 4);

  return (
    <div className="border border-nm-border bg-nm-bg p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">
            proposal preview
          </h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            example review surface, not a performance claim
          </p>
        </div>
        <span className="w-fit border border-nm-resolve/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-resolve">
          approval-first
        </span>
      </div>

      <div className="mt-5 border border-nm-border bg-[#0a0a0a] p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">why</p>
        <p className="mt-2 text-sm leading-relaxed text-nm-muted">{template.explainability.proposalReason}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="border border-nm-border/70 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">observed inputs</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {observedFields.map((field) => (
                <span key={field} className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                  {field}
                </span>
              ))}
            </div>
          </div>

          <div className="border border-nm-border/70 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">default config</p>
            <div className="mt-2 grid gap-1">
              {defaultParams.map((param) => (
                <p key={param.key} className="flex justify-between gap-3 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                  <span>{param.label}</span>
                  <span className="text-nm-fg">{formatDefaultValue(param.default, param.unit)}</span>
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 border border-nm-border/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">plan readback</p>
          <p className="mt-2 text-sm leading-relaxed text-nm-fg">{fillApprovalSummary(template)}</p>
        </div>

        <div className="mt-4 grid gap-2 border border-nm-border/70 p-3 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">condition</p>
            <p className="mt-1 text-xs leading-relaxed text-nm-fg">matched once</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">proposal</p>
            <p className="mt-1 text-xs leading-relaxed text-nm-fg">created for review</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">execution</p>
            <p className="mt-1 text-xs leading-relaxed text-nm-fg">wallet signature required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
