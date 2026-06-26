# NEMESIS Legal, Privacy, And Terms Product Review

Status: completed for the current release.
Date: 2026-06-26
Reviewer role: NEMESIS internal product compliance review

## Scope

This review covers the current NEMESIS user-facing legal, privacy, and terms surfaces:

- Web Terms of Service: `apps/web/app/terms/page.tsx`
- Web Privacy Policy: `apps/web/app/privacy/page.tsx`
- Footer discoverability links for Terms and Privacy
- Product copy that could imply custody, auto-execution, guaranteed returns, or pending gated status
- README and implementation audit status

## Completed Checks

- Non-custodial language is explicit.
- No automatic execution language is explicit.
- User wallet remains the only signer.
- Proposals are described as review/approval-first.
- High-risk crypto, DeFi, new-token, liquidity, slippage, oracle/API, and smart-contract risks are disclosed.
- No financial, legal, tax, accounting, or investment advice language is explicit.
- Third-party service dependencies are disclosed, including WalletConnect, Telegram, OpenRouter/model providers, Supabase/Postgres, Railway, Base RPC infrastructure, price feeds, DexScreener, decentralized exchanges, and wallet software.
- Privacy document covers wallet address, SIWE session data, agent configuration, proposal records, transaction hashes, Telegram Chat ID, and runtime state.
- Privacy document explicitly says NEMESIS does not collect seed phrases, private keys, recovery phrases, exchange logins, payment card data, government IDs, or custodial credentials.
- LLM processing disclosure says prompts, recent conversation messages, and Base ETH balance may be sent to OpenRouter/model providers, while wallet address is not included in the LLM prompt.
- Retention language covers old skipped proposal pruning and Telegram unlink behavior.
- Security-controls language reflects SIWE, ownership checks, mutating-route origin checks, one-time Telegram link codes, and transaction confirmation verification.
- Terms and Privacy are linked from the footer for global user access.

## Status Decision

Legal/privacy/terms product review is complete for the current release.

This review is an internal product compliance review. It is not a representation that independent external legal counsel reviewed or approved NEMESIS.

## Operational Notes

- Continue keeping product copy aligned with the approval-first and non-custodial architecture.
- Do not market NEMESIS as guaranteed profit, managed trading, custody, or investment advice.
- Keep arbitrary protocol calldata paths review-only until dedicated encoders and end-to-end tests are complete.
