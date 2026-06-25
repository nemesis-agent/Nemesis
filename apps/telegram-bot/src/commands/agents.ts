import type { Context } from "telegraf";

import { getWalletForTelegramChatId, listAgentsForWallet } from "@nemesis/db";
import { formatAgentLine } from "../lib/format.js";

export async function agentsCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id ?? "");

  const wallet = await getWalletForTelegramChatId(chatId);
  if (!wallet) {
    await ctx.reply("Link this chat from the dashboard first with /link <code>.");
    return;
  }

  const agents = await listAgentsForWallet(wallet);

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
