import { FragmentDivider } from "@/components/FragmentDivider";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">Terms of Service</h1>
      <div className="mt-8">
        <FragmentDivider />
      </div>
      <div className="prose prose-invert mt-12 text-sm leading-relaxed text-nm-muted">
        <p><strong>Last Updated: June 2026</strong></p>
        <p>
          Welcome to NEMESIS. By accessing or using our platform, you agree to comply with and be bound by these
          Terms of Service. Please read them carefully.
        </p>

        <h2 className="text-nm-fg">1. Nature of the Service</h2>
        <p>
          NEMESIS is a non-custodial interface built on the Base network. We provide tools for users to configure
          autonomous trading logic (&quot;Agents&quot;). We do not hold, custody, or manage your funds. All transactions
          are signed and broadcast from your personal wallet only after your explicit cryptographic approval.
        </p>

        <h2 className="text-nm-fg">2. Assumption of Risk</h2>
        <p>
          Cryptocurrency markets are highly volatile. By using NEMESIS, you acknowledge that you are fully responsible
          for your own trading decisions. NEMESIS makes no guarantees regarding the performance of any Agent or
          strategy. You agree that NEMESIS, its developers, and affiliates are not liable for any financial losses,
          impermanent loss, slippage, or smart contract exploits that may occur while using the platform.
        </p>

        <h2 className="text-nm-fg">3. Non-Custodial Agreement</h2>
        <p>
          At no point does NEMESIS have the authority to move funds from your wallet without your explicit approval.
          You are responsible for securing your own private keys and evaluating the Base MCP payloads sent to you via
          Telegram before signing them.
        </p>

        <h2 className="text-nm-fg">4. Modifications to the Service</h2>
        <p>
          We reserve the right to modify or discontinue, temporarily or permanently, the platform (or any part thereof)
          with or without notice. We shall not be liable to you or to any third party for any modification, suspension
          or discontinuance of the service.
        </p>
      </div>
    </div>
  );
}
