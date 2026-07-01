import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { HeroModelStage } from "@/components/HeroModelStage";
import { HeroParticles } from "@/components/HeroParticles";
import { HeroTicker } from "@/components/HeroTicker";
import { TEMPLATES } from "@nemesis/templates";

export function Hero() {
  return (
    <section className="relative max-w-full overflow-hidden">
      <HeroModelStage />
      <HeroParticles />

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(600px,100vw)] w-[min(600px,100vw)] -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(226,82,79,0.10) 0%, rgba(74,143,217,0.06) 42%, transparent 72%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-8 sm:pt-32 sm:pb-12">
        <div className="absolute left-6 top-24 hidden h-4 w-4 border-l border-t border-nm-muted/50 sm:block" aria-hidden="true" />
        <div className="absolute right-6 top-24 hidden h-4 w-4 border-r border-t border-nm-muted/50 sm:block" aria-hidden="true" />
        <div className="absolute bottom-8 left-6 hidden h-4 w-4 border-b border-l border-nm-muted/50 sm:block" aria-hidden="true" />
        <div className="absolute bottom-8 right-6 hidden h-4 w-4 border-b border-r border-nm-muted/50 sm:block" aria-hidden="true" />

        <div className="relative flex min-h-[700px] flex-col items-center justify-center text-center sm:min-h-[780px] lg:min-h-[850px]">
          <div className="pointer-events-none absolute inset-x-0 top-[16%] h-[52%] bg-[radial-gradient(ellipse_at_center,rgba(5,5,5,0.2),transparent_66%)]" aria-hidden="true" />

          <div className="relative z-10 flex flex-col items-center">
            <div
              className="network-badge fade-in-up mb-8 inline-flex items-center gap-2 overflow-hidden border border-nm-border bg-nm-surface/80 px-4 py-1.5 backdrop-blur-md"
              style={{ animationDelay: "0ms" }}
            >
              <span className="status-pulse h-1.5 w-1.5 bg-nm-resolve" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                live on base + solana
              </span>
            </div>

            <h1 className="glitch-wordmark font-mono text-[clamp(3.35rem,12vw,8rem)] font-bold leading-none tracking-widest2 [text-shadow:0_14px_48px_rgba(0,0,0,0.92)]">
              <span className="glitch-layer glitch-layer--red" aria-hidden="true">
                NEMESIS
              </span>
              <span className="glitch-layer glitch-layer--blue" aria-hidden="true">
                NEMESIS
              </span>
              <span className="glitch-base">NEMESIS</span>
            </h1>

            <p
              className="fade-in-up mt-8 font-mono text-sm uppercase tracking-widest2 text-nm-muted [text-shadow:0_8px_24px_rgba(0,0,0,0.86)] sm:text-base"
              style={{ animationDelay: "120ms" }}
            >
              chaos in. <span className="text-nm-fg">order out.</span>
            </p>

            <p
              className="fade-in-up mt-6 max-w-2xl text-base leading-relaxed text-nm-muted [text-shadow:0_8px_28px_rgba(0,0,0,0.9)] sm:text-lg"
              style={{ animationDelay: "220ms" }}
            >
              Deploy autonomous agents that watch the market and propose action on your behalf.
              Powered by OpenRouter for Base and Solana. Every wallet action waits for your
              approval - nothing moves without you.
            </p>

            <div
              className="fade-in-up mt-10 flex flex-wrap justify-center gap-3"
              style={{ animationDelay: "320ms" }}
            >
              <Button href="/agents/new" variant="primary" magnetic>
                Deploy agent
              </Button>
              <Button href="/templates" variant="secondary" magnetic>
                View templates
              </Button>
            </div>

            <div
              className="fade-in-up mt-14 grid grid-cols-3 gap-px border border-nm-border bg-nm-border/80 backdrop-blur-md sm:w-auto"
              style={{ animationDelay: "420ms" }}
            >
              {[
                { value: String(TEMPLATES.length), label: "templates" },
                { value: "0", label: "funds custodied" },
                { value: "100%", label: "approval-first" },
              ].map((stat) => (
                <div key={stat.label} className="bg-nm-bg/86 px-5 py-5 text-center sm:px-8">
                  <p className="font-mono text-xl font-bold text-nm-fg sm:text-2xl">{stat.value}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 -mt-10 sm:-mt-14">
        <HeroTicker />
      </div>

      <div className="relative z-10 mx-auto mt-0 max-w-6xl px-6">
        <FragmentDivider />
      </div>
    </section>
  );
}
