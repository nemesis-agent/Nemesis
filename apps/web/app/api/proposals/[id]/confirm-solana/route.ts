import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Connection, VersionedTransactionResponse } from "@solana/web3.js";

import { rejectCrossOrigin, requireSolanaAuth, walletOwnsAgent } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { approveProposal, getAgent, getProposal } from "@nemesis/db";
import { executionWindowContainsTimestamp, validateSolanaExecutionPayload } from "@nemesis/execution";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

function isBase58Signature(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(value);
}

function transactionMessageHash(tx: VersionedTransactionResponse): string {
  return createHash("sha256").update(Buffer.from(tx.transaction.message.serialize())).digest("hex");
}

function transactionIncludesSigner(tx: VersionedTransactionResponse, publicKey: string): boolean {
  const staticKeys = tx.transaction.message.staticAccountKeys ?? [];
  return staticKeys.some((key) => key.toBase58() === publicKey);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: proposalId } = await params;
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const auth = await requireSolanaAuth();
  if (auth.error) return auth.error;

  const rateLimit = await enforceRateLimit({ key: rateLimitKey(request, "proposals:confirm-solana", auth.wallet.walletKey), limit: 10, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  let body: { signature?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const signature = body?.signature;
  if (!signature || !isBase58Signature(signature)) {
    return NextResponse.json({ error: "Valid Solana signature is required." }, { status: 400 });
  }

  const proposal = await getProposal(proposalId);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  if (proposal.status === "skipped" || (proposal.status === "approved" && proposal.txHash)) {
    return NextResponse.json({ error: `Proposal already processed (status: ${proposal.status}).` }, { status: 400 });
  }

  const agent = await getAgent(proposal.agentId);
  if (!agent || !walletOwnsAgent(auth.wallet, agent.walletAddress)) {
    return NextResponse.json({ error: "Unauthorized. You do not own this agent." }, { status: 403 });
  }

  if (!proposal.unsignedTxPayload) {
    return NextResponse.json({ error: "Proposal has no executable Solana payload." }, { status: 400 });
  }

  const payloadValidation = validateSolanaExecutionPayload(
    proposal.unsignedTxPayload,
    auth.wallet.solanaAddress,
  );
  if (!payloadValidation.ok) {
    return NextResponse.json({ error: payloadValidation.error }, { status: 400 });
  }
  const payload = payloadValidation.value;
  const status = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
  const signatureStatus = status.value[0];
  if (!signatureStatus || signatureStatus.err) {
    return NextResponse.json({ error: "Solana transaction is not confirmed successfully yet." }, { status: 425 });
  }

  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    return NextResponse.json({ error: "Confirmed Solana transaction could not be loaded yet." }, { status: 425 });
  }

  if (tx.meta?.err) {
    return NextResponse.json({ error: "Solana transaction failed on-chain." }, { status: 400 });
  }

  if (typeof tx.blockTime !== "number") {
    return NextResponse.json({ error: "Confirmed Solana transaction timestamp could not be loaded yet." }, { status: 425 });
  }

  const timingValidation = executionWindowContainsTimestamp(payload, tx.blockTime * 1000);
  if (!timingValidation.ok) {
    return NextResponse.json({ error: timingValidation.error }, { status: 400 });
  }

  if (!transactionIncludesSigner(tx, auth.wallet.solanaAddress)) {
    return NextResponse.json({ error: "Solana transaction signer does not match authenticated wallet." }, { status: 403 });
  }

  if (transactionMessageHash(tx) !== payload.messageHash) {
    return NextResponse.json({ error: "Solana transaction does not match the approved proposal payload." }, { status: 400 });
  }

  const updated = await approveProposal(proposalId, signature);
  if (!updated) {
    return NextResponse.json({ error: "Failed to update database." }, { status: 500 });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/agents/${agent.id}`);

  return NextResponse.json({ success: true, proposal: updated });
}
