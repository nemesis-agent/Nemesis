import { generateNonce } from "siwe";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

/**
 * GET /api/auth/nonce
 *
 * Issues a fresh, single-use nonce. The frontend wallet uses this to
 * construct the SIWE message before asking the user to sign it. The
 * nonce is saved in the encrypted session cookie so the verify step
 * can confirm it came from us (replay-attack prevention).
 */
export async function GET() {
  const session = await getSession();
  session.nonce = generateNonce();
  await session.save();
  return NextResponse.json({ nonce: session.nonce });
}
