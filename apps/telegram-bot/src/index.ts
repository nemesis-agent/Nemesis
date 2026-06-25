import "dotenv/config";

import { Telegraf } from "telegraf";

import { agentsCommand } from "./commands/agents.js";
import { linkCommand, unlinkCommand } from "./commands/link.js";
import { pauseCommand, resumeCommand } from "./commands/pause.js";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { demoCommand, registerApprovalHandlers } from "./handlers/approval.js";
import { createAccessControl } from "./lib/auth.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env and fill it in.");
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

await bot.launch();
console.log("[nemesis-bot] running");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
