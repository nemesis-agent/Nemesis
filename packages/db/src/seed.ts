import { createAgent, setAgentStatus } from "./agents.js";
import { createProposal, approveProposal, skipProposal } from "./proposals.js";
import { pool } from "./client.js";

async function main() {
  console.log("Seeding Postgres database...");

  const MOCK_WALLET = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

  const autoCompound = await createAgent({
    walletAddress: MOCK_WALLET,
    templateId: "auto-compound",
    name: "AERO Auto-Compounder",
    parameters: {
      minClaimAmount: 5,
      source: "aerodrome-lp-fees",
    },
  });

  const dipBuyer = await createAgent({
    walletAddress: MOCK_WALLET,
    templateId: "dip-buyer",
    name: "ETH Dip Buyer",
    parameters: {
      dipPercent: 5,
      buyAmount: 50,
      cooldownHours: 12,
    },
  });

  const poolSniper = await createAgent({
    walletAddress: MOCK_WALLET,
    templateId: "pool-sniper",
    name: "Aerodrome Pool Sniper",
    parameters: {
      minInitialLiquidity: 100000,
      allocationPerPool: 100,
      tokenWhitelist: "eth-pairs-only",
    },
  });

  await setAgentStatus(dipBuyer.id, "paused");

  const prop1 = await createProposal({
    agentId: autoCompound.id,
    title: "Compound AERO Yield",
    details: [
      { label: "Pool", value: "AERO/USDC" },
      { label: "Claimable", value: "142.5 AERO ($128.40)" },
    ],
    proposedAction: "Claim 142.5 AERO and reinvest into AERO/USDC liquidity pool",
    estimatedGasUsd: "$0.12",
  });
  await approveProposal(prop1.id, "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

  await createProposal({
    agentId: poolSniper.id,
    title: "Buy newly listed DEGEN",
    details: [
      { label: "Token", value: "DEGEN" },
      { label: "Initial Liquidity", value: "$450,000" },
    ],
    proposedAction: "Swap $100 USDC for DEGEN on Aerodrome",
    estimatedGasUsd: "$0.18",
  });

  console.log("Database seeded successfully.");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
