# NEMESIS Privacy Notes

NEMESIS collects the minimum operational data needed to run wallet-scoped
agents, sessions, Telegram linking, and proposal delivery.

## Data Used

- Wallet address for session ownership and agent scoping.
- Agent configuration and runtime state.
- Proposal records and submitted transaction hashes.
- Telegram chat ID when a user links Telegram.
- Prompt messages submitted to NEMESIS product or planning flows.
- Basic operational logs needed to monitor service health.

## Data Not Requested

NEMESIS does not ask for:

- seed phrases
- private keys
- recovery phrases
- payment cards
- government IDs
- custodial exchange logins
- wallet export files

Any request for those items should be treated as suspicious.

## Telegram Linking

Telegram is optional. When linked, the Telegram chat ID is associated with the
user's wallet address so NEMESIS can deliver proposals and respond to scoped bot
commands.

Users can unlink Telegram with `/unlink`.

## AI And Prompt Data

NEMESIS uses OpenRouter-powered flows for product Q&A and intent planning. These
flows are designed to answer from product context and structured user intent,
not from private database dumps or secret runtime configuration.

Users should avoid entering seed phrases, private keys, or unrelated sensitive
personal information into any chat or intent field.

## Minimization And Retention

NEMESIS minimizes user data sent across surfaces:

- Dashboard cards use masked wallet labels and avoid serializing agent parameters or runtime state unless needed for the view.
- Agent creation responses return only the created agent ID and name.
- Intent planning sends a coarse Base balance range to OpenRouter instead of an exact wallet balance.
- Operational logs and alerts redact wallet addresses, transaction hashes, Telegram tokens, API-key-like strings, and Telegram chat identifiers where practical.
- Used Telegram link codes and stale expired link codes are pruned by the runner retention cycle.

## Third-Party Services

The product depends on wallet providers, WalletConnect/Reown, Telegram,
OpenRouter, RPC providers, price feeds, deployment infrastructure, and database
infrastructure. Those providers may process data under their own policies.

## User Controls

Users can:

- disconnect wallets in their wallet UI
- unlink Telegram with `/unlink`
- pause or resume agents
- skip proposals
- stop using the product at any time

NEMESIS keeps the operational scope narrow so users do not need to surrender
custody or private wallet material.
