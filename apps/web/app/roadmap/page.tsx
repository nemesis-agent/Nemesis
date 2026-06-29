import type { Metadata } from "next";
import Link from "next/link";

import { FragmentDivider } from "@/components/FragmentDivider";

export const metadata: Metadata = {
  title: "NEMESIS roadmap",
  description: "Directional public roadmap for NEMESIS approval-first agents.",
  alternates: { canonical: "/roadmap" },
};

const ROADMAP_SECTIONS = [
  {
    label: "shipped",
    title: "available now",
    items: [
      "Approval-first Base agents with wallet-scoped deployment and proposal review.",
      "Solana support with Solflare-compatible wallet flow and guarded proposal paths.",
      "Telegram proposal linking for wallet-specific notifications and commands.",
      "Talk with NEMESIS powered by OpenRouter for natural product and general chat.",
      "Public FAQ, documentation, changelog, and production audit gates.",
    ],
  },
  {
    label: "building",
    title: "active product work",
    items: [
      "Observability layer for OpenRouter, Telegram bot, Base RPC fallback, Solana RPC, and runner heartbeat visibility.",
      "Production smoke automation expansion across public pages, template pages, verification files, and auth guard checks.",
      "User guide polish with clearer empty states, deploy instructions, Telegram linking copy, and proposal review language.",
    ],
  },
  {
    label: "exploring",
    title: "research and validation",
    items: [
      "More executable template encoders with constrained contracts, exact payload verification, and no arbitrary calldata path.",
      "Richer agent simulation previews that show condition, action, risk, and expected approval flow before deployment.",
      "More template filters by chain, risk level, protocol, and category.",
      "Optional notification improvements such as clearer Telegram status responses and proposal reminders.",
      "More public education content including architecture notes, safety notes, and short development updates.",
    ],
  },
  {
    label: "not planned",
    title: "hard boundaries",
    items: [
      "Custody of user funds, private keys, seed phrases, or recovery phrases.",
      "Automatic transaction execution without explicit wallet approval.",
      "Paywalls, premium tiers, or access gating for core product usage.",
      "Outcome promises, investment advice, or claims that remove market and protocol risk.",
      "Unbounded arbitrary execution that bypasses template constraints and payload verification.",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">roadmap</p>
          <h1 className="mt-4 max-w-3xl font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">
            agents propose. users approve. wallets sign.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-nm-muted">
            NEMESIS ships in public around one principle: automation can prepare proposals, but the user's wallet remains the final authority.
          </p>
        </div>
        <Link href="/changelog" className="font-mono text-xs uppercase tracking-widest2 text-nm-fragment-red">
          changelog {"->"}
        </Link>
      </div>

      <div className="mt-8">
        <FragmentDivider />
      </div>

      <div className="mt-8 border border-nm-border bg-nm-surface p-5 text-sm leading-relaxed text-nm-muted">
        This roadmap is directional. Items may change based on safety, reliability, user feedback, and infrastructure constraints. No item is a promise of timing or outcome.
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {ROADMAP_SECTIONS.map((section) => (
          <section key={section.label} className="border border-nm-border bg-nm-bg p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                {section.label}
              </span>
              <h2 className="font-mono text-sm font-bold uppercase tracking-widest2 text-nm-fg">{section.title}</h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-nm-muted">
              {section.items.map((item) => (
                <li key={item} className="border-l border-nm-border pl-4">{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
