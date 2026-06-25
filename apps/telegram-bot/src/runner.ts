import type { Telegraf } from "telegraf";
import { listAgents } from "@nemesis/db";

const RUNNER_INTERVAL_MS = 1000 * 60; // 1 minute

/**
 * The Sub-Agent Runner (Phase 2).
 * Runs in the background, polling active agents and evaluating their
 * conditions against live market data. If conditions are met, it dispatches
 * a proposal via the Telegram bot.
 */
export function startRunner(bot: Telegraf) {
  console.log("[runner] initializing sub-agent runner...");

  setInterval(() => {
    runCycle(bot).catch((err) => {
      console.error("[runner] error in runner cycle:", err);
    });
  }, RUNNER_INTERVAL_MS);

  // Run the first cycle immediately
  runCycle(bot).catch(console.error);
}

async function runCycle(bot: Telegraf) {
  const agents = await listAgents();
  const activeAgents = agents.filter((a) => a.status === "active");
  
  if (activeAgents.length === 0) {
    console.log("[runner] cycle skipped: 0 active agents");
    return;
  }

  console.log(`[runner] cycle started: evaluating ${activeAgents.length} active agent(s)...`);

  for (const agent of activeAgents) {
    // Phase 2 evaluation logic will go here
    console.log(`[runner] evaluating agent: ${agent.name} (${agent.templateId})`);
  }
}
