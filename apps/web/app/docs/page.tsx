import type { Metadata } from "next";
import Link from "next/link";

import { FragmentDivider } from "@/components/FragmentDivider";

export const metadata: Metadata = {
  title: "NEMESIS docs",
  description: "Public documentation for NEMESIS approval-first agents on Base and Solana.",
  alternates: { canonical: "/docs" },
};

const DOC_SECTIONS = [
  {
    id: "how-it-works",
    title: "how NEMESIS works",
    body: [
      "NEMESIS is an approval-first automation platform for Base and Solana wallets. A user connects a wallet, chooses or describes intent, reviews a plain-language plan, deploys a narrow agent, and receives proposals through the dashboard or Telegram.",
      "Agents monitor one condition and prepare one action. NEMESIS does not custody funds. Agents do not hold signing authority, and they do not move assets without the user's wallet approval.",
    ],
  },
  {
    id: "deploy-agent",
    title: "how to deploy an agent",
    body: [
      "Open deploy, connect the wallet you want to use, choose a template or describe intent, review the proposed configuration, complete any required risk acknowledgement, and approve deployment only after the summary matches what you want.",
      "After deployment, the agent appears in your wallet dashboard. Proposals remain separate from final wallet signing, so you can decline by simply not approving the transaction.",
    ],
  },
  {
    id: "security-model",
    title: "security model",
    body: [
      "NEMESIS is designed around non-custody, wallet ownership checks, explicit approval, and constrained templates. Sensitive routes are scoped to the authenticated wallet or linked Telegram account.",
      "Never paste private keys, seed phrases, recovery phrases, API keys, bot tokens, or confidential personal data into the app, Telegram bot, or Talk with NEMESIS.",
    ],
  },
  {
    id: "telegram-linking",
    title: "telegram linking",
    body: [
      "Telegram is optional. Generate a short-lived link code from the dashboard, open the NEMESIS bot, and send the link command shown on screen. The bot can then route proposals and status responses to that Telegram chat.",
      "The bot does not receive private keys and cannot sign transactions. It is a notification and approval companion, not a custody surface.",
    ],
  },
  {
    id: "base-solana",
    title: "base and solana support",
    body: [
      "Base agents use EVM wallet flows, SIWE authentication, and guarded proposal confirmation. Solana support is designed around Solflare-compatible wallet access and guarded proposal flows where available.",
      "Network fees, wallet behavior, RPC availability, DEX routing, and third-party services remain outside NEMESIS custody and control.",
    ],
  },
  {
    id: "talk-with-nemesis",
    title: "talk with NEMESIS",
    body: [
      "Talk with NEMESIS is a public chat surface powered by OpenRouter. It can answer general questions naturally and can explain NEMESIS concepts, templates, safety boundaries, and usage flows.",
      "It has no access to your wallet, database rows, Telegram chat, runtime agents, environment variables, private developer systems, or hidden internal files.",
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">docs</p>
          <h1 className="mt-4 font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">operating NEMESIS safely</h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-nm-muted">
            Product documentation for using NEMESIS as an approval-first, non-custodial agent platform across Base and Solana.
          </p>
        </div>
        <Link href="/changelog" className="font-mono text-xs uppercase tracking-widest2 text-nm-fragment-red">
          changelog {"->"}
        </Link>
      </div>

      <div className="mt-8">
        <FragmentDivider />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-[0.75fr_1.25fr]">
        <aside className="h-fit border border-nm-border bg-nm-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">contents</p>
          <nav className="mt-4 flex flex-col gap-3 font-mono text-xs uppercase tracking-widest2 text-nm-muted">
            {DOC_SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="transition-colors hover:text-nm-fg">
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-4">
          {DOC_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 border border-nm-border bg-nm-bg p-6">
              <h2 className="font-mono text-sm font-bold uppercase tracking-widest2 text-nm-fg">{section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-nm-muted">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
