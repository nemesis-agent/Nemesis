import { SiweMessage } from "siwe";
import { NextResponse } from "next/server";

import { expectedRequestOrigin, getSession, rejectCrossOrigin } from "@/lib/auth";

/**
 * POST /api/auth/verify
 *
 * Verifies a signed SIWE message from the frontend. On success,
 * writes the authenticated wallet address into the encrypted session
 * cookie. The nonce is consumed (cleared) to prevent replay attacks.
 *
 * Body: { message: string; signature: string }
 */
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const session = await getSession();

  let body: { message?: string; signature?: string } | null = null;
  try {
    body = (await request.json()) as { message?: string; signature?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { message, signature } = body ?? {};

  if (!message || !signature) {
    return NextResponse.json(
      { error: "Both `message` and `signature` are required." },
      { status: 400 },
    );
  }

  if (!session.nonce) {
    return NextResponse.json(
      { error: "No nonce found in session. Request a new nonce first." },
      { status: 422 },
    );
  }

  // Parse and verify the SIWE message, including nonce/domain matching.
  const siweMessage = new SiweMessage(message);
  const expected = expectedRequestOrigin(request);
  const { data: fields, error } = await siweMessage.verify({
    signature,
    nonce: session.nonce,
    domain: expected.domain,
  });

  if (error || !fields.address || fields.uri !== expected.origin || fields.chainId !== 8453) {
    // Destroy nonce regardless to prevent brute-forcing.
    session.nonce = undefined;
    await session.save();
    return NextResponse.json(
      { error: error?.type ?? "Signature verification failed." },
      { status: 422 },
    );
  }

  // Nonce consumed — persist the authenticated wallet address.
  session.nonce = undefined;
  session.address = fields.address as `0x${string}`;
  await session.save();

  return NextResponse.json({ address: fields.address });
}
