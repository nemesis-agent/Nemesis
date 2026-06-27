import { readFileSync } from "node:fs";

const baseUrl = process.env.NEMESIS_SMOKE_URL ?? "https://nemesis-agent.xyz";
const origin = new URL(baseUrl).origin;
const checks = [];

function check(name, fn) {
  checks.push({ name, fn });
}

async function expectStatus(path, expected, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (response.status !== expected) {
    throw new Error(`${path} returned ${response.status}, expected ${expected}`);
  }
  return response;
}

check("health endpoint is healthy and database-connected", async () => {
  const response = await expectStatus("/api/health", 200);
  const body = await response.json();
  if (body.status !== "healthy" || body.database !== "connected") {
    throw new Error(`health body is not healthy: ${JSON.stringify(body)}`);
  }
});

for (const path of ["/", "/templates", "/terms", "/privacy", "/templates/ape-agent"]) {
  check(`${path} returns 200`, async () => {
    await expectStatus(path, 200);
  });
}

for (const path of ["/api/agents", "/api/intent", "/api/link/generate"]) {
  check(`${path} rejects unauthenticated POST`, async () => {
    await expectStatus(path, 401, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({}),
    });
  });
}

check("auth nonce returns nonce", async () => {
  const response = await expectStatus("/api/auth/nonce", 200);
  const body = await response.json();
  if (typeof body.nonce !== "string" || body.nonce.length < 8) {
    throw new Error("nonce response did not include a usable nonce");
  }
});

check("sensitive routes include rate limit enforcement", () => {
  const files = [
    ["apps/web/app/api/auth/nonce/route.ts", "auth:nonce"],
    ["apps/web/app/api/auth/verify/route.ts", "auth:verify"],
    ["apps/web/app/api/intent/route.ts", "intent"],
    ["apps/web/app/api/agents/route.ts", "agents:create"],
    ["apps/web/app/api/link/generate/route.ts", "link:generate"],
    ["apps/web/app/api/agents/[id]/pause/route.ts", "agents:pause"],
    ["apps/web/app/api/agents/[id]/resume/route.ts", "agents:resume"],
    ["apps/web/app/api/proposals/[id]/confirm/route.ts", "proposals:confirm"],
    ["apps/web/app/api/proposals/[id]/confirm-solana/route.ts", "proposals:confirm-solana"],
  ];

  for (const [file, scope] of files) {
    const content = readFileSync(file, "utf8");
    if (!content.includes("enforceRateLimit") || !content.includes(scope)) {
      throw new Error(`${file} is missing rate limit scope ${scope}`);
    }
  }
});

check("review-only template boundaries are explicit", () => {
  const runner = readFileSync("apps/telegram-bot/src/runner.ts", "utf8");
  for (const fn of ["evaluateApeAgent", "evaluatePoolSniper", "evaluateAutoCompound", "evaluateAirdropFarmer"]) {
    const start = runner.indexOf(`async function ${fn}`);
    if (start === -1) throw new Error(`${fn} not found`);
    const next = runner.indexOf("async function", start + 1);
    const block = runner.slice(start, next === -1 ? undefined : next);
    if (!block.includes('value: "review only"') && !block.includes('title: "Weekly interaction review due"')) {
      throw new Error(`${fn} does not make review-only behavior explicit`);
    }
    if (block.includes("unsignedTxPayload")) {
      throw new Error(`${fn} should not generate arbitrary executable calldata yet`);
    }
  }
});


check("chain-aware deploy and Telegram linking are enforced", () => {
  const agentsRoute = readFileSync("apps/web/app/api/agents/route.ts", "utf8");
  if (!agentsRoute.includes("requireWalletAuthForChain(templateChain)")) {
    throw new Error("agent creation must authenticate against the selected template chain");
  }

  const linkRoute = readFileSync("apps/web/app/api/link/generate/route.ts", "utf8");
  if (!linkRoute.includes("requestedChain") || !linkRoute.includes("requireWalletAuthForChain(chain)")) {
    throw new Error("Telegram link generation must accept an explicit Base/Solana chain");
  }

  const telegramCard = readFileSync("apps/web/components/ConnectTelegramCard.tsx", "utf8");
  if (!telegramCard.includes("Generate ${chain} code") || !telegramCard.includes("JSON.stringify({ chain })")) {
    throw new Error("Telegram link UI must let dual-wallet users generate a Solana-specific code");
  }
});

check("Solana profit taker can prepare a guarded Jupiter sell", () => {
  const jupiter = readFileSync("apps/telegram-bot/src/lib/jupiter-solana.ts", "utf8");
  if (!jupiter.includes("buildSolanaSolToUsdcSwapPayload") || !jupiter.includes("SOL_MINT") || !jupiter.includes("USDC_MINT")) {
    throw new Error("Solana SOL -> USDC Jupiter payload builder is missing");
  }

  const runner = readFileSync("apps/telegram-bot/src/runner.ts", "utf8");
  if (!runner.includes("MIN_SOL_RESERVE_LAMPORTS") || !runner.includes("buildSolanaSolToUsdcSwapPayload")) {
    throw new Error("Solana profit taker must keep a SOL reserve and prepare Jupiter sell payloads");
  }
});
let failed = 0;
for (const item of checks) {
  try {
    await item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  console.error(`${failed} smoke check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} smoke checks passed for ${baseUrl}`);