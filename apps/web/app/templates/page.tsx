import { FragmentDivider } from "@/components/FragmentDivider";
import { ScrollReveal } from "@/components/ScrollReveal";
import { TemplateCard } from "@/components/TemplateCard";
import { TEMPLATE_CATEGORIES, TEMPLATES, getTemplateChain, getTemplateExecutionCoverage, type TemplateCategory } from "@nemesis/templates";

const CATEGORY_ORDER: TemplateCategory[] = ["launch-snipe", "simple-actions", "utility"];

export default function TemplatesPage() {
  const signableCount = TEMPLATES.filter((template) => getTemplateExecutionCoverage(template).mode === "wallet-signable").length;
  const baseCount = TEMPLATES.filter((template) => getTemplateChain(template) === "base").length;
  const solanaCount = TEMPLATES.filter((template) => getTemplateChain(template) === "solana").length;
  const overview = [
    { label: "templates", value: String(TEMPLATES.length) },
    { label: "wallet-signable", value: String(signableCount) },
    { label: "review-only", value: String(TEMPLATES.length - signableCount) },
    { label: "base / solana", value: `${baseCount} / ${solanaCount}` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">templates</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nm-muted">
        Every template follows the same shape: one condition, one proposed action. Production templates are
        approval-first: agents monitor conditions and create proposals, while your wallet remains the only signer.
      </p>

      <div className="mt-8 grid gap-px border border-nm-border bg-nm-border/80 sm:grid-cols-4">
        {overview.map((item) => (
          <div key={item.label} className="bg-nm-surface/95 p-4">
            <p className="font-mono text-lg font-bold uppercase tracking-widest2 text-nm-fg">{item.value}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 border border-nm-border bg-nm-bg/80 p-4 text-sm leading-relaxed text-nm-muted">
        Wallet-signable means NEMESIS can prepare a guarded payload for final wallet approval. Review-only means NEMESIS explains the proposal and boundary, but does not open a signing request.
      </div>

      {CATEGORY_ORDER.map((category) => {
        const templates = TEMPLATES.filter((template) => template.category === category);

        return (
          <section key={category} className="mt-12">
            <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">
              {TEMPLATE_CATEGORIES[category]}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template, index) => (
                <ScrollReveal key={template.id} delayMs={index * 70}>
                  <TemplateCard template={template} />
                </ScrollReveal>
              ))}
            </div>
            <div className="mt-12">
              <FragmentDivider />
            </div>
          </section>
        );
      })}
    </div>
  );
}
