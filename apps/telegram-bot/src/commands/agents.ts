import type { Context } from "telegraf";

import { getWalletForTelegramChatId, listAgentsForWallet, listAgents } from "@nemesis/db";
import { formatAgentLine } from "../lib/format.js";

export async function agentsCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id ?? "");

  // Look up the wallet linked to this chat — if found, show only that
  // wallet's agents; otherwise, fall back to all agents (only while
  // the linking flow is not yet enforced in production).
  const wallet = getWalletForTelegramChatId(chatId);
  const agents = wallet ? listAgentsForWallet(wallet) : listAgents();

  if (agents.length === 0) {
    await ctx.reply(
      "No agents deployed yet. Open the dashboard to deploy one.",
      { parse_mode: "HTML" },
    );
    return;
  }

  const blocks = agents.map(formatAgentLine);
  await ctx.reply(blocks.join("\n\n"), { parse_mode: "HTML" });
}
