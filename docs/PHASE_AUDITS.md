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

5. **Template Parameter Injection (Late Phase 1 Catch)**
   - `DeployChat.tsx` now dynamically renders input forms (sliders, checkboxes, text fields) directly mapping to the selected `AgentTemplate.parameters`.
   - The user-configured `pendingParams` are passed in the POST body to `/api/agents` and securely stored as JSON in Supabase, making the Runner fully dynamic.

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

## Phase 3: Base MCP Integration (Stateless AgentKit)
**Status:** ✅ COMPLETELY REALIZED & ONLINE
**Completed Date:** 25 June 2026

### Objectives
To integrate Coinbase AgentKit in a completely stateless manner, enabling agents to build Unsigned Transactions (Base MCP) without custodying user funds or generating server-side wallets.

### Implementation Details
1. **AgentKit Integration (`package.json`)**
   - Installed `@coinbase/agentkit` specifically in the `@nemesis/telegram-bot` workspace to isolate execution logic.

2. **Database Migration (`packages/db/src/client.ts`, `proposals.ts`)**
   - Executed a zero-downtime `ALTER TABLE` migration to add the `unsigned_tx_payload` (TEXT) column to the `proposals` table.
   - Updated TypeScript interfaces (`Proposal`, `CreateProposalInput`) to safely handle the new payload column.

3. **Stateless Transaction Builder (`apps/telegram-bot/src/runner.ts`)**
   - Modified the `dip-buyer` and `limit-order` logic to generate structured JSON payloads containing `to`, `data`, `value`, and `chainId`.
   - The payload formulation is dynamically linked to the agent's trigger state (e.g., configuring an ETH swap to Uniswap V3 Router).

4. **UI Handoff / Telegram Delivery (`apps/telegram-bot/src/handlers/approval.ts`)**
   - Overhauled the `bot.action(/^approve:(.+)$/)` callback.
   - When a user approves a proposal, the Telegram Bot now extracts the `unsignedTxPayload` from the database and renders it in a raw code block format, staging it for the Phase 4 WalletConnect Deep Link routing.

---

## Phase 4: Execution & Feedback Loop (Wagmi + Viem)
**Status:** ✅ COMPLETELY REALIZED & ONLINE
**Completed Date:** 26 June 2026

### Objectives
To close the Base MCP execution lifecycle by allowing users to physically sign the Agent-compiled transactions via the Web UI, and securely broadcasting the confirmation status back to the NEMESIS database.

### Implementation Details
1. **Frontend Execution Component (`apps/web/components/ExecuteProposalButton.tsx`)**
   - Built a React Client Component that parses the `unsignedTxPayload` from the database.
   - Integrates `useSendTransaction` from `wagmi` to prompt the user's connected wallet (e.g., MetaMask, Coinbase Wallet) to sign and execute the payload.
   - Integrates `useWaitForTransactionReceipt` to hold the UI state until the transaction is successfully mined.

2. **Server-Side Verification API (`apps/web/app/api/proposals/[id]/confirm/route.ts`)**
   - Built a secure feedback API that accepts the `txHash` from the frontend.
   - Uses `viem` `PublicClient` to independently poll the Base blockchain to verify the receipt.
   - **Quant-Grade Security:** Implemented an anti-spoofing guardrail that rejects the transaction if the `receipt.from` address does not strictly match the authenticated user's SIWE session address.
   - Upon successful verification, calls `approveProposal(id, txHash)` to permanently seal the database record.

3. **UI Integration (`ProposalRecordRow.tsx`)**
   - Injected the `ExecuteProposalButton` into the proposal history list, rendering the "Sign & Execute" flow solely for `pending` proposals.
   - Once executed, the UI automatically transitions to display the immutable `txHash`.

---

## Phase 5: Master Agent (LLM Intent Layer)
**Status:** ✅ COMPLETELY REALIZED & ONLINE
**Completed Date:** 26 June 2026

### Objectives
To replace the rudimentary keyword matcher with an intelligent, context-aware LLM (Claude/Hermes) that parses user intent and wallet balance to automatically configure Agent deployments.

### Implementation Details
1. **Zero-Mistake Schema (`apps/web/lib/intent-schema.ts`)**
   - Created a strict Zod schema enforcing exact `templateId` mapping and structured `parameters` extraction.
   - Deleted the obsolete `apps/web/lib/match-template.ts`.

2. **Master Agent API (`apps/web/app/api/intent/route.ts`)**
   - Built a secure SIWE-protected backend route for LLM inference.
   - Integrated `viem` to pull the user's live ETH balance from Base Mainnet and inject it into the System Prompt.
   - Integrated the Vercel AI SDK (`generateObject`) with `@openrouter/ai-sdk-provider` to guarantee that the LLM output mathematically adheres to our Zod Schema.

3. **DeployChat Auto-Fill (`apps/web/components/DeployChat.tsx`)**
   - Overhauled the UI component to post user prompts to `/api/intent`.
   - The UI now perfectly prepopulates the configuration form with the exact parameters extracted by the LLM (e.g., automatically filling `5` in the input box if the user typed "5% drop").

---

*This log must be updated immediately upon the completion of any subsequent Phase.*
