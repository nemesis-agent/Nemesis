import { readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const dashboard = read("apps/web/app/dashboard/page.tsx");
const agentDetail = read("apps/web/app/agents/[id]/page.tsx");
const agentCard = read("apps/web/components/AgentCard.tsx");
const telegramFormat = read("apps/telegram-bot/src/lib/format.ts");
const telegramUi = read("apps/telegram-bot/src/lib/ui.ts");
const approval = read("apps/telegram-bot/src/handlers/approval.ts");

check("agent dashboard exposes wallet-private command center without raw proposal payloads", () => {
  for (const text of [
    "agent dashboard command center",
    "getDashboardProposalSummary",
    "pending proposal queue",
    "wallet private",
    "Counts are aggregated",
    "INNER JOIN agents a ON a.id = p.agent_id",
  ]) {
    assert(dashboard.includes(text), `dashboard missing ${text}`);
  }
  assert(!dashboard.includes("unsigned_tx_payload"), "dashboard overview must not query raw proposal payloads");
  assert(!dashboard.includes("p.details"), "dashboard overview must not query proposal details");
});

check("agent detail exposes operational brief and proposal queue split", () => {
  for (const text of [
    "agent operational brief",
    "wallet-private view",
    "getTemplateExecutionCoverage",
    "summarizeExecutionPayload",
    "executablePendingCount",
    "reviewOnlyPendingCount",
    "wallet scoped",
    "sign / {reviewOnlyPendingCount} review",
  ]) {
    assert(agentDetail.includes(text), `agent detail missing ${text}`);
  }
});

check("agent cards are ascii-clean and keep dashboard/template navigation", () => {
  assert(agentCard.includes("view agent ->"), "agent card must use clean ASCII agent CTA");
  assert(agentCard.includes("view template ->"), "agent card must use clean ASCII template CTA");
  assert(!/[^\x00-\x7F]/.test(agentCard), "agent card contains non-ASCII copy");
});

check("Telegram proposal phase 2 message includes review path, execution window, and approval boundary", () => {
  for (const text of [
    "review path",
    "1 observed",
    "2 proposal",
    "3 approval",
    "execution window",
    "approval boundary",
    "payload ttl",
    "created",
    "agents propose. users approve. wallets sign.",
  ]) {
    assert(telegramFormat.includes(text), `telegram formatter missing ${text}`);
  }
  assert(!/[^\x00-\x7F]/.test(telegramFormat), "telegram formatter contains non-ASCII copy");
});

check("Telegram proposal keyboard differentiates wallet-signable and review-only proposals", () => {
  for (const text of [
    "summarizeExecutionPayload",
    "open wallet review",
    "open proposal review",
    "mark reviewed",
    "acknowledge review",
    "open in dashboard",
  ]) {
    assert(telegramUi.includes(text), `telegram keyboard missing ${text}`);
  }
});

check("Telegram acknowledge callback returns dashboard review receipt", () => {
  for (const text of [
    "NEMESIS / WALLET REVIEW",
    "NEMESIS / PROPOSAL REVIEW",
    "dashboard wallet preview required",
    "open dashboard review",
    "NEMESIS never signs or broadcasts from the server",
  ]) {
    assert(approval.includes(text), `approval handler missing ${text}`);
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
  console.error(`${failed} dashboard/Telegram phase 2 audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} dashboard/Telegram phase 2 audit checks passed`);
