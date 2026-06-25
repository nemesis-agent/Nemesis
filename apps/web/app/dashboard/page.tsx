import Link from "next/link";

import { AgentCard } from "@/components/AgentCard";
import { Button } from "@/components/Button";
import { ConnectTelegramCard } from "@/components/ConnectTelegramCard";
import { FragmentDivider } from "@/components/FragmentDivider";
import { ScrollReveal } from "@/components/ScrollReveal";
import { listAgents } from "@nemesis/db";

// Reads live from SQLite on every request — agents can be paused/resumed
// and new proposals can land at any time, so this page must never be
// statically cached. See CONTEXT.md, "What changed in the database pass".
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const agents = await listAgents();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">agents</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nm-muted">
            Agents deployed to your wallet. Proposals are sent to Telegram and listed here —
            nothing executes without your approval.
          </p>
        </div>
        <Button href="/agents/new" variant="primary" magnetic>
          Deploy agent
        </Button>
      </div>

      <div className="mt-10">
        <FragmentDivider />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((agent, index) => (
            <ScrollReveal key={agent.id} delayMs={index * 70}>
              <AgentCard agent={agent} />
            </ScrollReveal>
          ))}

          {agents.length === 0 && (
            <div className="border border-nm-border p-8 text-center sm:col-span-2">
              <p className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">no agents deployed yet</p>
              <Link
                href="/agents/new"
                className="mt-4 inline-block font-mono text-xs uppercase tracking-widest2 text-nm-fragment-red"
              >
                deploy your first agent →
              </Link>
            </div>
          )}
        </div>

        <ScrollReveal delayMs={120}>
          <ConnectTelegramCard />
        </ScrollReveal>
      </div>
    </div>
  );
}
