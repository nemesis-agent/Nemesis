import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAgent, setAgentStatus } from "@nemesis/db";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const existing = await getAgent(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updated = await setAgentStatus(params.id, "active");

  revalidatePath(`/agents/${params.id}`);
  revalidatePath("/dashboard");

  return NextResponse.json({ agent: updated });
}
