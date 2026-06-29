import { readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

check("bot ops alerts redact sensitive context", () => {
  const alerts = read("apps/telegram-bot/src/lib/alerts.ts");
  const privacy = read("apps/telegram-bot/src/lib/privacy.ts");
  const runner = read("apps/telegram-bot/src/runner.ts");
  assert(alerts.includes("redactForOps(payload)"), "ops alerts must sanitize payload before logging or webhook delivery");
  assert(alerts.includes("...safePayload"), "ops webhook must send sanitized payload only");
  assert(privacy.includes("TELEGRAM_TOKEN_RE"), "bot privacy utility must redact Telegram tokens");
  assert(privacy.includes("SECRET_KEY_RE"), "bot privacy utility must redact API keys");
  assert(runner.includes("maskIdentifier(agent.walletAddress)"), "runner must not log raw wallet addresses for unlinked Telegram state");
});

check("web logs redact model and confirmation errors", () => {
  const webPrivacy = read("apps/web/lib/privacy.ts");
  const chat = read("apps/web/app/api/chat/route.ts");
  const intent = read("apps/web/app/api/intent/route.ts");
  const confirm = read("apps/web/app/api/proposals/[id]/confirm/route.ts");
  assert(webPrivacy.includes("redactForLog"), "web privacy utility must expose log redaction");
  assert(chat.includes("redactForLog(error)"), "public chat errors must be redacted before logging");
  assert(intent.includes("redactForLog(error)"), "intent errors must be redacted before logging");
  assert(confirm.includes("txHash.slice(0, 10)"), "confirmation route must log shortened tx hashes");
});

check("OpenRouter intent prompt avoids exact wallet balances", () => {
  const intent = read("apps/web/app/api/intent/route.ts");
  assert(!intent.includes("USER'S BASE ETH BALANCE"), "intent prompt must not include exact wallet balance label");
  assert(!intent.includes("ethBalance ="), "intent route must not keep exact balance variable for prompt use");
  assert(intent.includes("balancePrivacyBucket"), "intent route must bucket wallet balance before model context");
  assert(intent.includes("redactText(message.content.trim())"), "intent route must redact user message content before model call");
});

check("dashboard card props do not expose full wallet rows", () => {
  const dashboard = read("apps/web/app/dashboard/page.tsx");
  const card = read("apps/web/components/AgentCard.tsx");
  assert(card.includes("walletLabel"), "agent cards must use wallet labels rather than full wallet addresses");
  assert(!card.includes("walletAddress.slice"), "agent card must not slice full wallet addresses client-side");
  assert(dashboard.includes("maskIdentifier(row.wallet_address)"), "dashboard must mask wallet addresses server-side before card props");
  assert(!dashboard.includes("parameters: JSON.parse(row.parameters)"), "dashboard cards must not serialize agent parameters unnecessarily");
  assert(!dashboard.includes("runtimeState:"), "dashboard cards must not serialize runtime state unnecessarily");
});

check("agent creation response is minimized", () => {
  const route = read("apps/web/app/api/agents/route.ts");
  assert(route.includes("{ agent: { id: agent.id, name: agent.name } }"), "agent creation response should return only id and name");
  assert(!route.includes("NextResponse.json({ agent },"), "agent creation route must not return full DB agent row");
});

check("public chat stays natural without weakening secret boundaries", () => {
  const chat = read("apps/web/app/api/chat/route.ts");
  const component = read("apps/web/components/ChatWithNemesis.tsx");
  assert(chat.includes("You can answer general questions naturally"), "public chat should not be limited to NEMESIS-only FAQ mode");
  assert(chat.includes("Refuse requests involving API keys, bot tokens, private keys"), "public chat must keep credential refusal boundary");
  assert(chat.includes("messages.some((message) => SECRET_LIKE_INPUT.test(message.content))"), "public chat must scan the conversation for leaked secrets");
  assert(chat.includes("MAX_MODEL_INPUT_CHARS"), "public chat should trim oversized model context instead of blocking normal long chat");
  assert(chat.includes("fitMessagesForModel(messages)"), "public chat must fit conversation history before calling the model");
  assert(!chat.includes("MAX_MESSAGE_CHARS"), "public chat API must not keep the old per-message character cap");
  assert(component.includes("textarea"), "chat UI should support multi-line natural messages");
  assert(component.includes("SUGGESTED_PROMPTS"), "chat UI should offer starter prompts");
  assert(component.includes("Ask NEMESIS anything"), "chat UI should communicate natural chat behavior");
  assert(!component.includes("maxLength"), "chat UI must not enforce the old 1000-character cap");
});
check("rate limits are shared, atomic, and privacy-preserving", () => {
  const webLimiter = read("apps/web/lib/rate-limit.ts");
  const dbLimiter = read("packages/db/src/rate-limits.ts");
  const migration = read("supabase/migrations/202606300001_rate_limits.sql");
  assert(webLimiter.includes("consumeRateLimit"), "web limiter must use the shared database counter");
  assert(webLimiter.includes('createHash("sha256")'), "rate-limit identities must be hashed before storage");
  assert(!webLimiter.includes("new Map"), "rate limiter must not use process-local counters");
  assert(dbLimiter.includes("ON CONFLICT (key) DO UPDATE"), "database counter must update atomically");
  assert(dbLimiter.includes("cleanupExpiredRateLimits"), "expired rate-limit rows must be cleaned up");
  assert(migration.includes("ENABLE ROW LEVEL SECURITY"), "rate-limit table must enable row-level security");
});
check("link-code retention cleanup is wired", () => {
  const links = read("packages/db/src/links.ts");
  const index = read("packages/db/src/index.ts");
  const runner = read("apps/telegram-bot/src/runner.ts");
  assert(links.includes("pruneExpiredLinkCodes"), "DB link-code pruning helper missing");
  assert(links.includes("DELETE FROM link_codes"), "link-code pruning must delete retained codes");
  assert(index.includes("pruneExpiredLinkCodes"), "link-code pruning helper must be exported");
  assert(runner.includes("pruneExpiredLinkCodes(1)"), "runner must invoke link-code retention cleanup");
});

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log("PASS " + item.name);
  } catch (error) {
    failed += 1;
    console.error("FAIL " + item.name);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  console.error(failed + " privacy audit check(s) failed");
  process.exit(1);
}

console.log("All " + checks.length + " privacy audit checks passed");
