import { NextResponse } from "next/server";

import { generateLinkCode } from "@nemesis/db";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/link/generate
 *
 * Generates a one-time Telegram linking code for the authenticated wallet.
 * Requires a valid SIWE session — this prevents anyone from linking a
 * wallet they don't control (the primary SIWE security gap from Phase 0).
 */
export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { code, expiresAt } = await generateLinkCode(auth.address);
  return NextResponse.json({ code, expiresAt });
}
