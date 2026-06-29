import { NextResponse } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { createPublicClient, http, formatEther } from "viem";
import { baseChain } from "@/lib/base-chain";

import { requireAnyWalletAuth } from "@/lib/auth";
import { balancePrivacyBucket, redactForLog, redactText } from "@/lib/privacy";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { TEMPLATES, getTemplateChain, isTemplateProductionReady } from "@nemesis/templates";
import { intentSchema } from "@/lib/intent-schema";

const publicClient = createPublicClient({
  chain: baseChain,
  transport: http(),
});

const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const openrouterModel = process.env.OPENROUTER_MODEL ?? "xiaomi/mimo-v2.5";

const openrouter = createOpenRouter({
  apiKey: openrouterApiKey || "missing-openrouter-api-key",
});

type IntentMessageInput = { role: "user" | "agent" | "assistant"; content: string };

function isIntentMessageInput(value: unknown): value is IntentMessageInput {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { role?: unknown; content?: unknown };
  return (maybe.role === "user" || maybe.role === "agent" || maybe.role === "assistant") && typeof maybe.content === "string";
}

export async function POST(request: Request) {
  const auth = await requireAnyWalletAuth();
  if (auth.error) return auth.error;

  const rateLimit = await enforceRateLimit({ key: rateLimitKey(request, "intent", auth.wallet.walletKey), limit: 12, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  let body: { messages?: unknown[] } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!openrouterApiKey) {
    return NextResponse.json({ error: "Master Agent is not configured." }, { status: 503 });
  }

  const { messages } = body ?? {};
  if (!messages || !Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return NextResponse.json({ error: "Messages array is required and must contain 1-20 messages." }, { status: 400 });
  }

  const productionTemplates = TEMPLATES.filter(isTemplateProductionReady);
  if (productionTemplates.length === 0) {
    return NextResponse.json(
      { error: "No production-ready templates are available yet." },
      { status: 503 },
    );
  }

  const safeMessages = messages.map((message) => {
    if (!isIntentMessageInput(message) || message.content.length > 2_000) {
      return null;
    }

    return {
      role: message.role === "agent" ? "assistant" : message.role,
      content: redactText(message.content.trim()),
    } as const;
  });

  if (safeMessages.some((message) => message === null)) {
    return NextResponse.json({ error: "Invalid message format." }, { status: 400 });
  }

  try {
    const balanceBucket = auth.wallet.chain === "base"
      ? balancePrivacyBucket(Number(formatEther(await publicClient.getBalance({ address: auth.wallet.address as `0x${string}` }))))
      : "not connected";

    const templatesContext = productionTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      chain: getTemplateChain(template),
      condition: template.condition,
      action: template.action,
      parameters: template.parameters.map((param) => `${param.key} (${param.type}): ${param.description}`),
    }));

    const systemPrompt = `You are the NEMESIS Master Agent, an approval-first crypto automation assistant for Base and Solana.
The user wants to deploy new automated strategies or modify existing pending ones.

AUTHENTICATED WALLET CHAIN: ${auth.wallet.chain}
USER BASE BALANCE RANGE: ${balanceBucket}

AVAILABLE TEMPLATES:
${JSON.stringify(templatesContext, null, 2)}

Task: Analyze the conversation history. Select only from the production-ready templates above and prefer templates whose chain matches the authenticated wallet chain. Extract the parameters the user specified. You can propose multiple templates only when all selected templates are production-ready. If they didn't specify a parameter, infer a safe default or omit it.`;

    const { object } = await generateObject({
      model: openrouter(openrouterModel),
      schema: intentSchema,
      system: systemPrompt,
      messages: safeMessages as Array<{ role: "user" | "assistant"; content: string }>,
    });

    const productionTemplateIds = new Set(productionTemplates.map((template) => template.id));
    const hasUnsupportedPlan = object.plans.some((plan) => !productionTemplateIds.has(plan.templateId));
    if (hasUnsupportedPlan) {
      return NextResponse.json(
        { error: "Master Agent returned a template that is not production-ready." },
        { status: 502 },
      );
    }

    return NextResponse.json({ intent: object }, { status: 200 });
  } catch (error: any) {
    console.error("[Master Agent] Inference Error:", redactForLog(error));
    return NextResponse.json(
      { error: "Failed to process intent. The AI model may be unavailable." },
      { status: 500 },
    );
  }
}
