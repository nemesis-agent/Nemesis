import { FragmentDivider } from "@/components/FragmentDivider";
import { ScrollReveal } from "@/components/ScrollReveal";

const STEPS = [
  {
    label: "01",
    title: "Tell it what you want",
    body: "Describe your goal in plain language — what you're holding, what you want to happen, how much risk you're comfortable with. The Master Agent reads your wallet to understand your starting position.",
  },
  {
    label: "02",
    title: "Review the plan",
    body: "Before anything is created, the Master Agent explains which agents it wants to deploy and why, in plain language — not template names or parameters you'd need to decode.",
  },
  {
    label: "03",
    title: "Approve every action",
    body: "Deployed agents monitor their conditions and propose transactions through Base MCP. Proposals arrive on Telegram or the dashboard. Nothing moves until your wallet approves it.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <ScrollReveal>
        <div className="flex items-center gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">
            how it works
          </h2>
          <div className="section-line flex-1" aria-hidden="true" />
        </div>
      </ScrollReveal>

      <div className="mt-10 grid gap-0 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <ScrollReveal key={step.label} delayMs={index * 110}>
            <div className="step-card group relative border-l border-nm-border px-6 py-2 first:border-l-0 first:pl-0 sm:border-l sm:first:border-l-0 sm:first:pl-6 sm:first:pl-0">
              {/* Animated number */}
              <span className="step-number font-mono text-4xl font-bold text-nm-fragment-red/20 transition-all duration-500 group-hover:text-nm-fragment-red/60">
                {step.label}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-nm-fg transition-colors duration-300 group-hover:text-white">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-nm-muted transition-colors duration-300 group-hover:text-nm-fg/70">
                {step.body}
              </p>

              {/* Animated bottom accent line */}
              <div className="step-accent mt-6 h-px w-0 bg-nm-fragment-red transition-all duration-500 group-hover:w-full" aria-hidden="true" />
            </div>
          </ScrollReveal>
        ))}
      </div>

      <div className="mt-16">
        <FragmentDivider />
      </div>
    </section>
  );
}
