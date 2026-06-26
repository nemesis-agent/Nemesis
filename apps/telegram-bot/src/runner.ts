import type { Telegraf } from "telegraf";
import { listAgents, pruneOldProposals } from "@nemesis/db";
import { logger } from "./lib/logger.js";

const RUNNER_INTERVAL_MS = 1000 * 60; // 1 minute
let cycleCount = 0;

/**
 * The Sub-Agent Runner.
 * Production template evaluators are intentionally gated until each template
 * has verified monitoring logic and Base calldata generation. The loop stays
 * alive for pruning and operational visibility without creating mock proposals.
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

async function runCycle(_bot: Telegraf) {
  const agents = await listAgents();
  const activeAgents = agents.filter((a) => a.status === "active");

  if (activeAgents.length === 0) {
    logger.debug({ msg: "cycle skipped: 0 active agents" });
    return;
  }

  logger.info({
    msg: "cycle completed: production template evaluators are gated",
    activeAgents: activeAgents.length,
  });
}
