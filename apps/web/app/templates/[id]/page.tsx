import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { LogicFlow } from "@/components/LogicFlow";
import { RiskBanner } from "@/components/RiskBanner";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SimulationView } from "@/components/SimulationView";
import { fillApprovalSummary } from "@/lib/format-template";
import { RISK_LABELS, TEMPLATE_CATEGORIES, TEMPLATES, getTemplateById, getTemplateChain, getTemplateExecutionCoverage, getTemplateUnavailableReason, isTemplateProductionReady } from "@nemesis/templates";

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamicParams = false;

function formatDefaultValue(value: string | number | boolean, unit?: string) {
  return unit ? `${String(value)} ${unit}` : String(value);
}

export function generateStaticParams() {
  return TEMPLATES.map((template) => ({ id: template.id }));
}

export async function generateMetadata({ params }: TemplateDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const template = getTemplateById(id);
  if (!template) return { title: "Template not found - NEMESIS" };

  const title = `${template.name} - NEMESIS template`;
  const description = `${template.summary} Approval-first, non-custodial, and wallet-signed.`;

  return {
    title,
    description,
    alternates: { canonical: `/templates/${template.id}` },
    openGraph: {
      title,
      description,
      url: `/templates/${template.id}`,
      images: [{
        url: "/assets/nemesis-social-preview-2026.png",
        width: 1200,
        height: 675,
        alt: `NEMESIS ${template.name} template`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/assets/nemesis-social-preview-2026.png"],
    },
  };
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { id } = await params;
  const template = getTemplateById(id);
  if (!template) notFound();

  const isProductionReady = isTemplateProductionReady(template);
  const chain = getTemplateChain(template);
  const execution = getTemplateExecutionCoverage(template);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/templates" className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
        &lt;- templates
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {TEMPLATE_CATEGORIES[template.category]}
          </p>
          <h1 className="mt-1 font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">
            {template.name}
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {chain}
          </span>
          <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {RISK_LABELS[template.risk]} risk
          </span>
          <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {isProductionReady ? "production" : "gated"}
          </span>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-nm-muted">{template.summary}</p>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { label: "condition", value: "single trigger" },
          { label: "action", value: "single proposal" },
          { label: "approval", value: "wallet-signed" },
        ].map((item) => (
          <div key={item.label} className="border border-nm-border bg-nm-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">{item.label}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest2 text-nm-fg">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">execution coverage</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="border border-nm-border bg-nm-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">mode</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest2 text-nm-fg">{execution.label}</p>
          </div>
          <div className="border border-nm-border bg-nm-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">wallet</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest2 text-nm-fg">{execution.wallet}</p>
          </div>
          <div className="border border-nm-border bg-nm-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">payload</p>
            <p className="mt-1 text-sm leading-relaxed text-nm-fg">{execution.payload}</p>
          </div>
        </div>
        <p className="mt-3 border border-nm-border bg-nm-bg p-3 text-sm leading-relaxed text-nm-muted">
          {execution.boundary}
        </p>
      </section>

      <div className="mt-8">
        <FragmentDivider />
      </div>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">safety rails</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            "one condition, one proposed action",
            "no custody and no private keys",
            "nothing signs without wallet approval",
          ].map((item) => (
            <div key={item} className="border border-nm-border bg-nm-surface p-3">
              <p className="text-sm leading-relaxed text-nm-fg">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-8 sm:grid-cols-2">
        <ScrollReveal>
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">condition</h2>
          <p className="mt-2 text-sm leading-relaxed text-nm-fg">{template.condition}</p>
        </ScrollReveal>
        <ScrollReveal delayMs={70}>
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">action</h2>
          <p className="mt-2 text-sm leading-relaxed text-nm-fg">{template.action}</p>
        </ScrollReveal>
      </section>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">protocols</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {template.protocols.map((protocol) => (
            <span key={protocol} className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
              {protocol}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SimulationView template={template} />
      </section>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">how proposals are explained</h2>
        <div className="mt-3 grid gap-3 border border-nm-border bg-nm-surface p-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">decision rule</p>
            <p className="mt-1 text-sm leading-relaxed text-nm-muted">{template.explainability.decisionRule}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">observed fields</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {template.explainability.observedFields.map((field) => (
                <span key={field} className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                  {field}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">approval checklist</p>
            <ul className="mt-2 grid gap-1 text-sm leading-relaxed text-nm-muted">
              {template.explainability.approvalChecklist.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm leading-relaxed text-nm-muted">{template.explainability.limitation}</p>
        </div>
      </section>

      <section className="mt-8">
        <LogicFlow />
      </section>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">parameters</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="border border-nm-border bg-nm-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">count</p>
            <p className="mt-1 font-mono text-xs text-nm-fg">{template.parameters.length}</p>
          </div>
          <div className="border border-nm-border bg-nm-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">defaults</p>
            <p className="mt-1 font-mono text-xs text-nm-fg">editable before deploy</p>
          </div>
          <div className="border border-nm-border bg-nm-surface p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">validation</p>
            <p className="mt-1 font-mono text-xs text-nm-fg">server checked</p>
          </div>
        </div>
        <div className="mt-3 divide-y divide-nm-border border border-nm-border">
          {template.parameters.map((param, index) => (
            <ScrollReveal key={param.key} delayMs={index * 50}>
              <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <div>
                  <p className="text-sm font-medium text-nm-fg">{param.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-nm-muted">{param.description}</p>
                </div>
                <p className="shrink-0 font-mono text-xs text-nm-fg sm:text-right">
                  default: {formatDefaultValue(param.default, param.unit)}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {(template.risk === "high" || template.risk === "degen") && (
        <section className="mt-8">
          <RiskBanner template={template} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">plan preview</h2>
        <div className="mt-3 border border-nm-border bg-nm-surface p-4">
          <p className="text-sm leading-relaxed text-nm-muted">{fillApprovalSummary(template)}</p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            shown with default parameter values - adjust before deploying
          </p>
        </div>
      </section>

      <div className="mt-10 border border-nm-border bg-nm-surface p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">review before deploy</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-nm-muted">
          Deploy only after the condition, action, parameters, and approval checklist match your intent. The agent can propose; your wallet remains the final signer.
        </p>
        <div className="mt-4">
          {isProductionReady ? (
            <Button href={`/agents/new?template=${template.id}`} variant="primary" magnetic>
              Deploy this template
            </Button>
          ) : (
            <div className="border border-nm-border bg-nm-bg p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">gated</p>
              <p className="mt-2 text-sm leading-relaxed text-nm-muted">{getTemplateUnavailableReason(template)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
