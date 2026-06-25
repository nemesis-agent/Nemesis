import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { type SessionData, SESSION_OPTIONS } from "@/lib/session";

/**
 * Returns the current session. Read-only — do not mutate the object
 * unless you call session.save() afterwards.
 */
export async function getSession() {
  return getIronSession<SessionData>(cookies(), SESSION_OPTIONS);
}

/**
 * Returns the authenticated wallet address from the session,
 * or a 401 NextResponse if the session is not authenticated.
 */
export async function requireAuth(): Promise<
  { address: `0x${string}`; error?: never } | { address?: never; error: NextResponse }
> {
  const session = await getSession();
  if (!session.address) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Sign in with your wallet first." },
        { status: 401 },
      ),
    };
  }
  return { address: session.address };
}

export function expectedRequestOrigin(request: Request): { origin: string; domain: string } {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host") ?? url.host;
  const protocol = forwardedProto ?? url.protocol.replace(":", "");
  return {
    origin: `${protocol}://${host}`,
    domain: host,
  };
}

export function rejectCrossOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const expected = expectedRequestOrigin(request).origin;
  if (origin !== expected) {
    return NextResponse.json({ error: "Forbidden origin." }, { status: 403 });
  }

  return null;
}
