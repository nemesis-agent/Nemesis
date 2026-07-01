import type { Context } from "telegraf";

import { getWalletForTelegramChatId } from "@nemesis/db";
import { linkedWalletKeyboard, shortWallet, unlinkedWalletKeyboard } from "../lib/ui.js";

const HELP_UNLINKED = [
  "<code>[ NEMESIS / GUIDE ]</code>",
  "<b>connect wallet alerts</b>",
  "<code>------------------------------</code>",
  "NEMESIS sends proposal alerts to Telegram, but final approval always happens in your own wallet.",
  "",
  "<b>setup</b>",
  "<code>01</code> open https://nemesis-agent.xyz/dashboard",
  "<code>02</code> connect and sign in with your wallet",
  "<code>03</code> generate a Telegram code",
  "<code>04</code> send <code>/link YOUR-CODE</code> here",
  "",
  "<b>available now</b>",
  "<code>/start</code>      setup status",
  "<code>/help</code>       command guide",
  "<code>/link CODE</code>  connect wallet alerts",
].join("\n");

function linkedHelp(short: string) {
  return [
    "<code>[ NEMESIS / GUIDE ]</code>",
    "<b>relay controls</b>",
    "<code>------------------------------</code>",
    `wallet     <code>${short}</code>`,
    "mode       approval-first",
    "custody    never",
    "",
    "<b>commands</b>",
    "<code>/agents</code>          list deployed agents",
    "<code>/status</code>          wallet agent snapshot",
    "<code>/status ID</code>       inspect one agent",
    "<code>/pause ID</code>        pause an owned agent",
    "<code>/resume ID</code>       resume an owned agent",
    "<code>/unlink</code>          remove this chat link",
    "",
    "<b>proposal rule</b>",
    "Approve opens the dashboard for final wallet review. NEMESIS never signs or broadcasts without you. NEMESIS does not custody or bypass your wallet.",
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