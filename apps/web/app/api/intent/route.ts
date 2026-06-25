import { NextResponse } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { createPublicClient, http, formatEther } from "viem";
import { base } from "viem/chains";

import { requireAuth } from "@/lib/auth";
import { TEMPLATES } from "@nemesis/templates";
import { intentSchema } from "@/lib/intent-schema";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "sk-dummy-key-for-local-dev",
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: { messages?: any[] } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages } = body ?? {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
  }

  try {
    // 1. Context Gathering (Quant-Grade Viem Balance Check)
    const rawBalance = await publicClient.getBalance({ address: auth.address as `0x${string}` });
    const ethBalance = formatEther(rawBalance);

    // 2. Format Available Templates for the LLM
    const templatesContext = TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      condition: t.condition,
      action: t.action,
      parameters: t.parameters.map((p) => `${p.key} (${p.type}): ${p.description}`),
    }));

    // 3. System Prompt setup
    const systemPrompt = `You are the NEMESIS Master Agent, a Quant-Grade crypto trading assistant on the Base network.
The user wants to deploy new automated strategies or modify existing pending ones.

USER'S ADDRESS: ${auth.address}
USER'S ETH BALANCE: ${ethBalance} ETH

AVAILABLE TEMPLATES:
${JSON.stringify(templatesContext, null, 2)}

Task: Analyze the conversation history. Select the most appropriate template(s) and extract the parameters the user specified. You can propose multiple templates if the user asks for a combined strategy. If they didn't specify a parameter, try to infer a safe default or omit it.`;

    // 4. Master Agent Inference (Structured JSON)
    const { object } = await generateObject({
      model: openrouter("anthropic/claude-3.5-sonnet"), // Using Claude 3.5 Sonnet via OpenRouter for high precision JSON
      schema: intentSchema,
      system: systemPrompt,
      messages: messages,
    });

    return NextResponse.json({ intent: object }, { status: 200 });
  } catch (error: any) {
    console.error("[Master Agent] Inference Error:", error);
    return NextResponse.json(
      { error: "Failed to process intent. The AI model may be unavailable." },
      { status: 500 }
    );
  }
}
