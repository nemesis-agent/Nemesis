import { db } from "./client.js";
import { createAgent, recordAgentCheck, setAgentStatus } from "./agents.js";
import { createProposal, approveProposal } from "./proposals.js";

/**
 * Idempotent seed: clears existing demo rows and re-inserts the same
 * four agents and seven proposals that used to live as static arrays in
 * apps/web/lib/mock-agents.ts, apps/web/lib/mock-proposals.ts, and their
 * apps/telegram-bot/src/lib/ duplicates. Both apps now read from this one
 * real database instead — see CONTEXT.md, "What changed in the database
 * pass" for the full before/after.
 *
 * Run with: npm run seed --workspace=@nemesis/db (after building)
 */

const DEMO_WALLET = "0x7f3a91d200000000000000000000000000aaaa";

function reset() {
  db.exec("DELETE FROM proposals;");
  db.exec("DELETE FROM agents;");
  db.exec("DELETE FROM link_codes;");
  db.exec("DELETE FROM users;");
}

function seed() {
  reset();

  const apeAgent = createAgent({
    walletAddress: DEMO_WALLET,
    templateId: "ape-agent",
    name: "Ape agent",
  });
  recordAgentCheck(apeAgent.id, "New launch detected — proposal sent to Telegram");

  const rebalancer = createAgent({
    walletAddress: DEMO_WALLET,
    templateId: "portfolio-rebalancer",
    name: "Portfolio rebalancer",
  });
  recordAgentCheck(rebalancer.id, "Allocation within 4% of target — no action needed");

  const compounder = createAgent({
    walletAddress: DEMO_WALLET,
    templateId: "auto-compound",
    name: "Auto compound",
  });
  recordAgentCheck(compounder.id, "Accrued yield 3.10 USDC — below 5 USDC claim threshold");

  const dipBuyer = createAgent({
    walletAddress: DEMO_WALLET,
    templateId: "dip-buyer",
    name: "Dip buyer",
  });
  setAgentStatus(dipBuyer.id, "paused");
  recordAgentCheck(dipBuyer.id, "Paused by user");

  // Ape agent proposals
  createProposal({
    agentId: apeAgent.id,
    title: "New launch detected",
    details: [
      { label: "liquidity", value: "$48,200" },
      { label: "holders", value: "312" },
      { label: "dev wallet", value: "2.1%" },
    ],
    proposedAction: "Ape $50 USDC",
    estimatedGasUsd: "$0.04",
  });

  const apeApproved = createProposal({
    agentId: apeAgent.id,
    title: "New launch detected",
    details: [
      { label: "liquidity", value: "$31,400" },
      { label: "holders", value: "88" },
      { label: "dev wallet", value: "3.4%" },
    ],
    proposedAction: "Ape $50 USDC",
    estimatedGasUsd: "$0.03",
  });
  approveProposal(apeApproved.id, "0x4a2f...8e1d");

  createProposal({
    agentId: apeAgent.id,
    title: "New launch detected",
    details: [
      { label: "liquidity", value: "$12,800" },
      { label: "holders", value: "41" },
      { label: "dev wallet", value: "6.8%" },
    ],
    proposedAction: "Ape $50 USDC",
    estimatedGasUsd: "$0.04",
  });

  // Portfolio rebalancer proposals
  const rebalance1 = createProposal({
    agentId: rebalancer.id,
    title: "Allocation drift detected",
    details: [
      { label: "current", value: "72% ETH / 28% USDC" },
      { label: "target", value: "60% ETH / 40% USDC" },
      { label: "drift", value: "+12%" },
    ],
    proposedAction: "Swap ETH → USDC to rebalance",
    estimatedGasUsd: "$0.06",
  });
  approveProposal(rebalance1.id, "0x9f1a...3c22");

  const rebalance2 = createProposal({
    agentId: rebalancer.id,
    title: "Allocation drift detected",
    details: [
      { label: "current", value: "52% ETH / 48% USDC" },
      { label: "target", value: "60% ETH / 40% USDC" },
      { label: "drift", value: "-8%" },
    ],
    proposedAction: "Swap USDC → ETH to rebalance",
    estimatedGasUsd: "$0.05",
  });
  approveProposal(rebalance2.id, "0x2c4b...f19a");

  // Auto compound proposals
  const compound1 = createProposal({
    agentId: compounder.id,
    title: "Yield ready to compound",
    details: [
      { label: "accrued", value: "6.40 USDC" },
      { label: "source", value: "morpho lending" },
      { label: "threshold", value: "5.00 USDC" },
    ],
    proposedAction: "Claim 6.40 USDC → redeposit to Morpho",
    estimatedGasUsd: "$0.07",
  });
  approveProposal(compound1.id, "0x7e3c...d0f1");

  const compound2 = createProposal({
    agentId: compounder.id,
    title: "Yield ready to compound",
    details: [
      { label: "accrued", value: "5.12 USDC" },
      { label: "source", value: "morpho lending" },
      { label: "threshold", value: "5.00 USDC" },
    ],
    proposedAction: "Claim 5.12 USDC → redeposit to Morpho",
    estimatedGasUsd: "$0.07",
  });
  approveProposal(compound2.id, "0x1b8d...4e72");

  console.log(`[nemesis-db] seeded ${DEMO_WALLET} with 4 agents and 7 proposals`);
}

seed();
