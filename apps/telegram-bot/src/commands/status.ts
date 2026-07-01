import type { Context } from "telegraf";

import { getAgent, getWalletForTelegramChatId, listAgentsForWallet } from "@nemesis/db";
import { escapeHtml, formatAgentLine } from "../lib/format.js";
import { agentKeyboard, linkedWalletKeyboard, unlinkedWalletKeyboard } from "../lib/ui.js";

export async function statusCommand(ctx: Context): Promise<void> {
  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  const chatId = String(ctx.chat?.id ?? "");
  const wallet = await getWalletForTelegramChatId(chatId);
  if (!wallet) {
    await ctx.reply("<code>[ NEMESIS / STATUS ]</code>\nLink this chat from the dashboard first with <code>/link CODE</code>.", { parse_mode: "HTML", ...unlinkedWalletKeyboard() });
    return;
  }

  if (agentId) {
    const agent = await getAgent(agentId);
    if (!agent || agent.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
      await ctx.reply([`<code>[ NEMESIS / STATUS ]</code>`, `No owned agent found for <code>${escapeHtml(agentId)}</code>.`, `Use <code>/agents</code> to list your agents.`].join("\n"), { parse_mode: "HTML", ...linkedWalletKeyboard() });
      return;
    }
    await ctx.reply(formatAgentLine(agent), { parse_mode: "HTML", ...agentKeyboard(agent) });
    return;
  }

  const agents = await listAgentsForWallet(wallet);

  const active = agents.filter((a) => a.status === "active").length;
  const paused = agents.filter((a) => a.status === "paused").length;
  const awaiting = agents.filter((a) => a.status === "awaiting-approval").length;
  const latest = agents
    .slice()
    .sort((a, b) => String(b.lastCheckedAt ?? "").localeCompare(String(a.lastCheckedAt ?? "")))
    .slice(0, 3);

  const summary = [
    "<code>[ NEMESIS / STATUS ]</code>",
    "<b>wallet agent snapshot</b>",
    "<code>------------------------------</code>",
    `total      ${agents.length}`,
    `active     ${active}`,
    `paused     ${paused}`,
    `awaiting   ${awaiting}`,
    "",
    latest.length > 0 ? "<b>recent checks</b>" : "No agents deployed yet.",
    ...latest.map((agent) => `<code>${escapeHtml(agent.name.slice(0, 18).padEnd(18, " "))}</code> ${escapeHtml(agent.lastEvent ?? "not checked yet")}`),
  ].filter(Boolean).join("\n");

  await ctx.reply(summary, { parse_mode: "HTML", ...linkedWalletKeyboard() });
}