import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAgent, setAgentStatus } from "@nemesis/db";

/**
 * Pauses an agent. Real mutation against the SQLite database — see
 * packages/db. This intentionally stops short of also pausing whatever
 * runtime is actually executing the agent (a real Hermes instance,
 * once one exists) — see ARCHITECTURE.md, "Multi-tenant Hermes
 * deployment" for what that wiring looks like.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const existing = await getAgent(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updated = await setAgentStatus(params.id, "paused");

  revalidatePath(`/agents/${params.id}`);
  revalidatePath("/dashboard");

  return NextResponse.json({ agent: updated });
}
