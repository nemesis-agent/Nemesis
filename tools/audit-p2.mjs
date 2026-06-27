import { readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

check("telegram help command is registered and discoverable", () => {
  const index = read("apps/telegram-bot/src/index.ts");
  const help = read("apps/telegram-bot/src/commands/help.ts");
  const start = read("apps/telegram-bot/src/commands/start.ts");
  assert(index.includes('import { helpCommand } from "./commands/help.js";'), "help command import missing");
  assert(index.includes('bot.command("help", helpCommand);'), "help command registration missing");
  assert(help.includes("helpCommand"), "help command handler missing");
  assert(help.includes("NEMESIS never signs or broadcasts without you"), "help command must state approval-first behavior");
  assert((start.match(/\/help - show command guide/g) ?? []).length >= 2, "start copy must expose /help for linked and unlinked users");
});

check("telegram bot-facing source is ascii-safe", () => {
  const files = [
    "apps/telegram-bot/src/commands/agents.ts",
    "apps/telegram-bot/src/commands/help.ts",
    "apps/telegram-bot/src/commands/link.ts",
    "apps/telegram-bot/src/commands/pause.ts",
    "apps/telegram-bot/src/commands/start.ts",
    "apps/telegram-bot/src/commands/status.ts",
    "apps/telegram-bot/src/lib/auth.ts",
    "apps/telegram-bot/src/lib/format.ts",
  ];
  for (const file of files) {
    assert(!/[^\x00-\x7F]/.test(read(file)), `${file} contains non-ASCII bot-facing text`);
  }
});

check("solana proposal confirmation supports retrying pending signatures", () => {
  const execute = read("apps/web/components/ExecuteProposalButton.tsx");
  assert(execute.includes("solanaPendingSignature"), "Solana pending signature state missing");
  assert(execute.includes("response.status === 425"), "Solana 425 pending confirmation handling missing");
  assert(execute.includes("Retry Solana verification"), "Solana retry button label missing");
  assert(execute.includes("await confirmSolanaSignature(signature)"), "Initial Solana submit must use retry-aware confirmation helper");
  assert((execute.match(/confirm-solana/g) ?? []).length === 1, "Solana confirm endpoint should be called from one helper only");
});

check("production smoke covers every template detail route", () => {
  const smoke = read("tools/smoke-production.mjs");
  assert(smoke.includes("function templateIds()"), "smoke must discover template IDs");
  assert(smoke.includes("...templateIds().map"), "smoke must include all template detail routes");
  assert(smoke.includes("All ${checks.length} smoke checks passed"), "smoke should report dynamic check count");
});

check("P2 docs and runbook are synchronized", () => {
  const runbook = read("docs/OPS_RUNBOOK.md");
  const p2 = read("docs/P2_HARDENING_CHECKLIST.md");
  assert(runbook.includes("every template detail route return 200"), "runbook smoke description must mention every template route");
  assert(runbook.includes("## P2 Manual QA"), "runbook missing P2 manual QA section");
  assert(p2.includes("npm run audit:p2"), "P2 checklist must document audit:p2");
  assert(p2.includes("Solana retry"), "P2 checklist must document Solana retry behavior");
});

check("package scripts expose P1 and P2 gates", () => {
  const pkg = JSON.parse(read("package.json"));
  assert(pkg.scripts?.["audit:p1"] === "node tools/audit-p1.mjs", "audit:p1 script missing");
  assert(pkg.scripts?.["audit:p2"] === "node tools/audit-p2.mjs", "audit:p2 script missing");
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
  console.error(`${failed} P2 audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} P2 audit checks passed`);