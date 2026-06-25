import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

/**
 * GET /api/auth/me
 *
 * Returns the current session's authenticated wallet address, or null
 * if the user has not completed SIWE sign-in. Used by client components
 * to decide whether to show the sign-in prompt.
 */
export async function GET() {
  const session = await getSession();
  return NextResponse.json({ address: session.address ?? null });
}

/**
 * DELETE /api/auth/me
 *
 * Signs out by destroying the session cookie.
 */
export async function DELETE() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
