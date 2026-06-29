import { FragmentDivider } from "@/components/FragmentDivider";
import { ScrollReveal } from "@/components/ScrollReveal";
import { TEMPLATES } from "@nemesis/templates";

const SOCIAL_LINKS = [
  { href: "https://x.com/intent/tweet?text=Deploy%20approval-first%20agents%20on%20Base%20and%20Solana%20with%20NEMESIS&url=https%3A%2F%2Fnemesis-agent.xyz", label: "share on x" },
  { href: "https://x.com/Nemesis_agent", label: "follow x" },
  { href: "https://github.com/nemesis-agent/Nemesis", label: "github" },
  { href: "https://t.me/NemesisAgentAppBot", label: "telegram bot" },
];

export function GrowthLoop() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <ScrollReveal>
        <div className="flex items-center gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">network signal</h2>
          <div className="section-line flex-1" aria-hidden="true" />
        </div>
      </ScrollReveal>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <ScrollReveal>
          <div className="border border-nm-border bg-nm-surface p-6">
            <p className="font-mono text-xl font-bold uppercase tracking-widest2 text-nm-fg">agents propose. you decide.</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-nm-muted">
              Bring another Base or Solana wallet into the same approval-first workflow: templates stay narrow, Telegram alerts stay wallet-scoped, and every executable payload waits for the user's own wallet signature.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-nm-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted transition-colors hover:border-nm-fragment-red hover:text-nm-fg"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delayMs={120}>
          <div className="grid h-full grid-cols-3 border border-nm-border bg-nm-border">
            {[
              { value: String(TEMPLATES.length), label: "templates" },
              { value: "2", label: "networks" },
              { value: "0", label: "custody" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col justify-center bg-nm-bg p-4 text-center">
                <p className="font-mono text-2xl font-bold text-nm-fg">{item.value}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>

      <div className="mt-12">
        <FragmentDivider />
      </div>
    </section>
  );
}
