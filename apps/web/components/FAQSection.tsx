import { FragmentDivider } from "@/components/FragmentDivider";
import { ScrollReveal } from "@/components/ScrollReveal";

const FAQ_ITEMS = [
  {
    question: "what is NEMESIS?",
    answer:
      "NEMESIS is an approval-first agent platform for Base and Solana wallets. You can deploy narrow agents that monitor a condition, prepare a proposal, and wait for your wallet approval before anything moves.",
  },
  {
    question: "does NEMESIS custody my funds?",
    answer:
      "No. NEMESIS does not custody funds, does not ask for seed phrases, and does not hold private keys. Your own wallet remains the signer for every transaction.",
  },
  {
    question: "can an agent execute automatically?",
    answer:
      "No. Agents can monitor and propose actions, but final execution requires explicit user approval and wallet signing. The platform is built around proposal-first automation, not unattended fund movement.",
  },
  {
    question: "what is Telegram used for?",
    answer:
      "Telegram is an optional notification and approval surface. You can link a wallet to the NEMESIS bot so proposals are easier to see, but the bot does not receive your private keys or signing authority.",
  },
  {
    question: "which networks are supported?",
    answer:
      "NEMESIS currently supports Base and Solana surfaces. Base uses EVM wallet flows, while Solana support is designed around Solflare-compatible wallet access and guarded proposal flows.",
  },
  {
    question: "is NEMESIS free to use?",
    answer:
      "Yes. The product is intended to stay free for users. You may still pay normal network fees, DEX fees, wallet fees, or third-party infrastructure costs when you approve transactions yourself.",
  },
  {
    question: "can I ask Talk with NEMESIS anything?",
    answer:
      "Yes. Talk with NEMESIS is a natural chat surface. It can answer general questions and product questions, but it will not handle secrets, private keys, bot tokens, private user data, or internal developer information.",
  },
  {
    question: "does NEMESIS guarantee outcomes?",
    answer:
      "No. NEMESIS is software tooling, not financial advice. It does not guarantee fills, returns, execution prices, token safety, uptime, or proposal accuracy.",
  },
];

export function FAQSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16" id="faq">
      <ScrollReveal>
        <div className="flex items-center gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">faq</h2>
          <div className="section-line flex-1" aria-hidden="true" />
        </div>
        <div className="mt-6 max-w-3xl">
          <p className="font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">questions before deployment</p>
          <p className="mt-4 text-sm leading-relaxed text-nm-muted">
            The short version: agents propose, users approve, wallets sign. NEMESIS is designed to stay non-custodial and approval-first across Base and Solana.
          </p>
        </div>
      </ScrollReveal>

      <div className="mt-8 border border-nm-border bg-nm-surface">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="group border-b border-nm-border last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-5 font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg transition-colors hover:text-nm-fragment-red">
              <span>{item.question}</span>
              <span className="text-nm-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <div className="px-5 pb-5 text-sm leading-relaxed text-nm-muted">
              <p>{item.answer}</p>
            </div>          </details>
        ))}
      </div>

      <div className="mt-12">
        <FragmentDivider />
      </div>
    </section>
  );
}
