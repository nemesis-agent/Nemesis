import type { Context } from "telegraf";

import { getWalletForTelegramChatId, listAgentsForWallet } from "@nemesis/db";
import { formatAgentLine } from "../lib/format.js";
import { agentKeyboard, linkedWalletKeyboard, unlinkedWalletKeyboard } from "../lib/ui.js";

const MAX_AGENT_CARDS = 10;

export async function agentsCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id ?? "");

  const wallet = await getWalletForTelegramChatId(chatId);
  if (!wallet) {
    await ctx.reply("<code>[ NEMESIS / AGENTS ]</code>\nLink this chat from the dashboard first with <code>/link CODE</code>.", { parse_mode: "HTML", ...unlinkedWalletKeyboard() });
    return;
  }

  const agents = await listAgentsForWallet(wallet);

  if (agents.length === 0) {
    await ctx.reply(
      ["<code>[ NEMESIS / AGENTS ]</code>", "<b>no agents deployed</b>", "<code>------------------------------</code>", "Open the dashboard, choose a template, and deploy your first approval-first agent."].join("\n"),
      { parse_mode: "HTML", ...linkedWalletKeyboard() },
    );
    return;
  }

  await ctx.reply(
    [`<code>[ NEMESIS / AGENTS ]</code>`, `<b>${agents.length} deployed agent${agents.length === 1 ? "" : "s"}</b>`, `<code>------------------------------</code>`, `Use the buttons under each card to inspect, pause, or resume.`].join("\n"),
    { parse_mode: "HTML", ...linkedWalletKeyboard() },
  );

  for (const agent of agents.slice(0, MAX_AGENT_CARDS)) {
    await ctx.reply(formatAgentLine(agent), { parse_mode: "HTML", ...agentKeyboard(agent) });
  }

  if (agents.length > MAX_AGENT_CARDS) {
    await ctx.reply([`<code>[ NEMESIS / AGENTS ]</code>`, `showing ${MAX_AGENT_CARDS} of ${agents.length}`, `Open the dashboard for the full list.`].join("\n"), { parse_mode: "HTML", ...linkedWalletKeyboard() });
  }
}