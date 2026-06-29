import { readFileSync } from "node:fs";

const checks = [];
function check(name, fn) {
  checks.push({ name, fn });
}
function read(path) {
  return readFileSync(path, "utf8");
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const templateSource = read("packages/templates/index.ts");
const templateTypeSource = read("packages/templates/types.ts");
const agentsRoute = read("apps/web/app/api/agents/route.ts");
const deployChat = read("apps/web/components/DeployChat.tsx");
const runner = read("apps/telegram-bot/src/runner.ts");

function parameterBlocks() {
  return [...templateSource.matchAll(/\{\r?\n\s*key:\s*"([^"]+)"[\s\S]*?description:\s*"[^"]+",?\r?\n\s*\}/g)].map((match) => ({
    key: match[1],
    block: match[0],
  }));
}

function numberField(block, field) {
  const match = block.match(new RegExp(`${field}:\\s*([-0-9.]+)`));
  return match ? Number(match[1]) : undefined;
}

function stringField(block, field) {
  return block.match(new RegExp(`${field}:\\s*"([^"]+)"`))?.[1];
}

check("template parameters define explicit numeric safety ranges", () => {
  assert(templateTypeSource.includes("min?: number"), "TemplateParameter must expose min");
  assert(templateTypeSource.includes("max?: number"), "TemplateParameter must expose max");

  for (const { key, block } of parameterBlocks()) {
    const type = stringField(block, "type");
    if (!["number", "percent", "currency"].includes(type ?? "")) continue;

    const min = numberField(block, "min");
    const max = numberField(block, "max");
    const defaultValue = numberField(block, "default");
    assert(Number.isFinite(min), `${key} missing finite min`);
    assert(Number.isFinite(max), `${key} missing finite max`);
    assert(min < max, `${key} min must be below max`);
    assert(defaultValue >= min && defaultValue <= max, `${key} default is outside min/max`);
  }
});

check("agent creation uses shared template validation", () => {
  assert(agentsRoute.includes("validateTemplateParameters"), "agent creation route must call shared validator");
  assert(!agentsRoute.includes("function validateParameters"), "agent creation route must not keep duplicate local validation");
  assert(agentsRoute.includes("Record<string, unknown>"), "agent route should parse untrusted parameters as unknown");
});

check("deploy UI reflects template parameter ranges", () => {
  assert(deployChat.includes("min={param.type === \"address\" ? undefined : param.min}"), "numeric inputs must bind template min");
  assert(deployChat.includes("max={param.type === \"address\" ? undefined : param.max}"), "numeric inputs must bind template max");
  assert(deployChat.includes("fillApprovalSummary(template, pendingParams)"), "approval summary must stay filled with real values");
});

check("runner fails closed on invalid runtime parameters", () => {
  assert(runner.includes("validateRuntimeParameters(agent)"), "runner must validate parameters before evaluation");
  assert(runner.includes("agent_parameter_validation_failed"), "runner must alert on invalid parameters");
  assert(runner.includes("Skipped check: agent parameters need review."), "runner must skip invalid agents safely");
  assert(!runner.includes("validateTemplateParameters } from \"@nemesis/templates\""), "bot must not import source-only template package at runtime");
});

check("runner keeps existing proposal and approval-first guards", () => {
  assert(runner.includes("pending proposal already exists"), "runner must avoid duplicate pending proposals");
  assert(runner.includes("wallet action"), "proposal details must keep wallet-action labels");
  assert(runner.includes("unsignedTxPayload"), "runner must preserve review vs executable proposal payload distinction");
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
  console.error(`${failed} agent quality audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} agent quality audit checks passed`);
