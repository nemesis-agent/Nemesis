import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { createAgent } from "@nemesis/db";
import { getTemplateById } from "@nemesis/templates";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/agents
 *
 * Creates a new agent for the authenticated wallet. This is the Phase 1
 * replacement for the DeployChat simulation — instead of a setTimeout,
 * the "Approve & deploy" button now calls this endpoint, which:
 *   1. Verifies the session (SIWE) — 401 if not signed in.
 *   2. Validates the template ID is a real template.
 *   3. Writes the agent to the database.
 *   4. Returns the created agent so the client can redirect to /agents/[id].
 *
 * Body: { templateId: string; name?: string; parameters?: Record<string, unknown> }
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: { templateId?: string; name?: string; parameters?: Record<string, string | number | boolean> } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { templateId, parameters } = body ?? {};

  if (!templateId || typeof templateId !== "string") {
    return NextResponse.json({ error: "`templateId` is required." }, { status: 400 });
  }

  const template = getTemplateById(templateId);
  if (!template) {
    return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 400 });
  }

  // Use provided name or auto-generate from template.
  const name = (body?.name?.trim()) || `${template.name} #${randomUUID().slice(0, 4).toUpperCase()}`;

  const agent = await createAgent({
    walletAddress: auth.address,
    templateId,
    name,
    parameters: parameters ?? {},
  });

  revalidatePath("/dashboard");

  return NextResponse.json({ agent }, { status: 201 });
}
