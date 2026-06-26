import "dotenv/config";

import { Telegraf } from "telegraf";
import { pool } from "@nemesis/db";

import { agentsCommand } from "./commands/agents.js";
import { linkCommand, unlinkCommand } from "./commands/link.js";
import { pauseCommand, resumeCommand } from "./commands/pause.js";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { demoCommand, registerApprovalHandlers } from "./handlers/approval.js";
import { createAccessControl } from "./lib/auth.js";
import { startRunner } from "./runner.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env and fill it in.");
}

async function acquireBotLock() {
  const client = await pool.connect();
  const result = await client.query("SELECT pg_try_advisory_lock(hashtext('nemesis-telegram-bot')) AS locked");
  const locked = Boolean(result.rows[0]?.locked);

  if (!locked) {
    client.release();
    return null;
  }

  return client;
}

const botLockClient = await acquireBotLock();
if (!botLockClient) {
  console.warn("[nemesis-bot] another polling instance is already active; this process will stay idle");
  setInterval(() => undefined, 60_000);
} else {
  console.log("[nemesis-bot] acquired polling lock");
}

const bot = new Telegraf(token);

bot.use(createAccessControl());

bot.command("start", startCommand);
bot.command("link", linkCommand);
bot.command("unlink", unlinkCommand);
bot.command("agents", agentsCommand);
bot.command("status", statusCommand);
bot.command("pause", pauseCommand);
bot.command("resume", resumeCommand);
bot.command("demo", demoCommand);

registerApprovalHandlers(bot);

bot.catch((error, ctx) => {
  console.error(`[nemesis-bot] error for ${ctx.updateType}`, error);
});

if (botLockClient) {
  await bot.telegram.deleteWebhook({ drop_pending_updates: false });
  await bot.launch({ dropPendingUpdates: true });
  console.log("[nemesis-bot] running");

  // Start the background agent evaluation loop only in the active polling process.
  startRunner(bot);
}

async function shutdown(signal: "SIGINT" | "SIGTERM") {
  if (botLockClient) {
    bot.stop(signal);
    await botLockClient.query("SELECT pg_advisory_unlock(hashtext('nemesis-telegram-bot'))").catch(() => undefined);
    botLockClient.release();
  }
  process.exit(0);
}

process.once("SIGINT", () => { void shutdown("SIGINT"); });
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
