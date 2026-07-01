import type { Context } from "telegraf";

import { getWalletForTelegramChatId } from "@nemesis/db";
import { mainMenuKeyboard, shortWallet } from "../lib/ui.js";

const WELCOME_UNLINKED = [
  "<code>[ NEMESIS / ACCESS ]</code>",
  "<b>approval-first agents for Base and Solana</b>",
  "<code>------------------------------</code>",
  "This bot delivers wallet-scoped proposal alerts.",
  "Nothing moves here. Your wallet is always the final signer.",
  "",
  "<b>connect this chat</b>",
  "<code>01</code> open the NEMESIS dashboard",
  "<code>02</code> connect and sign in with your wallet",
  "<code>03</code> generate a Telegram code",
  "<code>04</code> send <code>/link YOUR-CODE</code> here",
  "",
  "<b>quick commands</b>",
  "<code>/link CODE</code>  connect wallet alerts",
  "/help - show command guide",
  "<code>/agents</code>     deployed agents",
  "<code>/status</code>     system snapshot",
].join("\n");

const WELCOME_LINKED = (short: string) => [
  "<code>[ NEMESIS / ONLINE ]</code>",
  "<b>telegram relay active</b>",
  "<code>------------------------------</code>",
  `wallet     <code>${short}</code>`,
  "delivery   proposals will arrive here",
  "approval   dashboard + wallet signature only",
  "",
  "<b>quick commands</b>",
  "<code>/agents</code>          deployed agents",
  "<code>/status</code>          system snapshot",
  "<code>/status ID</code>       inspect one agent",
  "<code>/pause ID</code>        pause an agent",
  "<code>/resume ID</code>       resume an agent",
  "/help - show command guide",
  "<code>/unlink</code>          remove this relay",
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