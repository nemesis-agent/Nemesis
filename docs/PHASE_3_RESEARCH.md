# Phase 3: Base MCP (Coinbase AgentKit) Research & Integration Blueprint

**Date:** 25 June 2026
**Status:** VALIDATED
**Source:** Official Coinbase Developer Platform (CDP) Documentation

---

## 1. Executive Summary

Coinbase AgentKit is a toolkit designed by the Coinbase Developer Platform (CDP) to bridge AI agents with onchain functionality securely. For NEMESIS Phase 3, this framework will serve as the engine that allows our autonomous agents to hold "operational" non-custodial wallets and construct transactions on the Base L2 network.

**Alignment with NEMESIS Constraints:**
- AgentKit supports **CDP Non-Custodial Wallets**, which can be managed programmatically via API without holding user funds directly (satisfying **RULE #1**).
- AgentKit functions can be invoked to build unsigned transactions (or simulate them), allowing the final signature to be delegated back to the user via Telegram/WalletConnect (satisfying **RULE #2: Approval-First**).

---

## 2. Technical Architecture & Packages

To implement AgentKit at a Quant Grade level, the following official packages must be integrated:

### Core SDKs
```json
{
  "dependencies": {
    "@coinbase/agentkit": "latest"
  }
}
```

### The Transaction Split Architecture (Crucial Finding)
In a second, deeper research pass into AgentKit's modular architecture, a massive architectural win was discovered: AgentKit separates transaction **construction** from transaction **execution**. 
- **ActionProviders:** Construct the raw, unsigned transaction data (e.g., `to`, `data`, `value`).
- **WalletProviders:** Take that data, sign it, and broadcast it.

**Impact on NEMESIS:**
Because NEMESIS enforces a strict "Approval-First" rule (Rule #2) where the user signs the final transaction, **we do not need to provision or pay for CDP Wallets for the agents.** 
The agent will act purely as a "Transaction Compiler". It will use `ActionProviders` to generate the unsigned transaction payload, and we will forward that payload to the user's personal wallet via a WalletConnect deep link.

### Action Providers (Phase 4B)
AgentKit uses an extensible architecture called **Action Providers**.
- `erc20ActionProvider`: For token approvals/swaps.
- `customActionProvider`: For specific DeFi interactions (e.g., Uniswap routers for the `dip-buyer` template).

When the Runner detects a condition (e.g., ETH price drops 5%), it will instruct the AgentKit ActionProvider to formulate the raw transaction data, returning it back to the Runner without executing it.

---

## 3. Required Environment Variables

To operate the Coinbase AgentKit integration, the deployment environment (Railway) must be injected with the following CDP credentials:

```bash
CDP_API_KEY_NAME="organizations/..."
CDP_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n..."
NETWORK_ID="base-mainnet" # Or base-sepolia for testing
```

---

## 4. Implementation Steps (Next Actions)

1. **Database Schema Update:** Alter `agents` table to securely accept CDP Wallet credentials.
2. **NPM Installation:** Install `@coinbase/agentkit` in `@nemesis/web` and `@nemesis/telegram-bot`.
3. **Agent Creation Refactor:** Inject CDP Wallet generation into `apps/web/app/api/agents/route.ts`.
4. **Transaction Builder:** Implement AgentKit action handlers in `apps/telegram-bot/src/runner.ts` to output unsigned transaction data.
5. **UI/UX Handoff:** Route the unsigned data to the Telegram Bot for user signature via WalletConnect.

---
*This document serves as the foundational research and architectural plan for Phase 3. No code changes will be applied until authorized.*
