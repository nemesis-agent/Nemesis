import type { Context } from "telegraf";

import { getAgent, getWalletForTelegramChatId, listAgentsForWallet } from "@nemesis/db";
import { escapeHtml, formatAgentLine } from "../lib/format.js";

export async function statusCommand(ctx: Context): Promise<void> {
  const text = "text" in ctx.message! ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  const chatId = String(ctx.chat?.id ?? "");
  const wallet = await getWalletForTelegramChatId(chatId);
  if (!wallet) {
    await ctx.reply("Link this chat from the dashboard first with /link <code>.");
    return;
  }

  if (agentId) {
    const agent = await getAgent(agentId);
    if (!agent || agent.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
      await ctx.reply(`No agent found with id <code>${escapeHtml(agentId)}</code>. Use /agents to list.`, { parse_mode: "HTML" });
      return;
    }
    await ctx.reply(formatAgentLine(agent), { parse_mode: "HTML" });
    return;
  }

  const agents = await listAgentsForWallet(wallet);

  const active = agents.filter((a) => a.status === "active").length;
  const paused = agents.filter((a) => a.status === "paused").length;
  const awaiting = agents.filter((a) => a.status === "awaiting-approval").length;

  const summary = [
    "<code>[ NEMESIS / status ]</code>",
    `${agents.length} agent${agents.length === 1 ? "" : "s"} total`,
    `${active} active . ${paused} paused . ${awaiting} awaiting approval`,
  ].join("\n");

  await ctx.reply(summary, { parse_mode: "HTML" });
}
