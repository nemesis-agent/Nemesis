# NEMESIS Security Model

NEMESIS is built around a non-custodial, approval-first security model. Agents
monitor conditions and prepare proposals; users keep custody and final signing
authority in their own wallets.

## Non-Custodial By Design

NEMESIS does not store seed phrases, private keys, recovery phrases, custodial
exchange credentials, or wallet-export material.

Wallet signatures happen in the user's own wallet.

## Approval-First Execution

Agents do not silently move funds. They monitor, evaluate, and create proposals.
A proposal can only move forward after the user reviews the wallet action and
signs from their own wallet.

## Ownership Boundaries

Dashboard data, Telegram commands, agent detail pages, pause/resume actions,
proposal review, and proposal confirmation are scoped to the authenticated or
linked wallet.

This prevents one wallet or Telegram chat from controlling another wallet's
agents.

## Link-Code Safety

Telegram linking uses short-lived, single-use codes generated for the signed-in
wallet session. Codes are consumed atomically so a code cannot be reused after a
successful link.

## Cross-Origin Controls

Mutating web routes reject unexpected cross-origin requests when an `Origin`
header is present. This reduces accidental or malicious cross-site mutation
paths.

## Proposal confirmations

Where executable payloads are prepared, confirmation endpoints compare the
submitted transaction against stored proposal data before marking a proposal
approved.

Validation includes ownership and transaction-shape checks such as signer,
network, target, value, and calldata where applicable.

## Template Controls

Templates are intentionally constrained:

- one condition
- one proposed action
- structured parameters
- plain-language approval summary
- risk acknowledgement for high-risk and degen templates

## Wallet/User Privacy Controls

Wallet-private surfaces remain wallet-scoped server-side. Client-facing dashboard cards receive masked wallet labels rather than full wallet rows, and mutation responses avoid returning full database records when the UI only needs identifiers.

OpenRouter planning receives redacted user messages and coarse balance ranges instead of exact wallet balances. Operational logs and alert webhooks use redaction helpers for wallet addresses, transaction hashes, Telegram token patterns, API-key-like strings, and Telegram chat identifiers.

## Operational Reliability

The runner writes heartbeat data to `runtime_health` without storing secrets. The web health endpoint and wallet dashboard expose only coarse service state, last heartbeat age, and cycle metadata.

Base RPC reads support primary and fallback endpoints. Endpoint logs are host-redacted, and transient HTTP 429/5xx or network failures can fail over before an agent evaluation is marked failed.

## AI Safety Boundary

OpenRouter-powered product and planning flows are restricted to product context
and structured outputs. They must not expose secrets, environment variables,
private logs, user records, or developer-only operational data.

If required model credentials are missing, protected model routes fail closed
rather than silently using mock production behavior.

## User Responsibility

Users should reject any proposal that does not match the wallet preview,
expected network, expected token, expected amount, destination, fee, or current
market context.

NEMESIS is a proposal system, not a profit guarantee.
