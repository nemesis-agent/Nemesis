import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

/**
 * GET /api/auth/me
 *
 * Returns the authenticated wallet identities in the encrypted session.
 */
export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    address: session.address ?? null,
    solanaAddress: session.solanaAddress ?? null,
  });
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
