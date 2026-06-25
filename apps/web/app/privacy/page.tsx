import { FragmentDivider } from "@/components/FragmentDivider";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">Privacy Policy</h1>
      <div className="mt-8">
        <FragmentDivider />
      </div>
      <div className="prose prose-invert mt-12 text-sm leading-relaxed text-nm-muted">
        <p><strong>Last Updated: June 2026</strong></p>
        <p>
          At NEMESIS, we prioritize your privacy and aim to collect as little data as possible. This policy explains 
          what information we collect and how it is used.
        </p>

        <h2 className="text-nm-fg">1. Information We Collect</h2>
        <p>
          We collect your public EVM wallet address to associate it with your Agent configurations. We also collect 
          your Telegram Chat ID when you link your account, enabling our bot to send you trade proposals. We do not 
          collect personal identifiers like your name, email, or IP address.
        </p>

        <h2 className="text-nm-fg">2. How We Use Your Information</h2>
        <p>
          Your wallet address and Telegram Chat ID are used strictly for operational purposes: to save your Agent 
          logic in our database and to route transaction approvals to your personal Telegram device.
        </p>

        <h2 className="text-nm-fg">3. Third-Party Integrations</h2>
        <p>
          When you use the Master Agent chat interface, your natural language prompts and current wallet balances 
          are sent to our LLM provider (OpenRouter / Anthropic) to generate the appropriate strategy configuration. 
          We do not send your wallet address or any identifiable information in these prompts.
        </p>

        <h2 className="text-nm-fg">4. Data Retention</h2>
        <p>
          We automatically prune old and skipped transaction proposals from our database after 7 days to maintain 
          system performance and privacy. You can unlink your Telegram account at any time by sending `/unlink` to 
          the bot, which instantly deletes your Chat ID from our records.
        </p>
      </div>
    </div>
  );
}
