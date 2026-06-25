import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { HeroParticles } from "@/components/HeroParticles";
import { HeroTicker } from "@/components/HeroTicker";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ── Backgrounds ──────────────────────────────────────────────── */}
      <HeroParticles />

      {/* Ambient radial glow behind the wordmark */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(226,82,79,0.07) 0%, rgba(74,143,217,0.04) 40%, transparent 70%)",
        }}
      />

      {/* ── Main hero content ─────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-8 sm:pt-36 sm:pb-12">
        {/* Tech Corner Markers */}
        <div className="absolute left-6 top-24 hidden h-4 w-4 border-l border-t border-nm-muted/50 sm:block" aria-hidden="true" />
        <div className="absolute right-6 top-24 hidden h-4 w-4 border-r border-t border-nm-muted/50 sm:block" aria-hidden="true" />
        <div className="absolute bottom-8 left-6 hidden h-4 w-4 border-b border-l border-nm-muted/50 sm:block" aria-hidden="true" />
        <div className="absolute bottom-8 right-6 hidden h-4 w-4 border-b border-r border-nm-muted/50 sm:block" aria-hidden="true" />

        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div
            className="fade-in-up mb-8 inline-flex items-center gap-2 border border-nm-border bg-nm-surface px-4 py-1.5"
            style={{ animationDelay: "0ms" }}
          >
            <span className="status-pulse h-1.5 w-1.5 bg-nm-resolve" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
              live on base mainnet
            </span>
          </div>

          {/* Glitch wordmark */}
          <h1 className="glitch-wordmark font-mono text-[clamp(3.5rem,12vw,8rem)] font-bold leading-none tracking-widest2">
            <span className="glitch-layer glitch-layer--red" aria-hidden="true">
              NEMESIS
            </span>
            <span className="glitch-layer glitch-layer--blue" aria-hidden="true">
              NEMESIS
            </span>
            <span className="glitch-base">NEMESIS</span>
          </h1>

          {/* Tagline */}
          <p
            className="fade-in-up mt-8 font-mono text-sm uppercase tracking-widest2 text-nm-muted sm:text-base"
            style={{ animationDelay: "120ms" }}
          >
            chaos in.{" "}
            <span className="text-nm-fg">order out.</span>
          </p>

          {/* Description */}
          <p
            className="fade-in-up mt-6 max-w-2xl text-base leading-relaxed text-nm-muted sm:text-lg"
            style={{ animationDelay: "220ms" }}
          >
            Deploy autonomous agents that watch the market and propose action on your behalf.
            Built on Hermes, proposed through Base MCP. Every transaction waits for your
            approval — nothing moves without you.
          </p>

          {/* CTAs */}
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

          {/* Stats row */}
          <div
            className="fade-in-up mt-14 grid grid-cols-3 gap-px border border-nm-border bg-nm-border sm:w-auto sm:grid-cols-3"
            style={{ animationDelay: "420ms" }}
          >
            {[
              { value: "10", label: "templates" },
              { value: "0", label: "funds custodied" },
              { value: "100%", label: "approval-first" },
            ].map((stat) => (
              <div key={stat.label} className="bg-nm-bg px-8 py-5 text-center">
                <p className="font-mono text-2xl font-bold text-nm-fg">{stat.value}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrolling ticker ─────────────────────────────────────────── */}
      <div className="relative z-10 mt-12">
        <HeroTicker />
      </div>

      {/* ── Bottom divider ────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 mt-0">
        <FragmentDivider />
      </div>
    </section>
  );
}
