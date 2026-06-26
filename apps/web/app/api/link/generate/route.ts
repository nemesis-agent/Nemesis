import { NextResponse } from "next/server";

import { generateLinkCode } from "@nemesis/db";
import { rejectCrossOrigin, requireAnyWalletAuth } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/link/generate
 *
 * Generates a one-time Telegram linking code for the authenticated wallet.
 * Requires a valid SIWE session â€” this prevents anyone from linking a
 * wallet they don't control (the primary SIWE security gap from Phase 0).
 */
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const auth = await requireAnyWalletAuth();
  if (auth.error) return auth.error;

  const rateLimit = enforceRateLimit({ key: rateLimitKey(request, "link:generate", auth.wallet.walletKey), limit: 6, windowMs: 10 * 60_000 });
  if (rateLimit) return rateLimit;

  const { code, expiresAt } = await generateLinkCode(auth.wallet.walletKey);
  return NextResponse.json({ code, expiresAt });
}
