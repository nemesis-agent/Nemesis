import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { type SessionData, SESSION_OPTIONS } from "@/lib/session";

export type AuthenticatedWallet =
  | { chain: "base"; address: `0x${string}`; walletKey: `0x${string}` }
  | { chain: "solana"; solanaAddress: string; walletKey: `solana:${string}` };

/**
 * Returns the current session. Read-only - do not mutate the object
 * unless you call session.save() afterwards.
 */
export async function getSession() {
  return getIronSession<SessionData>(cookies(), SESSION_OPTIONS);
}

/**
 * Returns the authenticated Base wallet address from the session,
 * or a 401 NextResponse if the session is not authenticated with SIWE.
 */
export async function requireAuth(): Promise<
  { address: `0x${string}`; error?: never } | { address?: never; error: NextResponse }
> {
  const session = await getSession();
  if (!session.address) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Sign in with your Base wallet first." },
        { status: 401 },
      ),
    };
  }
  return { address: session.address };
}

export function solanaWalletKey(address: string): `solana:${string}` {
  return `solana:${address}`;
}

export function getSessionWalletKeys(session: SessionData): string[] {
  const keys: string[] = [];
  if (session.address) keys.push(session.address);
  if (session.solanaAddress) keys.push(solanaWalletKey(session.solanaAddress));
  return keys;
}

export function walletOwnsAgent(wallet: AuthenticatedWallet, agentWalletAddress: string): boolean {
  return wallet.walletKey.toLowerCase() === agentWalletAddress.toLowerCase();
}

/**
 * Returns the active authenticated wallet for endpoints that can work with
 * either Base or Solana. If both are signed in, Base remains the default for
 * existing Base routes unless a Solana template explicitly selects Solana.
 */
export async function requireAnyWalletAuth(): Promise<
  { wallet: AuthenticatedWallet; error?: never } | { wallet?: never; error: NextResponse }
> {
  const session = await getSession();
  if (session.address) {
    return { wallet: { chain: "base", address: session.address, walletKey: session.address } };
  }
  if (session.solanaAddress) {
    return { wallet: { chain: "solana", solanaAddress: session.solanaAddress, walletKey: solanaWalletKey(session.solanaAddress) } };
  }
  return {
    error: NextResponse.json(
      { error: "Unauthorized. Sign in with your wallet first." },
      { status: 401 },
    ),
  };
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
