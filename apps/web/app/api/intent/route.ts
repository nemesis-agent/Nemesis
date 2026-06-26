import { NextResponse } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { createPublicClient, http, formatEther } from "viem";
import { baseChain } from "@/lib/base-chain";

import { requireAuth } from "@/lib/auth";
import { enforceRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { TEMPLATES, isTemplateProductionReady } from "@nemesis/templates";
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

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const rateLimit = enforceRateLimit({ key: rateLimitKey(request, "intent", auth.address), limit: 12, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  let body: { messages?: any[] } | null = null;
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
    if (
      !message ||
      (message.role !== "user" && message.role !== "agent" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      message.content.length > 2_000
    ) {
      return null;
    }

    return {
      role: message.role === "agent" ? "assistant" : message.role,
      content: message.content,
    } as const;
  });

  if (safeMessages.some((message) => message === null)) {
    return NextResponse.json({ error: "Invalid message format." }, { status: 400 });
  }

  try {
    // 1. Context Gathering (Quant-Grade Viem Balance Check)
    const rawBalance = await publicClient.getBalance({ address: auth.address as `0x${string}` });
    const ethBalance = formatEther(rawBalance);

    // 2. Format Available Templates for the LLM
    const templatesContext = productionTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      condition: t.condition,
      action: t.action,
      parameters: t.parameters.map((p) => `${p.key} (${p.type}): ${p.description}`),
    }));

    // 3. System Prompt setup
    const systemPrompt = `You are the NEMESIS Master Agent, a Quant-Grade crypto trading assistant on the Base network.
The user wants to deploy new automated strategies or modify existing pending ones.

USER'S BASE ETH BALANCE: ${ethBalance} ETH

AVAILABLE TEMPLATES:
${JSON.stringify(templatesContext, null, 2)}

Task: Analyze the conversation history. Select only from the production-ready templates above and extract the parameters the user specified. You can propose multiple templates only when all selected templates are production-ready. If they didn't specify a parameter, infer a safe default or omit it.`;

    // 4. Master Agent Inference (Structured JSON)
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
    console.error("[Master Agent] Inference Error:", error);
    return NextResponse.json(
      { error: "Failed to process intent. The AI model may be unavailable." },
      { status: 500 }
    );
  }
}
