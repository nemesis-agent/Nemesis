# NEMESIS Product Guide

NEMESIS turns wallet intent into approval-first agent proposals. The product is
designed for users who want automated monitoring without handing custody or
final signing authority to a third party.

## Dashboard

The dashboard shows only the agents linked to the currently signed-in wallet
session. Users can inspect active agents, proposal history, template details,
wallet state, and Telegram linking status.

Primary dashboard actions:

- deploy a new agent
- inspect active agents
- view template details
- link or refresh Telegram code
- pause and resume agents
- review proposals before wallet signing

## Wallets And Networks

NEMESIS supports Base and Solana product flows.

Base wallets connect through RainbowKit, Wagmi, and WalletConnect-compatible
wallets. Solana wallet flows include Solflare-compatible connections.

The security model stays the same across networks: NEMESIS can monitor and
prepare proposals, but the user's own wallet remains the final signer.

## Official Contract Address

Official NEMESIS contract address:

`HTXeyDoVbtJxEApA4oRMT1xLtCGoUQ5P962Cur6EASY`

Always verify this address from official NEMESIS channels before interacting
with any token or contract. NEMESIS remains non-custodial and approval-first;
your own wallet is still the final signer.

## Templates

Templates are narrow by design. Each template has one monitored condition and
one proposed action. This keeps plans understandable, reviewable, and safer to
operate.

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

## Talk With NEMESIS

The public NEMESIS chat is powered by OpenRouter. It answers product,
architecture, security, and usage questions from public NEMESIS context.

It is intentionally restricted. It should not expose private environment
variables, secrets, database records, internal logs, unpublished operational
details, or user-specific data.

## Telegram

Telegram is used for proposal delivery and command convenience. Users generate a
short-lived link code from the dashboard. Open the Telegram bot from the dashboard, then send the
code with `/link`.

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

Every proposal should be reviewed before signing. Users should verify the
network, token, amount, destination, fee, wallet preview, and current market
context.

If a proposal looks wrong, stale, unexpected, or too risky, skip it.

Executable payload coverage is intentionally narrow. Base ETH/USDC limit, dip, profit-taking, and portfolio rebalance proposals can prepare wallet-signable payloads when parameters and balances are clear. Solana dip and profit proposals can prepare Jupiter transactions. Launch discovery, pool discovery, yield review, gas review, airdrop review, and launch-flipper exits stay review-only until dedicated encoders and checks are added for those exact workflows.

## User Safety Rules

- NEMESIS never needs seed phrases or private keys.
- NEMESIS does not custody funds.
- NEMESIS does not guarantee profit.
- NEMESIS does not auto-execute wallet transactions.
- The user's wallet must approve the final transaction.
