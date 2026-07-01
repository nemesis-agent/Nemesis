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
    title: "execution safety hardening",
    items: [
      "Base confirmations now require strict transaction hash shape, receipt/hash matching, block timestamp validation inside the proposal execution window, duplicate confirmation rejection, and step-by-step execution state recording.",
      "Solana confirmations now reject failed on-chain transactions and require confirmed block time inside the proposal execution window before marking a proposal approved.",
      "Execution policy tests and audit checks now cover confirmation replay boundaries so guarded wallet-signable flows stay narrow and reviewable.",
    ],
  },
  {
    label: "current",
    title: "agent dashboard and Telegram proposal UX phase 2",
    items: [
      "Agent dashboard now includes a wallet-private command center with aggregate agent and proposal queue counts before users open individual agent details.",
      "Agent detail pages now show an operational brief with network, risk, execution mode, and signable versus review-only pending proposal split.",
      "Telegram proposal messages now show a clearer review path, execution window, approval boundary, and dashboard review receipt after acknowledgement.",
    ],
  },
  {
    label: "current",
    title: "template detail and deploy flow polish",
    items: [
      "Template detail pages now include a template operating brief, deploy readiness, execution mode, risk gate, and four-step review path before users deploy.",
      "Deploy now opens with a wallet, plan, risk, and approval checklist plus selected template network, risk, and execution context.",
      "Deployment plan cards now show chain, risk, execution coverage, wallet mode, deploy review path, and a final checklist before agent creation.",
    ],
  },
  {
    label: "current",
    title: "proposal lifecycle and status polish",
    items: [
      "Agent detail pages now include proposal status filters for all, pending, approved, and skipped proposals.",
      "Proposal rows now show a visual review path from observed inputs to proposed action to wallet approval.",
      "Proposal review now separates decision trace, observed inputs, execution preview, lifecycle state, and approval checklist before any wallet signing request.",
      "Public docs and health output now include clearer troubleshooting for Telegram linking, duplicate pending proposals, expired payloads, and degraded service checks.",
    ],
  },
  {
    label: "current",
    title: "template detail polish and docs sync",
    items: [
      "Template detail pages now show safety rails, approval boundary, observed fields, approval checklist, parameter defaults, and proposal preview before deployment.",
      "Removed mock backtest-style language from template previews so users are not shown APY, win-rate, or performance claims before deploy.",
      "Updated public docs, security notes, privacy notes, architecture context, and roadmap language to match the current Base and Solana release state.",
    ],
  },
  {
    label: "latest",
    title: "public FAQ and docs layer",
    items: [
      "Added a public FAQ explaining non-custody, approval-first agents, Telegram linking, Base and Solana support, free access, and Talk with NEMESIS boundaries.",
      "Added public documentation for safe operation, deployment flow, security model, Telegram linking, network support, token safety, and chat behavior.",
      "Added changelog, roadmap, and updates surfaces so users can track meaningful product changes from the website.",
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
      "Dashboard, agent detail, Telegram linking, proposal confirmation, runtime health, and public status surfaces are guarded around authenticated or linked wallet ownership.",
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
          <Link href="/updates">updates {"->"}</Link>
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
