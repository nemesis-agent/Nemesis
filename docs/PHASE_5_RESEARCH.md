# Phase 5: Master Agent (LLM Intent Layer) Research & Audit

**Date:** 26 June 2026
**Status:** APPROVED FOR AUDIT (AWAITING EXECUTION)
**Target:** Replace naive `matchTemplate.ts` with an intelligent, context-aware LLM.

---

## 1. Executive Summary

Phase 5 introduces the "Master Agent". Currently, when a user types "buy ETH when it drops 10%", `DeployChat.tsx` relies on a highly rudimentary string-matching algorithm (`matchTemplate.ts`) that only selects a template and completely ignores parameter extraction. 

The Master Agent will leverage a Quant-Grade LLM (Hermes 3 or Claude 3.5 Sonnet) to perform **Structured Intent Parsing**. It will parse the prompt, inject the user's live on-chain balances, select the mathematically optimal template, and prepopulate the deployment parameters.

---

## 2. Code Audit (Affected Scripts)

### A. `apps/web/components/DeployChat.tsx`
- **Current State:** Triggers `matchTemplate(trimmed)` synchronously. Simulates reasoning with `window.setTimeout(..., 900)`. Parameters are hardcoded to their `defaults`.
- **Phase 5 Edit:** Remove `matchTemplate` and `setTimeout`. Replace with a `fetch("/api/intent", { method: "POST" })` call. Update `pendingParams` with the LLM's dynamically extracted parameters, not just the defaults.

### B. `apps/web/lib/match-template.ts`
- **Current State:** Naive word counter.
- **Phase 5 Edit:** DEPRECATE and DELETE this file. It is no longer needed in the Quant-Grade architecture.

### C. `apps/web/app/api/intent/route.ts` (NEW FILE)
- **Phase 5 Edit:** Create a secure backend route.
  1. Authenticate via SIWE (prevent abuse of the LLM API).
  2. Fetch the user's wallet balances (ETH/USDC) using `viem` on Base Mainnet to provide contextual liquidity awareness.
  3. Formulate a System Prompt containing the JSON schema of `packages/templates/src/index.ts`.
  4. Call the LLM (OpenAI API format for OpenRouter/Hermes).
  5. Enforce structured JSON output (`response_format: { type: "json_object" }`).
  6. Return `{ templateId, parameters }` to the frontend.

---

## 3. Data Schema: Vercel AI SDK + Zod (Zero-Mistake Architecture)

To guarantee 0 execution errors, we cannot rely on standard text completion. We must use the **Vercel AI SDK** with the official `@openrouter/ai-sdk-provider` and `zod`.

By calling `generateObject()`, the SDK forces the OpenRouter LLM to conform to a strict schema. If the LLM hallucinates a parameter, the SDK throws a structured error, preventing bad data from hitting the `DeployChat` UI.

**Required Zod Schema (`apps/web/lib/intent-schema.ts`):**
```typescript
import { z } from "zod";

export const intentSchema = z.object({
  reasoning: z.string().describe("Explanation of why this template and these parameters were chosen based on the user's prompt and wallet balance."),
  templateId: z.enum(["dip-buyer", "limit-order", "auto-compound", "portfolio-rebalancer", "momentum-chaser", "yield-farmer", "wallet-copy-trade", "pump-fun-sniper", "delta-neutral-basis", "rug-pull-protector"]),
  parameters: z.record(z.union([z.string(), z.number(), z.boolean()])).describe("The exact parameters required by the chosen template, intelligently extracted from the prompt. For example, if target drop is 5%, value should be 5.")
});
```
```

---

## 4. Implementation Steps for Next Approval
1. Install `ai`, `@openrouter/ai-sdk-provider`, and `zod` in `@nemesis/web`.
2. Add `OPENROUTER_API_KEY` to the `.env`.
3. Delete `match-template.ts`.
4. Create the `/api/intent` endpoint with `viem` balance checking and `generateObject()`.
5. Wire `DeployChat.tsx` to handle the asynchronous API call and prepopulate the parameters.

*This document validates the Master Agent infrastructure using Vercel AI SDK and Zod. Waiting for user GO signal.*
