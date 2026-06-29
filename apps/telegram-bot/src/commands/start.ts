import type { Context } from "telegraf";

import { getWalletForTelegramChatId } from "@nemesis/db";
import { mainMenuKeyboard, shortWallet } from "../lib/ui.js";

const WELCOME_UNLINKED = [
  "<code>[ NEMESIS ]</code>",
  "<b>the market's reckoning</b>",
  "",
  "I deliver agent proposals here. Approve or skip each one - nothing moves without your approval.",
  "",
  "<b>First, link your wallet:</b>",
  "1. Open the NEMESIS dashboard",
  "2. Connect your wallet",
  "3. Click <b>Generate code</b>",
  "4. Send <code>/link YOUR-CODE</code> here",
  "",
  "<b>commands</b>",
  "/link &lt;code&gt; - link your wallet to this chat",
  "/help - show command guide",
  "/agents - list your deployed agents",
  "/status - overall status",
  "/pause &lt;id&gt; - pause an agent",
  "/resume &lt;id&gt; - resume an agent",
].join("\n");

const WELCOME_LINKED = (short: string) => [
  "<code>[ NEMESIS ]</code>",
  "<b>the market's reckoning</b>",
  "",
  `Wallet <code>${short}</code> is linked to this chat.`,
  "Proposals for your agents will arrive here.",
  "",
  "<b>commands</b>",
  "/help - show command guide",
  "/agents - list your deployed agents",
  "/status - overall status",
  "/pause &lt;id&gt; - pause an agent",
  "/resume &lt;id&gt; - resume an agent",
  "/unlink - remove this chat from your wallet",
].join("\n");

export async function startCommand(ctx: Context): Promise<void> {
  const chatId = String(ctx.chat?.id ?? "");
  const wallet = await getWalletForTelegramChatId(chatId);

  if (wallet) {
    await ctx.reply(WELCOME_LINKED(shortWallet(wallet)), { parse_mode: "HTML", ...mainMenuKeyboard(true) });
  } else {
    await ctx.reply(WELCOME_UNLINKED, { parse_mode: "HTML", ...mainMenuKeyboard(false) });
  }
}