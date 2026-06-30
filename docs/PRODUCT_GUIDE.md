# NEMESIS Product Guide

NEMESIS turns wallet intent into approval-first agent proposals. The product is designed for users who want automated monitoring without handing custody, private keys, or final signing authority to a third party.

## Current Product State

NEMESIS is live for Base and Solana approval-first agents. Users can connect a wallet, deploy a single-condition template, link Telegram, review proposals in the dashboard or bot, and sign only from their own wallet.

Current product surfaces:

- public website and docs at `nemesis-agent.xyz`
- Base wallet connection through RainbowKit, Wagmi, SIWE, and WalletConnect-compatible wallets
- Solana wallet flow with Solflare-compatible connection support
- 12 production templates, including 10 Base templates and 2 Solana templates
- Talk with NEMESIS, powered by OpenRouter
- Telegram proposal delivery through `@NemesisAgentAppBot`
- public-safe health/status endpoints for operational visibility

## Dashboard

The dashboard shows the agents linked to the currently signed-in wallet session. Users can inspect active agents, proposal history, template details, wallet state, runner health, and Telegram linking status.

Primary dashboard actions:

- deploy a new agent
- inspect active agents
- view template details
- link or refresh Telegram code
- pause and resume agents
- review proposals before wallet signing

The dashboard is wallet-scoped. A connected wallet should only see its own agents and proposals.

## Wallets And Networks

NEMESIS supports Base and Solana product flows.

Base wallets connect through RainbowKit, Wagmi, SIWE, and WalletConnect-compatible wallets. Solana wallet flows include Solflare-compatible connections.

The security model stays the same across networks: NEMESIS can monitor conditions and prepare proposals, but the user's own wallet remains the final signer.

## Official Contract Address

Official NEMESIS contract address:

`HTXeyDoVbtJxEApA4oRMT1xLtCGoUQ5P962Cur6EASY`

Always verify this address from official NEMESIS channels before interacting with any token or contract. NEMESIS remains non-custodial and approval-first; your own wallet is still the final signer.

## Templates

Templates are narrow by design. Each template has one monitored condition and one proposed action. This keeps plans understandable, reviewable, and safer to operate.

Current templates:

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

High-risk and degen templates include risk acknowledgement gates before deploy.

## Template Detail Pages

Template detail pages are designed to explain a template before a user deploys it. Each page now shows:

- chain, risk level, and production/gated state
- single condition, single proposal, and wallet-signed approval model
- safety rails for no custody, no private keys, and no silent signing
- observed fields and approval checklist
- parameter defaults with units and server-side validation context
- a proposal preview that explains the review surface without claiming backtested performance
- a filled plan preview using the template's real default parameters

The preview is not a profit, APY, win-rate, or performance claim. It exists to make the approval flow easier to understand before deployment.

## Talk With NEMESIS

Talk with NEMESIS is powered by OpenRouter. It can answer general questions naturally and can explain NEMESIS architecture, templates, safety boundaries, Telegram linking, Base, Solana, and product usage.

It is intentionally protected. It should not expose private environment variables, secrets, database records, internal logs, unpublished operational details, or user-specific data.

## Telegram

Telegram is used for proposal delivery and command convenience. Users generate a short-lived link code from the dashboard. Open the Telegram bot from the dashboard, then send the code with `/link`.

Official bot: [@NemesisAgentAppBot](https://t.me/NemesisAgentAppBot)

Available commands:

- `/start`
- `/help`
- `/link <code>`
- `/unlink`
- `/agents`
- `/status [agent_id]`
- `/pause <agent_id>`
- `/resume <agent_id>`

Commands only operate on the wallet linked to that Telegram chat.

## Proposal Review

Every proposal should be reviewed before signing. Users should verify the network, token, amount, destination, fee, wallet preview, and current market context.

If a proposal looks wrong, stale, unexpected, or too risky, skip it.

Executable payload coverage is intentionally narrow. Base ETH/USDC limit, dip, profit-taking, and portfolio rebalance proposals can prepare wallet-signable payloads when parameters and balances are clear. Solana dip and profit proposals can prepare Jupiter transactions. Launch discovery, pool discovery, yield review, gas review, airdrop review, and launch-flipper exits stay review-only until dedicated encoders and checks are added for those exact workflows.

## Proposal Explainability

Every NEMESIS proposal is designed to answer four questions before a user signs anything:

- Why did the agent create this proposal?
- What public-safe values were observed?
- What should the user check before approving?
- What limitation still applies?

The dashboard separates decision trace details from technical inputs, and Telegram proposal messages include the same approval boundary. NEMESIS may prepare guarded payloads where available, but the user still reviews the wallet preview and signs from their own wallet only if the proposal matches their intent.

## Operational Status

NEMESIS exposes public-safe status checks at `/api/health` and `/api/status`. These endpoints are designed for operational visibility, not for exposing private configuration.

They report app version metadata, database latency, runner heartbeat age, Telegram polling lock state, and Base/Solana RPC probe status without returning API keys, bot tokens, raw database URLs, private user data, or full internal logs.

A `healthy` response means the database, runner, Telegram bot, and RPC probes are current. A `degraded` response means the app is still reachable, but one operational dependency needs attention, such as a stale runner heartbeat, an RPC probe failure, or Telegram polling lock transition during deploy.

## User Safety Rules

- NEMESIS never needs seed phrases or private keys.
- NEMESIS does not custody funds.
- NEMESIS does not promise profit.
- NEMESIS does not auto-execute wallet transactions.
- The user's wallet must approve the final transaction.