import type { Metadata } from "next";
import Link from "next/link";

import { FragmentDivider } from "@/components/FragmentDivider";

const MEDIUM_URL = "https://medium.com/@nemesisagent1";

export const metadata: Metadata = {
  title: "NEMESIS updates",
  description: "Development updates and product notes for NEMESIS approval-first agents.",
  alternates: { canonical: "/updates" },
};

const UPDATE_TOPICS = [
  {
    label: "primer",
    title: "why approval-first agents",
    summary:
      "A short explanation of the core NEMESIS model: agents monitor and prepare proposals, while the user's own wallet stays responsible for final approval and signing.",
  },
  {
    label: "security",
    title: "what NEMESIS can and cannot access",
    summary:
      "A public safety note covering wallet boundaries, private keys, Telegram linking, Talk with NEMESIS, and why users should never paste secrets into any product surface.",
  },
  {
    label: "product",
    title: "how Telegram proposal linking works",
    summary:
      "A walkthrough of generating a short-lived code, linking Telegram to a wallet, receiving proposals, and keeping transaction approval inside the user's wallet.",
  },
  {
    label: "network",
    title: "Base and Solana support notes",
    summary:
      "A practical update on how NEMESIS treats Base and Solana differently while keeping the same approval-first product rule across both networks.",
  },
  {
    label: "build log",
    title: "shipping FAQ, docs, changelog, and roadmap",
    summary:
      "A development note on the public trust layer: FAQ, docs, changelog, roadmap, production smoke checks, and audit gates for product-facing copy.",
  },
];

export default function UpdatesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">updates</p>
          <h1 className="mt-4 max-w-3xl font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">
            development notes for approval-first agents
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-nm-muted">
            NEMESIS updates are written for users who want to understand what shipped, why it matters, and how the safety model works without exposing private implementation details.
          </p>
        </div>
        <a
          href={MEDIUM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs uppercase tracking-widest2 text-nm-fragment-red"
        >
          medium {"->"}
        </a>
      </div>

      <div className="mt-8">
        <FragmentDivider />
      </div>

      <div className="mt-8 border border-nm-border bg-nm-surface p-5 text-sm leading-relaxed text-nm-muted">
        Official long-form posts live on Medium. This page keeps the website index clean, public, and product-facing while avoiding private operational details, credentials, internal logs, or user data.
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          {UPDATE_TOPICS.map((topic) => (
            <article key={topic.title} className="border border-nm-border bg-nm-bg p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                  {topic.label}
                </span>
                <h2 className="font-mono text-sm font-bold uppercase tracking-widest2 text-nm-fg">{topic.title}</h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-nm-muted">{topic.summary}</p>
            </article>
          ))}
        </section>

        <aside className="h-fit border border-nm-border bg-nm-surface p-6">
          <p className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">publishing rule</p>
          <p className="mt-4 text-sm leading-relaxed text-nm-muted">
            Updates should explain product behavior, safety boundaries, and user-facing changes. They should not reveal secrets, environment variables, private infrastructure, private user data, or unsupported execution details.
          </p>
          <div className="mt-6 flex flex-col gap-3 font-mono text-xs uppercase tracking-widest2 text-nm-fragment-red">
            <a href={MEDIUM_URL} target="_blank" rel="noopener noreferrer">open medium {"->"}</a>
            <Link href="/docs">docs {"->"}</Link>
            <Link href="/roadmap">roadmap {"->"}</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
