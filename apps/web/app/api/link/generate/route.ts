import { NextResponse } from "next/server";

import { generateLinkCode } from "@nemesis/db";
import { rejectCrossOrigin, requireAnyWalletAuth, requireWalletAuthForChain } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";

function requestedChain(value: unknown): "base" | "solana" | null {
  if (value === undefined || value === null || value === "") return null;
  return value === "base" || value === "solana" ? value : null;
}

/**
 * POST /api/link/generate
 *
 * Generates a one-time Telegram linking code for an authenticated wallet.
 * The optional body { chain: "base" | "solana" } makes the selected wallet
 * explicit when a user is signed in with both Base and Solana.
 */
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  let body: { chain?: unknown } | null = null;
  try {
    body = (await request.json().catch(() => null)) as { chain?: unknown } | null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const chain = requestedChain(body?.chain);
  if (body?.chain !== undefined && !chain) {
    return NextResponse.json({ error: "chain must be base or solana." }, { status: 400 });
  }

  const auth = chain ? await requireWalletAuthForChain(chain) : await requireAnyWalletAuth();
  if (auth.error) return auth.error;

  const rateLimit = enforceRateLimit({ key: rateLimitKey(request, "link:generate", auth.wallet.walletKey), limit: 6, windowMs: 10 * 60_000 });
  if (rateLimit) return rateLimit;

  const { code, expiresAt } = await generateLinkCode(auth.wallet.walletKey);
  return NextResponse.json({ code, expiresAt, chain: auth.wallet.chain });
}