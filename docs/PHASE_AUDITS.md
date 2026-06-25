# NEMESIS - Implementation & Audit Log

This log reflects the current code after the launch-readiness audit. Earlier phase notes that claimed full Base MCP execution are superseded by this file.

## Phase 1 - Security And Agent Deployment

Status: implemented and hardened.

- SIWE nonce/verify/me routes are present.
- Sessions use iron-session with a mandatory strong production `SESSION_SECRET`.
- Agent deployment writes to Postgres through `@nemesis/db`.
- Link-code generation uses the authenticated session wallet.
- Pause/resume routes enforce wallet ownership.
- Mutating routes reject cross-origin requests when an `Origin` header is present.
- Agent parameters are validated against template definitions before storage.

## Phase 2 - Runner And Proposal Dispatch

Status: partially production-ready.

- The bot process starts a runner loop.
- The runner reads active agents and evaluates initial `dip-buyer` and `limit-order` style price conditions.
- The runner creates proposals and sends them to the linked Telegram chat.
- Duplicate pending proposals are suppressed per agent.

Limit: condition logic is still MVP-grade and must be expanded before supporting every template.

## Phase 3 - Base MCP / AgentKit Execution

Status: intentionally gated.

- `unsigned_tx_payload` exists in the proposals table and UI/API support payload verification.
- Fake placeholder payload generation has been removed.
- The runner does not attach executable calldata until a real Base MCP/AgentKit encoder is wired.

Requirement before enabling: build verified calldata via a proper adapter, then test end-to-end on Base with exact payload matching.

## Phase 4 - Wallet Signing Feedback Loop

Status: verifier implemented, dependent on real payloads.

- `ExecuteProposalButton` validates payload shape before prompting wallet signing.
- `/api/proposals/[id]/confirm` verifies proposal ownership, transaction success, signer, chain, destination, value, and calldata.
- Database approval with `txHash` is guarded against duplicate/race updates.

## Phase 5 - Master Agent Intent Layer

Status: implemented with provider dependency.

- `apps/web/lib/intent-schema.ts` enforces structured template plans.
- `/api/intent` is SIWE-protected and validates message shape/length.
- The route reads Base ETH balance and calls OpenRouter structured output using `xiaomi/mimo-v2.5` by default.
- Missing `OPENROUTER_API_KEY` returns 503 instead of using a dummy key.

## Phase 6 - Ops And Identity

Status: configured, still needs real production variables.

- Railway starts `npm start` via `railway.toml`.
- PM2 process names are `nemesis-web` and `nemesis-bot`.
- WalletConnect identity is `appName: "NEMESIS"`.
- Web metadata and assets use NEMESIS identity.
- `/api/health` checks Postgres connectivity.

## Current Launch Blockers

- Real Base MCP/AgentKit calldata encoder.
- Production env variables under the NEMESIS project identity.
- Legal review.
- Real device and cross-browser smoke tests.
