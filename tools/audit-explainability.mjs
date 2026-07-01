import { readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const templateTypes = read("packages/templates/types.ts");
const templateIndex = read("packages/templates/index.ts");
const runner = read("apps/telegram-bot/src/runner.ts");
const telegramFormat = read("apps/telegram-bot/src/lib/format.ts");
const proposalRow = read("apps/web/components/ProposalRecordRow.tsx");
const templatePage = read("apps/web/app/templates/[id]/page.tsx");
const agentPage = read("apps/web/app/agents/[id]/page.tsx");

check("template registry exposes explainability metadata", () => {
  for (const field of ["TemplateExplainability", "proposalReason", "decisionRule", "observedFields", "approvalChecklist", "limitation"]) {
    assert(templateTypes.includes(field), `template types missing ${field}`);
  }
  assert(templateIndex.includes("withExplainability"), "template registry must attach explainability to every template");
  assert(templateIndex.includes("defaultObservedFields"), "template registry must derive observed fields from parameters");
  assert(templateIndex.includes("TEMPLATE_DRAFTS.map(withExplainability)"), "exported templates must be explainability-enriched");
});

check("runner stores public-safe proposal decision traces", () => {
  assert(runner.includes("enrichProposalDetails(result, agent)"), "runner must enrich proposals before DB insert");
  for (const label of ["why", "observed", "approval check", "limitation"]) {
    assert(runner.includes(label), `runner must include ${label} detail`);
  }
  assert(!runner.includes("process.env.OPENROUTER_API_KEY"), "proposal explainability must not expose OpenRouter key");
  assert(!runner.includes("TELEGRAM_BOT_TOKEN"), "proposal explainability must not expose bot token");
});

check("dashboard proposal view separates explainability from technical inputs", () => {
  assert(proposalRow.includes("decision trace"), "proposal row must render decision trace");
  assert(proposalRow.includes("technicalDetails"), "proposal row must keep technical details separate");
  assert(proposalRow.includes("observed inputs"), "proposal row must render observed input cards");
  assert(proposalRow.includes("approval checklist"), "proposal row must render approval checklist");
  assert(proposalRow.includes("wallet signature required"), "proposal row must state wallet approval requirement");
});

check("telegram proposal copy includes why, observed inputs, and approval boundary", () => {
  assert(telegramFormat.includes("observed inputs"), "Telegram proposal must show observed inputs");
  assert(telegramFormat.includes("your wallet signature is required"), "Telegram proposal must state approval boundary");
  assert(telegramFormat.includes("EXPLAINABILITY_LABELS"), "Telegram proposal must recognize explainability detail labels");
});

check("template and agent pages show explainability before user approval", () => {
  assert(templatePage.includes("how proposals are explained"), "template page must explain proposal logic");
  assert(templatePage.includes("template.explainability.approvalChecklist"), "template page must show approval checklist");
  assert(agentPage.includes("template.explainability.decisionRule"), "agent page must show decision rule");
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
  console.error(`${failed} explainability audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} explainability audit checks passed`);
