import type { Metadata } from "next";
import Link from "next/link";

import { FragmentDivider } from "@/components/FragmentDivider";

export const metadata: Metadata = {
  title: "NEMESIS changelog",
  description: "Public changelog for NEMESIS product updates.",
  alternates: { canonical: "/changelog" },
};

const CHANGES = [
  {
    label: "current",
    title: "public FAQ and docs layer",
    items: [
      "Added a public FAQ explaining non-custody, approval-first agents, Telegram linking, Base and Solana support, free access, and Talk with NEMESIS boundaries.",
      "Added public documentation for safe operation, deployment flow, security model, Telegram linking, network support, and chat behavior.",
      "Added changelog surface so users can track meaningful product updates.",
    ],
  },
  {
    label: "latest",
    title: "Talk with NEMESIS expansion",
    items: [
      "Talk with NEMESIS now behaves as a natural public chat assistant while keeping strict boundaries around secrets, credentials, internal data, and user privacy.",
      "The chat remains powered by OpenRouter and uses public NEMESIS context when questions relate to agents, wallets, Base, Solana, Telegram, or product safety.",
    ],
  },
  {
    label: "shipped",
    title: "Base and Solana approval-first agents",
    items: [
      "Template coverage includes production-ready Base agents and Solana templates with wallet-scoped proposal flows.",
      "Dashboard, agent detail, Telegram linking, proposal confirmation, and runtime health surfaces are guarded around authenticated or linked wallet ownership.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">changelog</p>
          <h1 className="mt-4 font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">product updates</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-nm-muted">
            Public product notes for NEMESIS. Entries focus on shipped user-facing changes and safety-relevant improvements.
          </p>
        </div>
        <div className="flex gap-4 font-mono text-xs uppercase tracking-widest2 text-nm-fragment-red">
          <Link href="/docs">docs {"->"}</Link>
          <Link href="/roadmap">roadmap {"->"}</Link>
        </div>
      </div>

      <div className="mt-8">
        <FragmentDivider />
      </div>

      <div className="mt-10 space-y-4">
        {CHANGES.map((entry) => (
          <article key={entry.title} className="border border-nm-border bg-nm-surface p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                {entry.label}
              </span>
              <h2 className="font-mono text-sm font-bold uppercase tracking-widest2 text-nm-fg">{entry.title}</h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-nm-muted">
              {entry.items.map((item) => (
                <li key={item} className="border-l border-nm-border pl-4">{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
