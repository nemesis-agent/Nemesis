# Phase 4/5: Transaction Feedback Loop Research Blueprint

**Date:** 26 June 2026
**Status:** VALIDATED
**Source:** Wagmi & Viem Official Documentation

---

## 1. Executive Summary

In the stateless AgentKit architecture implemented in Phase 3, the NEMESIS backend delegates transaction signing and broadcasting to the user's personal wallet (via WalletConnect / Telegram deep links). 

Because the server does not execute the transaction, it cannot immediately know the `tx_hash`. To fulfill the final step of the execution lifecycle (updating `proposals.tx_hash` and `status = 'approved'`), we must implement a **Transaction Feedback Loop**.

---

## 2. The Feedback Loop Pattern (Wagmi + Viem)

According to official React (Wagmi) and Node.js (Viem) patterns, the process is split into two halves: The Client-Side Hook and the Server-Side Verification.

### A. Client-Side (Next.js Dashboard)
When the user connects their wallet to review pending proposals, the frontend will use Wagmi's `useSendTransaction` to broadcast the payload.
1. The user clicks "Sign & Send".
2. Wagmi returns the preliminary `tx_hash` the moment it hits the mempool.
3. The frontend immediately pushes this `tx_hash` to our backend API.

### B. Server-Side (Next.js API & Database)
The backend must NOT trust the frontend blindly. When the API receives the `tx_hash`, it must use `viem` (PublicClient) to watch the blockchain.
1. `POST /api/proposals/:id/confirm` receives the `tx_hash`.
2. The server uses `publicClient.waitForTransactionReceipt({ hash })`.
3. If the receipt returns `status: "success"`, the database executes `approveProposal(id, txHash)`.
4. If it reverts, the proposal is marked as `failed` or left pending.

---

## 3. Required API Architecture

To securely close the loop, we must create a new API route in `@nemesis/web`:

**Endpoint:** `POST /api/proposals/:id/confirm`
**Auth:** SIWE Session Required (must match the wallet of the agent owner).
**Payload:**
```json
{
  "txHash": "0x123abc..."
}
```

**Security Guardrails (Quant-Grade Integrity):**
- **Spoofing Prevention:** The backend must cross-reference the `from` address in the transaction receipt with the user's SIWE session address.
- **Reorg Protection:** We will configure Viem to require `confirmations: 2` (waiting for 2 blocks on Base) before marking the proposal as permanently approved.

---

## 4. Implementation Steps (Next Actions for Execution Layer)

1. **Install Viem:** Add `viem` to `@nemesis/web` and `@nemesis/telegram-bot`.
2. **API Endpoint Creation:** Build `/api/proposals/[id]/confirm/route.ts` with SIWE validation and Viem receipt polling.
3. **Frontend Integration:** Build the "Pending Proposals" UI in the dashboard using Wagmi's `useSendTransaction`.

*This research validates the safe, non-custodial completion of the Base MCP transaction lifecycle.*
