import type { Telegraf } from "telegraf";
import { listAgents, createProposal, getTelegramChatIdForWallet, listProposalsForAgent, pruneOldProposals } from "@nemesis/db";
import { getLivePrice } from "./lib/price-feed.js";
import { sendProposal } from "./handlers/approval.js";
import { logger } from "./lib/logger.js";

const RUNNER_INTERVAL_MS = 1000 * 60; // 1 minute
let cycleCount = 0;

/**
 * The Sub-Agent Runner (Phase 2).
 * Runs in the background, polling active agents and evaluating their
 * conditions against live market data. If conditions are met, it dispatches
 * a proposal via the Telegram bot.
 */
export function startRunner(bot: Telegraf) {
  logger.info({ msg: "initializing sub-agent runner" });

  setInterval(() => {
    cycleCount++;
    runCycle(bot).catch((err) => {
      logger.error({ msg: "error in runner cycle", err });
    });

    // Prune old data once a day (1440 minutes)
    if (cycleCount % 1440 === 0) {
      pruneOldProposals(7)
        .then((count) => {
          if (count > 0) logger.info({ msg: `pruned ${count} old skipped proposals` });
        })
        .catch((err) => logger.error({ msg: "error pruning old proposals", err }));
    }
  }, RUNNER_INTERVAL_MS);

  // Run the first cycle immediately
  runCycle(bot).catch((err) => logger.error({ msg: "error in first runner cycle", err }));
}

async function runCycle(bot: Telegraf) {
  const agents = await listAgents();
  const activeAgents = agents.filter((a) => a.status === "active");
  
  if (activeAgents.length === 0) {
    logger.debug({ msg: "cycle skipped: 0 active agents" });
    return;
  }

  logger.info({ msg: `cycle started: evaluating ${activeAgents.length} active agent(s)` });

  // Cache prices so we only fetch once per cycle
  const prices = {
    ETH_USD: await getLivePrice("ETH_USD").catch(() => null),
  };

  for (const agent of activeAgents) {
    logger.debug({ msg: "evaluating agent", agentId: agent.id, templateId: agent.templateId });

    // In a full production scale, you'd use a strategy pattern here or Hermes LLM.
    // For Phase 2, we hardcode the logic for our top 2 high-volume templates.
    let conditionMet = false;
    let actionSummary = "";
    let unsignedTxPayload: string | undefined;

    if (agent.templateId === "dip-buyer") {
      const targetDrop = Number(agent.parameters["dipPercent"] || 5);
      const purchaseAmount = Number(agent.parameters["buyAmount"] || 50);
      
      // Simplistic check for demo — in reality we'd compare against a moving average or yesterday's close
      const currentPrice = prices.ETH_USD;
      const baselinePrice = 4000; // Mock baseline for the sake of the runner logic
      
      if (currentPrice && currentPrice <= baselinePrice * (1 - targetDrop / 100)) {
        conditionMet = true;
        actionSummary = `ETH dropped below ${targetDrop}% from baseline. Current price: $${currentPrice.toFixed(2)}. Ready to buy ${purchaseAmount} ETH.`;
        
        // Execution payload intentionally omitted until a real Base MCP/AgentKit encoder is wired.
      }
    } 
    
    if (agent.templateId === "limit-order") {
      const limitPrice = Number(agent.parameters["targetPrice"] || 3000);
      const sellAmount = Number(agent.parameters["amount"] || 500);
      
      const currentPrice = prices.ETH_USD;
      if (currentPrice && currentPrice >= limitPrice) {
        conditionMet = true;
        actionSummary = `ETH reached limit price of $${limitPrice}. Current price: $${currentPrice.toFixed(2)}. Ready to sell ${sellAmount} ETH.`;
        
        // Execution payload intentionally omitted until a real Base MCP/AgentKit encoder is wired.
      }
    }

    if (conditionMet) {
      logger.info({ msg: "condition MET for agent — dispatching proposal", agentId: agent.id });
      
      const chatId = await getTelegramChatIdForWallet(agent.walletAddress);
      if (!chatId) {
        logger.warn({ msg: "skip: no Telegram linked for wallet", walletAddress: agent.walletAddress });
        continue;
      }

      const proposal = await createProposal({
        agentId: agent.id,
        title: "Action Proposed",
        proposedAction: actionSummary,
        estimatedGasUsd: "$0.10",
        unsignedTxPayload,
        details: [
          { label: "Trigger", value: "Price target reached" },
          { label: "Current Price", value: `$${prices.ETH_USD?.toFixed(2)}` },
          { label: "Timestamp", value: new Date().toISOString() },
        ],
      });

      await sendProposal(bot, chatId, proposal, agent.name);
      logger.info({ msg: "proposal dispatched to Telegram", proposalId: proposal.id });
      
    }
  }
}
