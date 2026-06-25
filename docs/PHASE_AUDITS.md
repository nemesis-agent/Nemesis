# NEMESIS — Implementation & Audit Logs

This document serves as a permanent architectural and implementation audit log for completed phases. It acts as the source of truth for how requirements in the roadmap were realized in the codebase.

---

## Phase 1: Security & Agent Deployment
**Status:** ✅ COMPLETELY REALIZED & ONLINE
**Completed Date:** 25 June 2026

### Objectives
To secure the platform using Sign-In With Ethereum (SIWE) and wire the conversational `DeployChat` UI directly to the database via authenticated, ownership-guarded API routes.

### Implementation Details
1. **SIWE & Iron-Session Core (`apps/web/lib/session.ts`, `auth.ts`)**
   - Implemented `iron-session` with encrypted HTTP-only cookies (`nemesis_session`).
   - Created `SESSION_SECRET` fallback with mandatory production override via Railway environment variables.
   - Built the `requireAuth()` utility which cleanly returns a 401 Unauthorized Response if the session is empty, preventing deep-nested auth checks.

2. **Authentication API Routes (`/api/auth/*`)**
   - `GET /api/auth/nonce`: Generates and stores a unique, single-use `siwe` nonce in the session.
   - `POST /api/auth/verify`: Verifies the EIP-4361 signature using the `siwe` package and `ethers`. On success, destroys the nonce to prevent replay attacks and stamps the `wallet_address` into the encrypted session.
   - `GET /api/auth/me` & `DELETE /api/auth/me`: Handles session state checking and sign-out logic.

3. **Secure Agent Deployment (`/api/agents/route.ts`)**
   - Refactored `DeployChat.tsx` to stop using simulated `setTimeout` delays.
   - The "Approve & deploy" button now sends a `POST` request to `/api/agents`.
   - The API verifies the SIWE session and executes a real `createAgent()` insertion into the Supabase Postgres database.
   - Automatically revalidates the `/dashboard` path and redirects the user.

4. **Resource Ownership Verification**
   - Hardened `POST /api/agents/[id]/pause` and `POST /api/agents/[id]/resume`.
   - Both routes now strictly verify that the authenticated `session.address` matches the `agent.walletAddress` retrieved from the database (403 Forbidden otherwise).
   - `POST /api/link/generate` now reads the wallet address from the authenticated session, preventing actors from linking chats to wallets they don't own.

---

## Phase 2: Sub-Agent Runner
**Status:** ✅ COMPLETELY REALIZED & ONLINE
**Completed Date:** 25 June 2026

### Objectives
To build the background process that reads active agents, evaluates market conditions in real-time, and dispatches actionable proposals to Telegram.

### Implementation Details
1. **Background Runner Loop (`apps/telegram-bot/src/runner.ts`)**
   - Created a standalone runner loop hosted inside the Telegram Bot process for easy access to the `Telegraf` messaging context.
   - Implemented a standard `setInterval` loop (60 seconds) that polls `listAgents()` from Supabase and filters for `status === "active"`.

2. **Oracle Integration (`apps/telegram-bot/src/lib/price-feed.ts`)**
   - Integrated the **Pyth Network Hermes REST API** for live asset pricing.
   - Built a type-safe `getLivePrice(ticker)` function that parses Pyth's custom exponential pricing format (e.g., `price * 10^expo`).
   - Verified via `test-pyth.mjs` against live mainnet data.

3. **Condition Evaluation Engine**
   - Implemented hardcoded evaluation logic for MVP templates (`dip-buyer` and `limit-order`).
   - Prices are fetched once per cycle and cached in memory to reduce API rate-limiting.
   - `dip-buyer`: Compares `currentPrice` against a baseline utilizing the user's `targetDrop` percentage parameter.
   - `limit-order`: Compares `currentPrice` against the user's `limitPrice` parameter.

4. **Dispatch Pipeline**
   - When a condition is met, the runner calls `createProposal()` strictly matching the `CreateProposalInput` schema.
   - Uses `getTelegramChatIdForWallet()` to find the correct Telegram destination.
   - Calls the pre-existing `sendProposal(bot, chatId, proposal, agentName)` to deliver the interactive UI to the user's Telegram.

---

*This log must be updated immediately upon the completion of any subsequent Phase.*
