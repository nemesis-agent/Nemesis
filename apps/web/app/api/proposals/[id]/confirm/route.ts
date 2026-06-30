import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createPublicClient, http } from "viem";
import { baseChain } from "@/lib/base-chain";

import { rejectCrossOrigin, requireAnyWalletAuth, walletOwnsAgent } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { redactForLog } from "@/lib/privacy";
import { approveProposal, getProposal, getAgent, recordProposalExecutionStep } from "@nemesis/db";
import { validateBaseExecutionPayload } from "@nemesis/execution";

const publicClient = createPublicClient({
  chain: baseChain,
  transport: http(),
});

function getCompletedStepHashes(executionState: Record<string, unknown>): string[] {
  const hashes = executionState.completedTxHashes;
  return Array.isArray(hashes) ? hashes.filter((hash): hash is string => typeof hash === "string") : [];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const auth = await requireAnyWalletAuth();
  if (auth.error) return auth.error;

  const rateLimit = await enforceRateLimit({ key: rateLimitKey(request, "proposals:confirm", auth.wallet.walletKey), limit: 10, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  if (!proposalId) {
    return NextResponse.json({ error: "Proposal ID is required." }, { status: 400 });
  }

  let body: { txHash?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { txHash } = body ?? {};
  if (!txHash || !txHash.startsWith("0x")) {
    return NextResponse.json({ error: "Valid txHash is required." }, { status: 400 });
  }

  try {
    // 1. Verify Proposal Ownership
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

    // 2. Viem Server-Side Verification (Quant Grade Security)
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      confirmations: 1, // Require 1 confirmation. For strict reorg protection, increase this.
    });

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction reverted on-chain." }, { status: 400 });
    }

    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });

    // Anti-spoofing: ensure signer and transaction payload match this proposal.
    if (auth.wallet.chain !== "base" || tx.from.toLowerCase() !== auth.wallet.address.toLowerCase()) {
      return NextResponse.json({ error: "Transaction signer does not match authenticated wallet." }, { status: 403 });
    }

    if (!proposal.unsignedTxPayload) {
      return NextResponse.json({ error: "Proposal has no executable transaction payload." }, { status: 400 });
    }

    if (auth.wallet.chain !== "base") {
      return NextResponse.json({ error: "Base wallet authentication is required." }, { status: 403 });
    }

    const payloadValidation = validateBaseExecutionPayload(
      proposal.unsignedTxPayload,
      auth.wallet.address,
    );
    if (!payloadValidation.ok) {
      return NextResponse.json({ error: payloadValidation.error }, { status: 400 });
    }
    const steps = payloadValidation.value.steps;
    const completedTxHashes = getCompletedStepHashes(proposal.executionState);
    const expectedPayload = steps[completedTxHashes.length];
    if (!expectedPayload) {
      return NextResponse.json({ error: "All proposal steps are already confirmed." }, { status: 400 });
    }

    if (expectedPayload.chainId !== 8453) {
      return NextResponse.json({ error: "Unexpected transaction chain." }, { status: 400 });
    }

    const expectedTo = expectedPayload.to?.toLowerCase();
    const actualTo = tx.to?.toLowerCase();
    const expectedData = expectedPayload.data ?? "0x";
    const expectedValue = BigInt(expectedPayload.value ?? "0");

    if (!expectedTo || expectedTo !== actualTo || expectedData.toLowerCase() !== tx.input.toLowerCase() || expectedValue !== tx.value) {
      return NextResponse.json({ error: "Transaction does not match the approved proposal payload." }, { status: 400 });
    }

    // 3. Update Database
    const nextCompletedTxHashes = [...completedTxHashes, txHash];
    const complete = nextCompletedTxHashes.length >= steps.length;
    const updated = steps.length === 1
      ? await approveProposal(proposalId, txHash)
      : await recordProposalExecutionStep(
          proposalId,
          { completedTxHashes: nextCompletedTxHashes, completedSteps: nextCompletedTxHashes.length },
          txHash,
          complete,
          completedTxHashes.length,
        );
    if (!updated) {
      return NextResponse.json({ error: "Failed to update database." }, { status: 500 });
    }

    revalidatePath("/dashboard");
    revalidatePath(`/agents/${agent.id}`);

    return NextResponse.json({ success: true, proposal: updated }, { status: 200 });
  } catch (error: any) {
    console.error(`[Proposal Confirm] Base verification failed for ${txHash.slice(0, 10)}...${txHash.slice(-6)}:`, redactForLog(error));
    return NextResponse.json(
      { error: "Failed to verify transaction receipt. It may not be mined yet." },
      { status: 500 }
    );
  }
}
