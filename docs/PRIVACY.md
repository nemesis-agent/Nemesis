# Privacy Notes

NEMESIS collects the minimum operational data needed to run wallet-scoped agents.

## Data Used

- Wallet address for session ownership and agent scoping.
- Agent configuration and runtime state.
- Proposal records and transaction hashes submitted for confirmation.
- Telegram chat ID when a user links Telegram.
- Prompt messages submitted to the Master Agent intent endpoint.

## Data Not Requested

NEMESIS does not ask for seed phrases, private keys, recovery phrases, payment cards, government IDs, or custodial exchange logins.

## Third-Party Services

The product depends on wallet providers, WalletConnect/Reown, Telegram, model providers, RPC providers, price feeds, and deployment/database infrastructure. Those providers may process data under their own policies.

## User Controls

Users can disconnect wallets in their wallet UI, unlink Telegram with `/unlink`, pause/resume agents, skip proposals, and stop using the product at any time.