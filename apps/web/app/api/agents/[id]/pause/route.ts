import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAgent, setAgentStatus } from "@nemesis/db";
import { rejectCrossOrigin, requireAuth } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  // 1. Auth check — must be signed in.
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const rateLimit = enforceRateLimit({ key: rateLimitKey(request, "agents:pause", auth.address), limit: 30, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  // 2. Load the agent.
  const existing = await getAgent(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // 3. Ownership check — only the wallet that owns this agent can pause it.
  if (existing.walletAddress.toLowerCase() !== auth.address.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden. You do not own this agent." }, { status: 403 });
  }

  const updated = await setAgentStatus(params.id, "paused");

  revalidatePath(`/agents/${params.id}`);
  revalidatePath("/dashboard");

  return NextResponse.json({ agent: updated });
}
