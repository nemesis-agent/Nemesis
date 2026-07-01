import { readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const deployPage = read("apps/web/app/agents/new/page.tsx");
const deployChat = read("apps/web/components/DeployChat.tsx");
const riskModal = read("apps/web/components/RiskAcknowledgmentModal.tsx");

check("deploy page explains the approval-first review path before chat", () => {
  for (const text of [
    "agent deployment console",
    "deploy checklist",
    "connect the wallet that will own the agent",
    "review exact condition, action, and parameters",
    "acknowledge high/degen templates before deploy",
    "proposals still wait for your wallet signature",
    "selected template context",
  ]) {
    assert(deployPage.includes(text), `deploy page missing ${text}`);
  }
});

check("deploy page surfaces selected template chain risk and execution context", () => {
  for (const text of [
    "getTemplateChain",
    "getTemplateExecutionCoverage",
    "RISK_LABELS[template.risk]",
    "isTemplateProductionReady",
    "network",
    "risk gate",
    "execution",
  ]) {
    assert(deployPage.includes(text), `deploy selected context missing ${text}`);
  }
});

check("deploy plan card shows filled plan plus final review controls", () => {
  for (const text of [
    "fillApprovalSummary(template, pendingParams)",
    "deploy review path",
    "final checklist",
    "Confirm the filled plan uses the exact parameters you want.",
    "Confirm the wallet and network match the agent you are deploying.",
    "Confirm you understand every proposal still needs wallet approval.",
    "getTemplateExecutionCoverage",
    "RISK_LABELS[template.risk]",
  ]) {
    assert(deployChat.includes(text), `deploy plan card missing ${text}`);
  }
});

check("deploy still fails closed and uses server-side creation only", () => {
  for (const text of [
    "isTemplateProductionReady",
    "getTemplateUnavailableReason",
    "RiskAcknowledgmentModal",
    "/api/agents",
    "credentials: \"include\"",
    "Approve & deploy",
  ]) {
    assert(deployChat.includes(text), `deploy safety flow missing ${text}`);
  }
});

check("risk acknowledgement copy is clean ASCII and explicit", () => {
  assert(riskModal.includes("read before deploying"), "risk modal must keep explicit read-before-deploy copy");
  assert(!riskModal.includes("â"), "risk modal must not contain mojibake characters");
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
  console.error(`${failed} deploy flow polish audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} deploy flow polish audit checks passed`);
