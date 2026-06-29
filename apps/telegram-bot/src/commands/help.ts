import type { Context } from "telegraf";

import { getWalletForTelegramChatId } from "@nemesis/db";
import { linkedWalletKeyboard, shortWallet, unlinkedWalletKeyboard } from "../lib/ui.js";

const HELP_UNLINKED = [
  "<code>[ NEMESIS / help ]</code>",
  "NEMESIS delivers approval-first agent proposals to this chat. Nothing moves without your wallet signature.",
  "",
  "<b>link this chat</b>",
  "1. Open https://nemesis-agent.xyz/dashboard",
  "2. Connect and sign in with your wallet",
  "3. Generate a Telegram code",
  "4. Send <code>/link YOUR-CODE</code> here",
  "",
  "<b>commands</b>",
  "/start - show setup status",
  "/help - show this guide",
  "/link &lt;code&gt; - link a wallet to this chat",
].join("\n");

function linkedHelp(short: string) {
  return [
    "<code>[ NEMESIS / help ]</code>",
    `Linked wallet: <code>${short}</code>`,
    "",
    "<b>commands</b>",
    "/agents - list your deployed agents",
    "/status - show agent counts",
    "/status &lt;agent_id&gt; - show one agent",
    "/pause &lt;agent_id&gt; - pause an agent you own",
    "/resume &lt;agent_id&gt; - resume an agent you own",
    "/unlink - remove this chat link",
    "",
    "Proposals arrive with approve/skip buttons. Approve only opens the web app for final wallet review; NEMESIS never signs or broadcasts without you.",
  ].join("\n");
}

export async function helpCommand(ctx: Context): Promise<void> {
  const wallet = await getWalletForTelegramChatId(String(ctx.chat?.id ?? ""));

  if (!wallet) {
    await ctx.reply(HELP_UNLINKED, { parse_mode: "HTML", ...unlinkedWalletKeyboard() });
    return;
  }

  await ctx.reply(linkedHelp(shortWallet(wallet)), { parse_mode: "HTML", ...linkedWalletKeyboard() });
}