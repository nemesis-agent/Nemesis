import type { Context } from "telegraf";

import { getAgent, getWalletForTelegramChatId, setAgentStatus } from "@nemesis/db";
import { escapeHtml } from "../lib/format.js";
import { agentKeyboard, linkedWalletKeyboard, unlinkedWalletKeyboard } from "../lib/ui.js";

async function requireOwnedAgent(ctx: Context, agentId: string) {
  const wallet = await getWalletForTelegramChatId(String(ctx.chat?.id ?? ""));
  if (!wallet) {
    await ctx.reply("<code>[ NEMESIS / CONTROL ]</code>\nLink this chat from the dashboard first with <code>/link CODE</code>.", { parse_mode: "HTML", ...unlinkedWalletKeyboard() });
    return null;
  }

  const agent = await getAgent(agentId);
  if (!agent) {
    await ctx.reply([`<code>[ NEMESIS / CONTROL ]</code>`, `No owned agent found for <code>${escapeHtml(agentId)}</code>.`].join("\n"), { parse_mode: "HTML", ...linkedWalletKeyboard() });
    return null;
  }

  if (agent.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
    await ctx.reply("<code>[ NEMESIS / CONTROL ]</code>\nOwnership check failed. This agent is not linked to your wallet.", { parse_mode: "HTML", ...linkedWalletKeyboard() });
    return null;
  }

  return agent;
}

export async function pauseCommand(ctx: Context): Promise<void> {
  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  if (!agentId) {
    await ctx.reply("<code>[ NEMESIS / PAUSE ]</code>\nUsage: <code>/pause AGENT_ID</code>", { parse_mode: "HTML", ...linkedWalletKeyboard() });
    return;
  }

  const agent = await requireOwnedAgent(ctx, agentId);
  if (!agent) return;

  const updated = await setAgentStatus(agentId, "paused");
  await ctx.reply([`<code>[ NEMESIS / PAUSED ]</code>`, `<b>${escapeHtml(agent.name)}</b>`, `<code>------------------------------</code>`, `agent      <code>${escapeHtml(agent.id)}</code>`, `status     PAUSED`, `proposals  stopped until resumed`].join("\n"), {
    parse_mode: "HTML",
    ...agentKeyboard(updated ?? { ...agent, status: "paused" }),
  });
}

export async function resumeCommand(ctx: Context): Promise<void> {
  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  if (!agentId) {
    await ctx.reply("<code>[ NEMESIS / RESUME ]</code>\nUsage: <code>/resume AGENT_ID</code>", { parse_mode: "HTML", ...linkedWalletKeyboard() });
    return;
  }

  const agent = await requireOwnedAgent(ctx, agentId);
  if (!agent) return;

  const updated = await setAgentStatus(agentId, "active");
  await ctx.reply([`<code>[ NEMESIS / ACTIVE ]</code>`, `<b>${escapeHtml(agent.name)}</b>`, `<code>------------------------------</code>`, `agent      <code>${escapeHtml(agent.id)}</code>`, `status     ACTIVE`, `proposals  monitoring resumed`].join("\n"), {
    parse_mode: "HTML",
    ...agentKeyboard(updated ?? { ...agent, status: "active" }),
  });
}