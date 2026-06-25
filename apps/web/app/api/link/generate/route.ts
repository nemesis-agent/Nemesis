import { NextResponse } from "next/server";

import { generateLinkCode } from "@nemesis/db";

/**
 * Generates a one-time code for linking a wallet address to a Telegram
 * chat. The web dashboard calls this once a wallet is connected; the
 * user then sends the returned code to the bot via `/link <code>`.
 * See packages/db/src/links.ts for the full flow, and
 * apps/telegram-bot/src/commands/link.ts for the consuming side.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { walletAddress?: string } | null;
  const walletAddress = body?.walletAddress;

  if (!walletAddress || typeof walletAddress !== "string") {
    return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
  }

  const { code, expiresAt } = generateLinkCode(walletAddress);
  return NextResponse.json({ code, expiresAt });
}
