import { DeployChat } from "@/components/DeployChat";
import { RISK_LABELS, getTemplateById, getTemplateChain, getTemplateExecutionCoverage, isTemplateProductionReady } from "@nemesis/templates";

interface DeployPageProps {
  searchParams: { template?: string };
}

export default function DeployPage({ searchParams }: DeployPageProps) {
  const template = searchParams.template ? getTemplateById(searchParams.template) : undefined;
  const chain = template ? getTemplateChain(template) : "base + solana";
  const execution = template ? getTemplateExecutionCoverage(template) : undefined;
  const ready = template ? isTemplateProductionReady(template) : true;
  const checklist = [
    { label: "wallet", value: "connect the wallet that will own the agent" },
    { label: "plan", value: "review exact condition, action, and parameters" },
    { label: "risk", value: "acknowledge high/degen templates before deploy" },
    { label: "approval", value: "proposals still wait for your wallet signature" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">agent deployment console</p>
          <h1 className="mt-2 font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">deploy</h1>
        </div>
        <span className={`w-fit border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 ${ready ? "border-nm-resolve text-nm-resolve" : "border-nm-fragment-red text-nm-fragment-red"}`}>
          {ready ? "production path" : "template gated"}
        </span>
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nm-muted">
        {template
          ? `Starting from the "${template.name}" template. Review the exact plan, edit parameters, then deploy a monitoring agent that only proposes actions.`
          : "Describe what you want in plain language. The NEMESIS planner will only propose production-ready templates."}
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-4" aria-label="deploy checklist">
        {checklist.map((item, index) => (
          <div key={item.label} className="border border-nm-border bg-nm-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">0{index + 1} {item.label}</p>
            <p className="mt-2 text-xs leading-relaxed text-nm-muted">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="selected template context">
        <div className="border border-nm-border bg-nm-bg p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">network</p>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest2 text-nm-fg">{chain}</p>
        </div>
        <div className="border border-nm-border bg-nm-bg p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">risk gate</p>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest2 text-nm-fg">
            {template ? RISK_LABELS[template.risk] : "template dependent"}
          </p>
        </div>
        <div className="border border-nm-border bg-nm-bg p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">execution</p>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest2 text-nm-fg">
            {execution ? execution.label : "approval-first"}
          </p>
        </div>
      </section>

      <div className="mt-8">
        <DeployChat initialTemplateId={template?.id} />
      </div>
    </div>
  );
}
