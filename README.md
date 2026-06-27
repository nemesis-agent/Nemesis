# NEMESIS

![NEMESIS](./assets/nemesis-banner.png)

NEMESIS is an approval-first agent platform for Base and Solana wallets. Connect your wallet, describe an intent, review a plain-language plan, deploy a single-condition agent, and receive proposals in the dashboard and Telegram.

NEMESIS never custodies funds and never auto-executes transactions. Agents can prepare proposals; your own wallet is always the final signer.

## What You Can Do

- Deploy Base and Solana monitoring agents from production-ready templates.
- Connect Base wallets through RainbowKit/WalletConnect.
- Connect Solana wallets through Solflare-compatible wallet flows.
- Link Telegram to receive proposal alerts.
- Review every proposal before signing anything.
- Pause or resume agents from the dashboard or Telegram.

## Live Product

- App: [nemesis-agent.xyz](https://nemesis-agent.xyz)
- X: [@Nemesis_agent](https://x.com/Nemesis_agent)
- GitHub: [nemesis-agent/Nemesis](https://github.com/nemesis-agent/Nemesis)

## Core Principles

- Non-custodial: NEMESIS never asks for seed phrases or private keys.
- Approval-first: no wallet action happens without explicit user review and signature.
- One condition, one action: templates stay narrow and auditable.
- Risk-aware: high-risk and degen templates require acknowledgement before deployment.
- Privacy-minimized: operational data is used only to run agents, sessions, Telegram links, and proposals.

## User Flow

1. Connect a Base or Solana wallet.
2. Sign in to create a wallet-scoped session.
3. Pick a template or describe an intent to the Master Agent.
4. Review the filled approval summary and parameters.
5. Deploy the agent.
6. Link Telegram if you want alerts outside the dashboard.
7. Review, approve, or skip proposals as they arrive.

## Documentation

- [Product Guide](./docs/PRODUCT_GUIDE.md)
- [Security Model](./docs/SECURITY.md)
- [Privacy Notes](./docs/PRIVACY.md)

## Status

NEMESIS is live in production with Base and Solana template support. The current release is focused on approval-first wallet automation, Telegram proposal alerts, and guarded proposal review.
