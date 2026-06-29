"use client";

import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ScrollReveal } from "@/components/ScrollReveal";

interface SimulationEntry {
  id: number;
  chain: "base" | "solana" | "telegram";
  stage: string;
  detail: string;
}

const SIMULATION_EVENTS: Omit<SimulationEntry, "id">[] = [
  { chain: "base", stage: "monitor", detail: "dip condition checked against the configured threshold" },
  { chain: "solana", stage: "monitor", detail: "profit target checked against the recorded entry" },
  { chain: "base", stage: "prepare", detail: "rebalance proposal assembled for wallet review" },
  { chain: "telegram", stage: "notify", detail: "proposal summary queued for the linked chat" },
  { chain: "solana", stage: "review", detail: "guarded Jupiter payload awaits wallet approval" },
  { chain: "base", stage: "review", detail: "exact target, value, and calldata await wallet approval" },
];

function simulationEvent(sequence: number): SimulationEntry {
  return { id: sequence, ...SIMULATION_EVENTS[sequence % SIMULATION_EVENTS.length]! };
}

export function LiveActivityFeed() {
  const [logs, setLogs] = useState<SimulationEntry[]>([]);
  const sequenceRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // This panel is illustrative only and never reads user or production activity.
  useEffect(() => {
    setLogs(Array.from({ length: 6 }, (_, index) => simulationEvent(index)));
    sequenceRef.current = 6;
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const interval = setInterval(() => {
      setLogs((previous) => {
        const next = simulationEvent(sequenceRef.current++);
        const updated = [...previous, next];
        return updated.length > 18 ? updated.slice(updated.length - 18) : updated;
      });
    }, 3600);

    return () => clearInterval(interval);
  }, [reducedMotion]);

  useEffect(() => {
    if (scrollRef.current && !reducedMotion) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, reducedMotion]);

  useEffect(() => {
    if (window.location.hash !== "#network") return;

    const timer = window.setTimeout(() => {
      document.getElementById("network")?.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", window.location.pathname);
    }, 50);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section id="network" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
      <ScrollReveal>
        <div className="flex items-center gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">
            agent workflow preview
          </h2>
          <div className="section-line flex-1" aria-hidden="true" />
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={150}>
        <div className="card-premium relative mt-8 overflow-hidden border border-nm-border bg-nm-bg">
          <div className="flex items-center justify-between border-b border-nm-border bg-nm-surface px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="status-pulse h-2 w-2 bg-nm-fragment-blue" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                simulation / no user data
              </span>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              <div className="h-2 w-2 rounded-full bg-nm-border" />
              <div className="h-2 w-2 rounded-full bg-nm-border" />
              <div className="h-2 w-2 rounded-full bg-nm-border" />
            </div>
          </div>

          <div
            ref={scrollRef}
            className="relative h-[320px] overflow-y-auto bg-[#0a0a0a] p-4 font-mono text-[11px] leading-relaxed tracking-wider sm:text-xs"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div
              className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20 mix-blend-overlay"
              aria-hidden="true"
            />

            <div className="relative z-20 flex flex-col gap-2">
              {logs.map((log) => (
                <div key={log.id} className="fade-in-up flex gap-3 opacity-90 transition-opacity hover:opacity-100">
                  <span className="shrink-0 text-nm-muted">[SIM-{String(log.id + 1).padStart(2, "0")}]</span>
                  <span className="shrink-0 text-nm-fragment-blue">{log.chain}</span>
                  <span className="shrink-0 text-nm-fg">::</span>
                  <span className="text-nm-muted">
                    <span className="text-nm-fg">{log.stage}</span> / {log.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
