import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { createAgent } from "@nemesis/db";
import { getTemplateById, getTemplateChain, getTemplateUnavailableReason, isTemplateProductionReady, type TemplateParameter } from "@nemesis/templates";
import { rejectCrossOrigin, requireWalletAuthForChain } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";


function validateParameters(
  templateParameters: TemplateParameter[],
  input: Record<string, string | number | boolean> | undefined,
): { ok: true; parameters: Record<string, string | number | boolean> } | { ok: false; error: string } {
  const raw = input ?? {};
  const allowed = new Set(templateParameters.map((param) => param.key));

  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return { ok: false, error: `Unknown parameter: ${key}` };
    }
  }

  const parameters: Record<string, string | number | boolean> = {};
  for (const param of templateParameters) {
    const value = raw[param.key] ?? param.default;

    if (param.type === "boolean") {
      if (typeof value !== "boolean") return { ok: false, error: `${param.key} must be a boolean.` };
      parameters[param.key] = value;
      continue;
    }

    if (param.type === "select") {
      if (typeof value !== "string" || !param.options?.includes(value)) {
        return { ok: false, error: `${param.key} must be one of: ${param.options?.join(", ") ?? ""}.` };
      }
      parameters[param.key] = value;
      continue;
    }

    if (param.type === "address") {
      if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
        return { ok: false, error: `${param.key} must be a valid EVM address.` };
      }
      parameters[param.key] = value;
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return { ok: false, error: `${param.key} must be a non-negative finite number.` };
    }
    if ((param.type === "percent" && value > 10_000) || (param.type === "currency" && value > 10_000_000)) {
      return { ok: false, error: `${param.key} is outside the allowed safety range.` };
    }
    parameters[param.key] = value;
  }

  return { ok: true, parameters };
}

/**
 * POST /api/agents
 *
 * Creates a new agent for the authenticated wallet. The route validates the
 * template first, then authenticates against that template's chain so dual
 * Base/Solana sessions deploy to the intended wallet.
 *
 * Body: { templateId: string; name?: string; parameters?: Record<string, unknown> }
 */
export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;


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

  if (!isTemplateProductionReady(template)) {
    return NextResponse.json(
      { error: getTemplateUnavailableReason(template) },
      { status: 409 },
    );
  }

  const templateChain = getTemplateChain(template);
  const auth = await requireWalletAuthForChain(templateChain);
  if (auth.error) return auth.error;

  const rateLimit = enforceRateLimit({ key: rateLimitKey(request, "agents:create", auth.wallet.walletKey), limit: 20, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  // Use provided name or auto-generate from template.
  const name = (body?.name?.trim()) || `${template.name} #${randomUUID().slice(0, 4).toUpperCase()}`;
  if (name.length > 80) {
    return NextResponse.json({ error: "`name` must be 80 characters or less." }, { status: 400 });
  }

  const validated = validateParameters(template.parameters, parameters);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const agent = await createAgent({
    walletAddress: auth.wallet.walletKey,
    templateId,
    name,
    parameters: validated.parameters,
  });

  revalidatePath("/dashboard");

  return NextResponse.json({ agent }, { status: 201 });
}
