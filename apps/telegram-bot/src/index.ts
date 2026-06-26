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
import { sendOpsAlert } from "./lib/alerts.js";
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTelegramPollingConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const maybeTelegramError = error as Error & { response?: { error_code?: number } };
  return maybeTelegramError.response?.error_code === 409 || error.message.includes("409: Conflict");
}

async function launchPollingWithRetry(botInstance: Telegraf): Promise<void> {
  let attempt = 0;

  for (;;) {
    await botInstance.telegram.deleteWebhook({ drop_pending_updates: false });
    const launchPromise = botInstance.launch({ dropPendingUpdates: attempt === 0 });

    const startupError = await Promise.race([
      launchPromise.then(() => undefined, (error: unknown) => error),
      sleep(3_000).then(() => undefined),
    ]);

    if (!startupError) {
      launchPromise.catch(async (error) => {
        if (isTelegramPollingConflict(error)) {
          await sendOpsAlert({ event: "telegram_polling_conflict", severity: "critical", message: "Telegram polling conflict after startup; restarting cleanly" });
          process.exit(0);
        }

        console.error("[nemesis-bot] polling stopped unexpectedly", error);
        process.exit(1);
      });
      console.log("[nemesis-bot] running");
      return;
    }

    if (!isTelegramPollingConflict(startupError)) {
      throw startupError;
    }

    attempt += 1;
    const delayMs = Math.min(60_000, 5_000 * attempt);
    console.warn(`[nemesis-bot] Telegram polling conflict; retrying in ${Math.round(delayMs / 1000)}s`);
    await sleep(delayMs);
  }
}

async function waitForBotLock() {
  for (;;) {
    const client = await acquireBotLock();
    if (client) {
      await sendOpsAlert({ event: "telegram_lock_acquired", severity: "info", message: "acquired Telegram polling lock" });
      return client;
    }

    await sendOpsAlert({ event: "telegram_lock_wait", severity: "warning", message: "another polling instance is active; waiting for lock" });
    await sleep(10_000);
  }
}

const botLockClient = await waitForBotLock();

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
  await launchPollingWithRetry(bot);

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
