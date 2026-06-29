import { generateNonce } from "siwe";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * GET /api/auth/nonce
 *
 * Issues a fresh, single-use nonce. Use ?chain=solana for the Solana
 * sign-in challenge; default remains SIWE/Base for backwards compatibility.
 */
export async function GET(request: Request) {
  const rateLimit = await enforceRateLimit({ key: rateLimitKey(request, "auth:nonce"), limit: 30, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const session = await getSession();
  const chain = new URL(request.url).searchParams.get("chain");
  const nonce = generateNonce();

  if (chain === "solana") {
    session.solanaNonce = nonce;
  } else {
    session.nonce = nonce;
  }

  await session.save();
  return NextResponse.json({ nonce });
}
