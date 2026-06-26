import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { NextResponse } from "next/server";
import nacl from "tweetnacl";

import { expectedRequestOrigin, getSession, rejectCrossOrigin } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";

const SOLANA_MESSAGE_PREFIX = "Sign in to NEMESIS with Solana.";

type SolanaVerifyBody = {
  address?: string;
  message?: string;
  signature?: string;
  encoding?: "base64" | "base58";
};

function parseSignature(signature: string, encoding: "base64" | "base58" = "base64"): Uint8Array {
  return encoding === "base58"
    ? bs58.decode(signature)
    : Uint8Array.from(Buffer.from(signature, "base64"));
}

function getMessageField(message: string, label: string): string | null {
  const prefix = `${label}: `;
  const line = message.split("\n").find((entry) => entry.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : null;
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const rateLimit = enforceRateLimit({ key: rateLimitKey(request, "auth:solana:verify"), limit: 12, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const session = await getSession();

  let body: SolanaVerifyBody | null = null;
  try {
    body = (await request.json()) as SolanaVerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { address, message, signature, encoding } = body ?? {};
  if (!address || !message || !signature) {
    return NextResponse.json({ error: "address, message, and signature are required." }, { status: 400 });
  }

  if (!session.solanaNonce) {
    return NextResponse.json({ error: "No Solana nonce found in session. Request a new nonce first." }, { status: 422 });
  }

  const expected = expectedRequestOrigin(request);
  const nonce = session.solanaNonce;
  session.solanaNonce = undefined;

  try {
    const publicKey = new PublicKey(address);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = parseSignature(signature, encoding);

    const validShape =
      message.startsWith(SOLANA_MESSAGE_PREFIX) &&
      getMessageField(message, "Domain") === expected.domain &&
      getMessageField(message, "Address") === publicKey.toBase58() &&
      getMessageField(message, "URI") === expected.origin &&
      getMessageField(message, "Version") === "1" &&
      getMessageField(message, "Chain") === "solana:mainnet" &&
      getMessageField(message, "Nonce") === nonce;

    const validSignature = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());

    if (!validShape || !validSignature) {
      await session.save();
      return NextResponse.json({ error: "Solana signature verification failed." }, { status: 422 });
    }

    session.solanaAddress = publicKey.toBase58();
    await session.save();
    return NextResponse.json({ solanaAddress: session.solanaAddress });
  } catch {
    await session.save();
    return NextResponse.json({ error: "Invalid Solana address or signature." }, { status: 422 });
  }
}
