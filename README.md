# NEMESIS

![NEMESIS](./assets/nemesis-banner.png)

NEMESIS is an approval-first agent platform for Base and Solana wallets. Connect a wallet, describe intent, review a plain-language plan, deploy a single-condition agent, and receive proposals in the dashboard or Telegram.

Agents monitor. Users approve. Your wallet remains the final signer.

## Live Product

- App: [nemesis-agent.xyz](https://nemesis-agent.xyz)
- Telegram: [@NemesisAgentAppBot](https://t.me/NemesisAgentAppBot)
- X: [@Nemesis_agent](https://x.com/Nemesis_agent)
- GitHub: [nemesis-agent/Nemesis](https://github.com/nemesis-agent/Nemesis)

## What NEMESIS Does

- Deploy approval-first monitoring agents for Base and Solana wallets.
- Turn natural-language intent into template-backed agent plans.
- Deliver proposals through the web dashboard and Telegram.
- Keep every template narrow: one monitored condition, one proposed action.
- Require user review before any transaction leaves the wallet.
- Support Base wallets through RainbowKit, Wagmi, SIWE, and WalletConnect-compatible flows.
- Support Solana wallet flows including Solflare-compatible connections.
- Use OpenRouter-powered intelligence for planning and Talk with NEMESIS.
- Show template detail pages with safety rails, explainability, parameter defaults, and proposal preview before deploy.
- Separate review-only proposals from wallet-signable payloads with expiry, network, step, and approval guidance.
- Expose public-safe health summaries for database, runner, Telegram, Base RPC, and Solana RPC status.

## Why It Exists

Crypto automation often asks users to trust too much. NEMESIS keeps the automation layer separate from custody and signing. The system can watch, prepare, and notify, but the user's own wallet must approve the final action.

That model keeps the product useful without turning agents into unchecked executors.

## User Flow

1. Connect a Base or Solana wallet.
2. Sign in to create a wallet-scoped session.
3. Pick a template or describe intent to NEMESIS.
4. Review the template detail page, filled approval summary, and parameters.
5. Deploy the agent after any required risk acknowledgement.
6. Link Telegram for proposal alerts.
7. Review, approve, skip, pause, or resume as proposals arrive.

## Template Coverage

NEMESIS ships with 12 production templates:

- Ape agent
- Pool sniper
- Launch flipper
- Limit order agent
- Dip buyer
- Profit taker
- Auto compound
- Gas optimizer
- Airdrop farmer
- Portfolio rebalancer
- Solana dip buyer
- Solana profit taker

High-risk and degen templates require explicit acknowledgement before deploy.

### Wallet-signable coverage

NEMESIS prepares signing payloads only where dedicated encoders and validators exist:

- Base wallet-signable: Dip buyer, Limit order agent, Profit taker, Portfolio rebalancer.
- Solana wallet-signable: Solana dip buyer, Solana profit taker.
- Review-only: Ape agent, Pool sniper, Launch flipper, Auto compound, Gas optimizer, Airdrop farmer.

Review-only does not mean disabled. It means NEMESIS explains the proposal and keeps the final action manual until an exact encoder and confirmation policy exist for that workflow.

## Security Model

- Non-custodial: NEMESIS never asks for seed phrases or private keys.
- Approval-first: agents create proposals, not forced transactions.
- Wallet-scoped: dashboard, Telegram, agents, and proposals are scoped to the authenticated or linked wallet.
- Parameterized: templates use structured parameters and plain-language summaries before deployment.
- Guarded: proposal confirmation validates ownership and submitted transaction details where executable payloads are available.
- Execution-expanded: selected Base ETH/USDC and Solana Jupiter proposals can prepare wallet-signable payloads while unsupported templates remain review-only.
- Privacy-minimized: operational data is used only to run sessions, agents, Telegram linking, proposals, product support flows, and health checks.
- Privacy-polished: wallet labels, logs, model context, link codes, mutation responses, and health surfaces are minimized or redacted where practical.

## Stack

- Web: Next.js App Router, React, RainbowKit, Wagmi, SIWE, iron-session.
- Bot: Telegraf.
- Database: Supabase/Postgres through `@nemesis/db`.
- Templates: `@nemesis/templates`.
- Intelligence: OpenRouter.
- Deploy: Railway monolith with PM2 processes for web and bot.
- Reliability: runner heartbeat, health endpoint, dashboard status, Telegram polling lock visibility, and Base RPC fallback support.

## Documentation

- [Product Guide](./docs/PRODUCT_GUIDE.md)
- [Security Model](./docs/SECURITY.md)
- [Privacy Notes](./docs/PRIVACY.md)
- [Token Safety](./docs/TOKEN_SAFETY.md)

## Proposal Lifecycle

A pending proposal can be either wallet-signable or review-only. Wallet-signable proposals are generated only for workflows with dedicated encoders and validation. They show the target network, signing step, expiry window, and approval summary before the wallet opens. Review-only proposals remain visible for manual inspection and do not trigger a wallet signing request.

Expired executable payloads should be regenerated. NEMESIS does not ask users to sign stale route data.

## Troubleshooting

- Telegram not linked: generate a fresh dashboard code, open [@NemesisAgentAppBot](https://t.me/NemesisAgentAppBot), and send the full `/link` command before the code expires.
- Pending proposal already exists: review, approve, or skip the existing pending proposal before waiting for the next cycle.
- No wallet button: the template is review-only until a dedicated encoder is shipped for that workflow.
- Health degraded: check `/api/health` for public-safe database, runner, Telegram, Base RPC, and Solana RPC status.

## Release Status

NEMESIS is live in production for approval-first Base and Solana wallet automation. The current release is focused on template-backed agents, explainable proposal review, Telegram proposal alerts, wallet-scoped privacy, public docs, and guarded execution handoff where dedicated payload encoders exist.
