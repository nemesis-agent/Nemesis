import { generateNonce } from "siwe";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * GET /api/auth/nonce
 *
 * Issues a fresh, single-use nonce. The frontend wallet uses this to
 * construct the SIWE message before asking the user to sign it. The
 * nonce is saved in the encrypted session cookie so the verify step
 * can confirm it came from us (replay-attack prevention).
 */
export async function GET(request: Request) {
  const rateLimit = enforceRateLimit({ key: rateLimitKey(request, "auth:nonce"), limit: 30, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const session = await getSession();
  session.nonce = generateNonce();
  await session.save();
  return NextResponse.json({ nonce: session.nonce });
}
