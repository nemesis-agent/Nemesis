import type { Context, Telegraf } from "telegraf";

import { getAgent, getWalletForTelegramChatId, setAgentStatus } from "@nemesis/db";
import { agentsCommand } from "../commands/agents.js";
import { helpCommand } from "../commands/help.js";
import { statusCommand } from "../commands/status.js";
import { escapeHtml, formatAgentLine } from "../lib/format.js";
import { agentKeyboard, linkedWalletKeyboard, unlinkedWalletKeyboard } from "../lib/ui.js";

async function getOwnedAgent(ctx: Context, agentId: string) {
  const wallet = await getWalletForTelegramChatId(String(ctx.chat?.id ?? ""));
  if (!wallet) {
    await ctx.reply("Link this chat from the dashboard first with /link <code>.", { parse_mode: "HTML", ...unlinkedWalletKeyboard() });
    return null;
  }

  const agent = await getAgent(agentId);
  if (!agent || agent.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
    await ctx.reply(`No agent found with id <code>${escapeHtml(agentId)}</code>. Use /agents to list.`, { parse_mode: "HTML", ...linkedWalletKeyboard() });
    return null;
  }

  return agent;
}

export function registerMenuHandlers(bot: Telegraf): void {
  bot.action("menu:help", async (ctx) => {
    await ctx.answerCbQuery();
    await helpCommand(ctx);
  });

  bot.action("menu:agents", async (ctx) => {
    await ctx.answerCbQuery();
    await agentsCommand(ctx);
  });

  bot.action("menu:status", async (ctx) => {
    await ctx.answerCbQuery();
    await statusCommand(ctx);
  });

  bot.action("menu:link", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      [
        "<code>[ NEMESIS / link ]</code>",
        "1. Open the dashboard",
        "2. Connect and sign in with your Base or Solana wallet",
        "3. Generate a Telegram code",
        "4. Send <code>/link YOUR-CODE</code> here",
      ].join("\n"),
      { parse_mode: "HTML", ...unlinkedWalletKeyboard() },
    );
  });

  bot.action(/^agent:status:(.+)$/, async (ctx) => {
    const agentId = ctx.match[1];
    if (!agentId) return;
    await ctx.answerCbQuery();
    const agent = await getOwnedAgent(ctx, agentId);
    if (!agent) return;
    await ctx.reply(formatAgentLine(agent), { parse_mode: "HTML", ...agentKeyboard(agent) });
  });

  bot.action(/^agent:pause:(.+)$/, async (ctx) => {
    const agentId = ctx.match[1];
    if (!agentId) return;
    const agent = await getOwnedAgent(ctx, agentId);
    if (!agent) {
      await ctx.answerCbQuery("Not authorized");
      return;
    }
    const updated = await setAgentStatus(agentId, "paused");
    await ctx.answerCbQuery("paused");
    await ctx.reply(`<b>${escapeHtml(agent.name)}</b> is now paused.`, {
      parse_mode: "HTML",
      ...agentKeyboard(updated ?? { ...agent, status: "paused" }),
    });
  });

  bot.action(/^agent:resume:(.+)$/, async (ctx) => {
    const agentId = ctx.match[1];
    if (!agentId) return;
    const agent = await getOwnedAgent(ctx, agentId);
    if (!agent) {
      await ctx.answerCbQuery("Not authorized");
      return;
    }
    const updated = await setAgentStatus(agentId, "active");
    await ctx.answerCbQuery("active");
    await ctx.reply(`<b>${escapeHtml(agent.name)}</b> is now active.`, {
      parse_mode: "HTML",
      ...agentKeyboard(updated ?? { ...agent, status: "active" }),
    });
  });
}