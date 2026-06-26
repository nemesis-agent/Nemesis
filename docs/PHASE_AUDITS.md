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

Status: implemented for all v1 templates.

- The bot process starts a runner loop.
- The runner reads active agents and creates proposals only from production evaluator paths.
- All 10 v1 templates are production-enabled.
- New-token, new-pool, yield-review, and protocol-interaction templates are review-only where arbitrary calldata is not yet safe to generate.
- The runner no longer creates mock trading proposals from hardcoded price logic.

## Phase 3 - Base Execution

Status: partially implemented with strict payload boundaries.

- `unsigned_tx_payload` exists in the proposals table and UI/API support payload verification.
- Fake placeholder payload generation has been removed.
- Verified Base ETH/USDC swap payloads are available for supported ETH/USDC proposal paths.
- Arbitrary new-token, pool, yield, and protocol-action calldata remains review-only until a dedicated encoder is wired and tested.

## Phase 4 - Wallet Signing Feedback Loop

Status: implemented for stored payloads.

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

Status: configured and deployed.

- Railway starts `npm start` via `railway.toml`.
- PM2 process names are `nemesis-web` and `nemesis-bot`.
- WalletConnect identity is `appName: "NEMESIS"`.
- Web metadata and assets use NEMESIS identity.
- `/api/health` checks Postgres connectivity.
- Railway production deploy is online at `https://nemesis-agent.xyz`.

## Legal, Privacy, And Terms Review

Status: completed as an internal product compliance review for the current release.

- Terms document covers non-custody, no auto execution, user responsibility, market/protocol risk, no advice, third-party services, prohibited use, availability, limitation of liability, and review status.
- Privacy document covers wallet/session data, Telegram Chat ID, agent/proposal/runtime data, LLM processing through OpenRouter/model providers, third-party services, retention, security controls, and user choices.
- This repository does not claim external legal counsel approval.

## Current Launch Notes

- Arbitrary protocol calldata generation remains review-only until dedicated encoders are wired and tested.
- Real device and cross-browser smoke tests remain recommended before broader user rollout.

## P1 Operations Hardening

Status: implemented for the current release.

- Sensitive API routes have in-process rate limits for nonce, SIWE verify, Master Agent intent, agent creation, Telegram link-code generation, pause/resume, and proposal confirmation.
- Telegram bot and runner emit structured logs plus optional `NEMESIS_ALERT_WEBHOOK_URL` alerts for polling conflicts, lock waits, lock wait timeouts, runner errors, evaluation failures, prune failures, and proposal dispatch failures.
- Production smoke script `npm run smoke:prod` checks health, public pages, protected API rejection, nonce generation, static route rate-limit coverage, and review-only calldata boundaries.
- `docs/OPS_RUNBOOK.md` documents deploy verification, mobile/cross-browser smoke checklists, rollback, secret rotation, rate limits, alerts, and calldata boundaries.
