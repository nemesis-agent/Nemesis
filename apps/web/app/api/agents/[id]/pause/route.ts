import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAgent, setAgentStatus } from "@nemesis/db";
import { requireAuth } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  // 1. Auth check — must be signed in.
  const auth = await requireAuth();
  if (auth.error) return auth.error;

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
