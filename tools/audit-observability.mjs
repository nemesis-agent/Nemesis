import { readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

check("health endpoint exposes public-safe observability fields", () => {
  const health = read("apps/web/app/api/health/route.ts");
  assert(health.includes("deploymentInfo"), "health must expose deployment info");
  assert(health.includes("measureDatabase"), "health must measure database latency");
  assert(health.includes("probeBaseRpc"), "health must probe Base RPC");
  assert(health.includes("probeSolanaRpc"), "health must probe Solana RPC");
  assert(health.includes("pickPublicDetails"), "health must sanitize runtime health details");
  assert(health.includes("Cache-Control"), "health must be no-store");
  assert(!health.includes("TELEGRAM_BOT_TOKEN"), "health must not reference Telegram token");
  assert(!health.includes("OPENROUTER_API_KEY"), "health must not reference OpenRouter key");
});

check("status endpoint aliases health safely", () => {
  const status = read("apps/web/app/api/status/route.ts");
  assert(status.includes("../health/route"), "status route must reuse health implementation");
});

check("telegram lock state is recorded for health", () => {
  const bot = read("apps/telegram-bot/src/index.ts");
  assert(bot.includes("TELEGRAM_HEALTH_KEY"), "bot must define Telegram health key");
  assert(bot.includes("safeRecordTelegramHealth"), "bot must safely record Telegram health");
  assert(bot.includes("TELEGRAM_HEALTH_INTERVAL_MS"), "bot must refresh Telegram health periodically");
  assert(bot.includes("startTelegramHealthHeartbeat()"), "bot must start Telegram health heartbeat after polling starts");
  for (const event of ["telegram_lock_wait", "telegram_lock_acquired", "telegram_polling_running", "telegram_polling_conflict", "telegram_shutdown"]) {
    assert(bot.includes(event), `bot must record ${event}`);
  }
});

check("production smoke validates observability shape", () => {
  const smoke = read("tools/smoke-production.mjs");
  for (const field of ["body.app", "body.database.latencyMs", "body.runner", "body.telegram", "body.rpc?.base", "body.rpc?.solana"]) {
    assert(smoke.includes(field), `smoke must validate ${field}`);
  }
});

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  console.error(`${failed} observability audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} observability audit checks passed`);
