import { FragmentDivider } from "@/components/FragmentDivider";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">terms of service</h1>
      <div className="mt-8">
        <FragmentDivider />
      </div>
      <div className="prose prose-invert mt-12 text-sm leading-relaxed text-nm-muted">
        <p><strong>Last updated: June 30, 2026</strong></p>
        <p>
          These terms describe how NEMESIS works and the responsibilities you accept when using it. By using the
          platform, connecting a wallet, deploying an agent, linking Telegram, using Talk with NEMESIS, or approving a
          proposal, you agree to these terms.
        </p>

        <h2 className="text-nm-fg">1. Nature of the service</h2>
        <p>
          NEMESIS is an approval-first, non-custodial automation interface for Base and Solana wallets. Users configure
          single-condition agents that monitor data sources and generate proposals. NEMESIS does not provide a
          custodial account, brokerage account, investment advisory account, or managed trading service.
        </p>

        <h2 className="text-nm-fg">2. No custody and no automatic execution</h2>
        <p>
          NEMESIS never holds your private keys, seed phrase, or user funds. Agents can propose actions, but they do
          not have authority to move funds by themselves. A transaction can only be signed and broadcast from your own
          wallet after you review and explicitly approve the exact wallet action shown to you.
        </p>

        <h2 className="text-nm-fg">3. User responsibility</h2>
        <p>
          You are responsible for reviewing every proposal, transaction payload, destination address, token amount,
          chain, fee, and smart contract interaction before signing. If a proposal is wrong, stale, incomplete, or no
          longer matches market conditions, do not approve it.
        </p>

        <h2 className="text-nm-fg">4. Market and protocol risk</h2>
        <p>
          Crypto assets, DeFi protocols, liquidity pools, and new token launches are risky. Prices can move quickly;
          liquidity can disappear; transactions can fail; slippage can be severe; smart contracts, bridges, RPCs,
          oracles, APIs, and third-party protocols can be exploited or unavailable. NEMESIS makes no promise of
          profit, performance, uptime, execution price, token safety, or proposal accuracy.
        </p>

        <h2 className="text-nm-fg">5. No financial, legal, or tax advice</h2>
        <p>
          NEMESIS provides software tooling and plain-language automation workflows. Nothing in the app, Telegram bot,
          templates, prompts, proposals, docs, or generated output is financial, legal, tax, accounting, or investment
          advice. You should make your own decisions and consult qualified professionals where needed.
        </p>

        <h2 className="text-nm-fg">6. Third-party services</h2>
        <p>
          NEMESIS depends on third-party infrastructure and services including wallet providers, WalletConnect/Reown,
          Telegram, OpenRouter/model providers, Railway, Supabase/Postgres, RPC providers, price feeds, DexScreener,
          Jupiter, decentralized exchanges, and Base and Solana network infrastructure. Their availability, terms,
          privacy practices, and behavior are outside NEMESIS control.
        </p>

        <h2 className="text-nm-fg">7. Prohibited use</h2>
        <p>
          You may not use NEMESIS to violate laws, sanctions, third-party rights, platform rules, or protocol rules.
          You may not attempt to abuse, overload, reverse engineer, exploit, or bypass access controls in NEMESIS or
          connected services.
        </p>

        <h2 className="text-nm-fg">8. Availability and changes</h2>
        <p>
          NEMESIS may change, suspend, or discontinue features at any time. Agents may be paused, templates may be
          changed, and integrations may be disabled if needed for security, reliability, provider changes, or product
          quality.
        </p>

        <h2 className="text-nm-fg">9. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by applicable law, NEMESIS and its contributors are not liable for trading
          losses, missed opportunities, failed transactions, wrong approvals, market movements, protocol failures,
          lost keys, wallet compromise, third-party outages, or any indirect, incidental, special, consequential, or
          punitive damages arising from your use of the platform.
        </p>
      </div>
    </div>
  );
}