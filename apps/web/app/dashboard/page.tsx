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
            <div className="border border-nm-border bg-nm-bg p-8 sm:col-span-2">
              <h2 className="font-mono text-sm font-bold uppercase tracking-widest2 text-nm-fg mb-6">
                Onboarding: 3 Steps to Automation
              </h2>
              
              <div className="flex flex-col gap-6">
                <div className="flex gap-4 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-nm-resolve text-nm-resolve font-mono text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="font-mono text-xs uppercase text-nm-fg">Connect Wallet</h3>
                    <p className="mt-1 text-sm text-nm-muted">Your wallet is connected and signed via SIWE. You're ready for step 2.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-nm-fragment-blue text-nm-fragment-blue font-mono text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="font-mono text-xs uppercase text-nm-fg">Link Telegram</h3>
                    <p className="mt-1 text-sm text-nm-muted">Use the panel on the right to link your Telegram. This is where you will receive and approve transaction proposals.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-nm-fragment-red text-nm-fragment-red font-mono text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="font-mono text-xs uppercase text-nm-fg">Deploy Master Agent</h3>
                    <p className="mt-1 text-sm text-nm-muted">Tell the Master Agent what you want to automate. It will configure a sub-agent to watch the market for you.</p>
                    <Link
                      href="/agents/new"
                      className="mt-3 inline-block font-mono text-xs uppercase tracking-widest2 text-nm-fg border border-nm-border px-4 py-2 hover:bg-nm-surface transition-colors"
                    >
                      Deploy your first agent →
                    </Link>
                  </div>
                </div>
              </div>
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
