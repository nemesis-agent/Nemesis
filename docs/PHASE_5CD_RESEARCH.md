# Phase 5C & 5D: Multi-Template & Memory Research

**Date:** 26 June 2026
**Status:** VALIDATED FOR EXECUTION

## 1. Phase 5C: Multi-Template Plan
**Requirement:** The LLM must be able to propose multiple templates at once (e.g., "I want to buy dips and auto-compound").
**Vercel AI SDK Solution:**
- Wrap the Zod schema in a `z.array()`.
- The `generateObject` API fully supports `z.array(z.object({...}))`.
- By returning an array of plans, `DeployChat.tsx` can map over them and render multiple `DeploymentPlanCard` components.
- The user can individually approve or reject each plan card.

## 2. Phase 5D: Plan Memory
**Requirement:** The LLM must remember the context if the user declines or refines the prompt (e.g., "Actually, make the drop 10% instead").
**Vercel AI SDK Solution:**
- Instead of sending a single `{ prompt }` string to `/api/intent`, we will send the entire `{ messages: [] }` array from `DeployChat.tsx`.
- The Vercel AI SDK natively accepts a `messages` array representing the chat history (`role: 'user' | 'assistant'`).
- The LLM will read the history, understand what was previously proposed, and adjust its output accordingly.

## 3. Execution Plan
1. **Schema Update:** Modify `apps/web/lib/intent-schema.ts` to wrap the output in `{ reasoning: string, plans: Array<{ templateId, parameters }> }`.
2. **API Update:** Modify `apps/web/app/api/intent/route.ts` to accept `messages` instead of `prompt` and pass the history to `generateObject()`.
3. **UI Update:** Overhaul `DeployChat.tsx` to:
   - Send the `messages` state to the API.
   - Render multiple `DeploymentPlanCard` components.
   - Handle individual approvals/declines per card.

*Data is strictly validated against Vercel AI SDK OpenRouter documentation. Zero-mistake constraint applied.*
