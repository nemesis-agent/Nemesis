import type { Context } from "telegraf";

import { getAgent, getWalletForTelegramChatId, setAgentStatus } from "@nemesis/db";
import { escapeHtml } from "../lib/format.js";

export async function pauseCommand(ctx: Context): Promise<void> {
  const text = "text" in ctx.message! ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  if (!agentId) {
    await ctx.reply("Usage: /pause <agent_id>");
    return;
  }

  const wallet = await getWalletForTelegramChatId(String(ctx.chat?.id ?? ""));
  if (!wallet) {
    await ctx.reply("Link this chat from the dashboard first with /link <code>.");
    return;
  }

  const agent = await getAgent(agentId);
  if (!agent) {
    await ctx.reply(`No agent found with id <code>${escapeHtml(agentId)}</code>.`, { parse_mode: "HTML" });
    return;
  }

  if (agent.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
    await ctx.reply("You do not own that agent.");
    return;
  }

  await setAgentStatus(agentId, "paused");
  await ctx.reply(`<b>${escapeHtml(agent.name)}</b> (<code>${escapeHtml(agent.id)}</code>) is now paused.`, { parse_mode: "HTML" });
}

export async function resumeCommand(ctx: Context): Promise<void> {
  const text = "text" in ctx.message! ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  if (!agentId) {
    await ctx.reply("Usage: /resume <agent_id>");
    return;
  }

  const wallet = await getWalletForTelegramChatId(String(ctx.chat?.id ?? ""));
  if (!wallet) {
    await ctx.reply("Link this chat from the dashboard first with /link <code>.");
    return;
  }

  const agent = await getAgent(agentId);
  if (!agent) {
    await ctx.reply(`No agent found with id <code>${escapeHtml(agentId)}</code>.`, { parse_mode: "HTML" });
    return;
  }

  if (agent.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
    await ctx.reply("You do not own that agent.");
    return;
  }

  await setAgentStatus(agentId, "active");
  await ctx.reply(`<b>${escapeHtml(agent.name)}</b> (<code>${escapeHtml(agent.id)}</code>) is now active.`, { parse_mode: "HTML" });
}
