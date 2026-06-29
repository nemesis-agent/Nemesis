import type { Context } from "telegraf";

import { getWalletForTelegramChatId, listAgentsForWallet } from "@nemesis/db";
import { formatAgentLine } from "../lib/format.js";
import { agentKeyboard, linkedWalletKeyboard, unlinkedWalletKeyboard } from "../lib/ui.js";

const MAX_AGENT_CARDS = 10;

export async function agentsCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id ?? "");

  const wallet = await getWalletForTelegramChatId(chatId);
  if (!wallet) {
    await ctx.reply("Link this chat from the dashboard first with /link <code>.", { parse_mode: "HTML", ...unlinkedWalletKeyboard() });
    return;
  }

  const agents = await listAgentsForWallet(wallet);

  if (agents.length === 0) {
    await ctx.reply(
      "No agents deployed yet. Open the dashboard to deploy one.",
      { parse_mode: "HTML", ...linkedWalletKeyboard() },
    );
    return;
  }

  await ctx.reply(
    [`<code>[ NEMESIS / agents ]</code>`, `${agents.length} deployed agent${agents.length === 1 ? "" : "s"}.`].join("\n"),
    { parse_mode: "HTML", ...linkedWalletKeyboard() },
  );

  for (const agent of agents.slice(0, MAX_AGENT_CARDS)) {
    await ctx.reply(formatAgentLine(agent), { parse_mode: "HTML", ...agentKeyboard(agent) });
  }

  if (agents.length > MAX_AGENT_CARDS) {
    await ctx.reply(`Showing ${MAX_AGENT_CARDS} of ${agents.length}. Open the dashboard for the full list.`, linkedWalletKeyboard());
  }
}