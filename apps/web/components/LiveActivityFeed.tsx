"use client";

import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FragmentDivider } from "@/components/FragmentDivider";

type LogEntry = {
  id: string;
  time: string;
  agent: string;
  action: string;
  target: string;
  status: "proposed" | "approved" | "rejected";
};

const AGENT_IDS = ["0x4f...92", "0x8a...33", "0x11...ec", "0x9d...44", "0x3b...71"];
const ACTIONS = ["dip-buy", "portfolio-rebalance", "limit-order", "yield-harvest", "stop-loss"];
const TARGETS = ["Aerodrome", "Uniswap", "Aave", "Morpho", "Compound"];

function generateMockLog(): LogEntry {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

  const statusRoll = Math.random();
  const status = statusRoll > 0.8 ? "approved" : statusRoll > 0.7 ? "rejected" : "proposed";

  return {
    id: Math.random().toString(36).substring(7),
    time,
    agent: `Agent-${AGENT_IDS[Math.floor(Math.random() * AGENT_IDS.length)]}`,
    action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)]!,
    target: TARGETS[Math.floor(Math.random() * TARGETS.length)]!,
    status,
  };
}

export function LiveActivityFeed() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Mount effect to generate initial logs on client only
  useEffect(() => {
    setLogs(Array.from({ length: 6 }).map(() => generateMockLog()));
    setMounted(true);
  }, []);

  // Add new logs periodically
  useEffect(() => {
    if (reducedMotion) return;

    const interval = setInterval(() => {
      setLogs((prev) => {
        const newLogs = [...prev, generateMockLog()];
        // Keep max 30 logs in memory
        if (newLogs.length > 30) return newLogs.slice(newLogs.length - 30);
        return newLogs;
      });
    }, 2800 + Math.random() * 2000); // Random interval between 2.8s and 4.8s

    return () => clearInterval(interval);
  }, [reducedMotion]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current && !reducedMotion) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [logs, reducedMotion]);

  // Intercept hash to clear URL if arrived from another page
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#network") {
      const timer = setTimeout(() => {
        const el = document.getElementById("network");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          // Wipe the hash from the URL silently
          history.replaceState(null, "", window.location.pathname);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <section id="network" className="mx-auto max-w-6xl px-6 py-16 scroll-mt-24">
      <ScrollReveal>
        <div className="flex items-center gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">
            network activity
          </h2>
          <div className="section-line flex-1" aria-hidden="true" />
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={150}>
        <div className="card-premium relative mt-8 overflow-hidden border border-nm-border bg-nm-bg">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-nm-border bg-nm-surface px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="status-pulse h-2 w-2 bg-nm-resolve" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                live feed / base + solana
              </span>
            </div>
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-nm-border" />
              <div className="h-2 w-2 rounded-full bg-nm-border" />
              <div className="h-2 w-2 rounded-full bg-nm-border" />
            </div>
          </div>

          {/* Terminal Window */}
          <div
            ref={scrollRef}
            className="relative h-[320px] overflow-y-auto bg-[#0a0a0a] p-4 font-mono text-[11px] leading-relaxed tracking-wider sm:text-xs"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* Tech Scanline Overlay inside terminal */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20 mix-blend-overlay z-10" />

            <div className="relative z-20 flex flex-col gap-2">
              {mounted && logs.map((log) => (
                <div key={log.id} className="fade-in-up flex gap-3 opacity-90 transition-opacity hover:opacity-100">
                  <span className="shrink-0 text-nm-muted">[{log.time}]</span>
                  <span className="shrink-0 text-nm-fragment-blue">{log.agent}</span>
                  <span className="shrink-0 text-nm-fg">::</span>
                  <span className="text-nm-muted">
                    {log.status === "proposed" && "proposed "}
                    {log.status === "approved" && <span className="text-nm-resolve">approved </span>}
                    {log.status === "rejected" && <span className="text-nm-fragment-red">rejected </span>}
                    {log.action} on <span className="text-nm-fg">{log.target}</span>
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
