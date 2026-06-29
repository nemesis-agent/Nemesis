import type { Context } from "telegraf";

import { getAgent, getWalletForTelegramChatId, setAgentStatus } from "@nemesis/db";
import { escapeHtml } from "../lib/format.js";
import { agentKeyboard, linkedWalletKeyboard, unlinkedWalletKeyboard } from "../lib/ui.js";

async function requireOwnedAgent(ctx: Context, agentId: string) {
  const wallet = await getWalletForTelegramChatId(String(ctx.chat?.id ?? ""));
  if (!wallet) {
    await ctx.reply("Link this chat from the dashboard first with /link <code>.", { parse_mode: "HTML", ...unlinkedWalletKeyboard() });
    return null;
  }

  const agent = await getAgent(agentId);
  if (!agent) {
    await ctx.reply(`No agent found with id <code>${escapeHtml(agentId)}</code>.`, { parse_mode: "HTML", ...linkedWalletKeyboard() });
    return null;
  }

  if (agent.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
    await ctx.reply("You do not own that agent.", linkedWalletKeyboard());
    return null;
  }

  return agent;
}

export async function pauseCommand(ctx: Context): Promise<void> {
  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  if (!agentId) {
    await ctx.reply("Usage: /pause <agent_id>", linkedWalletKeyboard());
    return;
  }

  const agent = await requireOwnedAgent(ctx, agentId);
  if (!agent) return;

  const updated = await setAgentStatus(agentId, "paused");
  await ctx.reply(`<b>${escapeHtml(agent.name)}</b> (<code>${escapeHtml(agent.id)}</code>) is now paused.`, {
    parse_mode: "HTML",
    ...agentKeyboard(updated ?? { ...agent, status: "paused" }),
  });
}

export async function resumeCommand(ctx: Context): Promise<void> {
  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  if (!agentId) {
    await ctx.reply("Usage: /resume <agent_id>", linkedWalletKeyboard());
    return;
  }

  const agent = await requireOwnedAgent(ctx, agentId);
  if (!agent) return;

  const updated = await setAgentStatus(agentId, "active");
  await ctx.reply(`<b>${escapeHtml(agent.name)}</b> (<code>${escapeHtml(agent.id)}</code>) is now active.`, {
    parse_mode: "HTML",
    ...agentKeyboard(updated ?? { ...agent, status: "active" }),
  });
}