import type { Context } from "telegraf";

import { getAgent, getWalletForTelegramChatId, listAgentsForWallet, listAgents } from "@nemesis/db";
import { formatAgentLine } from "../lib/format.js";

export async function statusCommand(ctx: Context): Promise<void> {
  const text = "text" in ctx.message! ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  if (agentId) {
    const agent = getAgent(agentId);
    if (!agent) {
      await ctx.reply(`No agent found with id <code>${agentId}</code>. Use /agents to list.`, { parse_mode: "HTML" });
      return;
    }
    await ctx.reply(formatAgentLine(agent), { parse_mode: "HTML" });
    return;
  }

  const chatId = String(ctx.chat?.id ?? "");
  const wallet = getWalletForTelegramChatId(chatId);
  const agents = wallet ? listAgentsForWallet(wallet) : listAgents();

  const active = agents.filter((a) => a.status === "active").length;
  const paused = agents.filter((a) => a.status === "paused").length;
  const awaiting = agents.filter((a) => a.status === "awaiting-approval").length;

  const summary = [
    "<code>[ NEMESIS / status ]</code>",
    `${agents.length} agent${agents.length === 1 ? "" : "s"} total`,
    `${active} active · ${paused} paused · ${awaiting} awaiting approval`,
  ].join("\n");

  await ctx.reply(summary, { parse_mode: "HTML" });
}
