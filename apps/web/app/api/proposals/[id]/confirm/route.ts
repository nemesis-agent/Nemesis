import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

import { requireAuth } from "@/lib/auth";
import { approveProposal, getProposal, getAgent } from "@nemesis/db";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const proposalId = params.id;
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

    if (proposal.status !== "pending") {
      return NextResponse.json({ error: `Proposal already processed (status: ${proposal.status}).` }, { status: 400 });
    }

    const agent = await getAgent(proposal.agentId);
    if (!agent || agent.walletAddress.toLowerCase() !== auth.address.toLowerCase()) {
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

    // Anti-Spoofing: Ensure the signer of the tx matches the SIWE session
    if (receipt.from.toLowerCase() !== auth.address.toLowerCase()) {
      return NextResponse.json({ error: "Transaction signer does not match authenticated wallet." }, { status: 403 });
    }

    // 3. Update Database
    const updated = await approveProposal(proposalId, txHash);
    if (!updated) {
      return NextResponse.json({ error: "Failed to update database." }, { status: 500 });
    }

    revalidatePath("/dashboard");
    revalidatePath(`/agents/${agent.id}`);

    return NextResponse.json({ success: true, proposal: updated }, { status: 200 });
  } catch (error: any) {
    console.error(`[Phase 4] Viem confirmation failed for ${txHash}:`, error);
    return NextResponse.json(
      { error: "Failed to verify transaction receipt. It may not be mined yet." },
      { status: 500 }
    );
  }
}
