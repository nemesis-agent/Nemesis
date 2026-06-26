import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAgent, setAgentStatus } from "@nemesis/db";
import { rejectCrossOrigin, requireAnyWalletAuth, walletOwnsAgent } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const auth = await requireAnyWalletAuth();
  if (auth.error) return auth.error;

  const rateLimit = enforceRateLimit({ key: rateLimitKey(request, "agents:pause", auth.wallet.walletKey), limit: 30, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const existing = await getAgent(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (!walletOwnsAgent(auth.wallet, existing.walletAddress)) {
    return NextResponse.json({ error: "Forbidden. You do not own this agent." }, { status: 403 });
  }

  const updated = await setAgentStatus(params.id, "paused");

  revalidatePath(`/agents/${params.id}`);
  revalidatePath("/dashboard");

  return NextResponse.json({ agent: updated });
}
