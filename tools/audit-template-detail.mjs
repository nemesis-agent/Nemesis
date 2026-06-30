import { readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const templatePage = read("apps/web/app/templates/[id]/page.tsx");
const simulation = read("apps/web/components/SimulationView.tsx");

check("template detail exposes production safety and approval context", () => {
  for (const text of ["safety rails", "one condition, one proposed action", "no custody and no private keys", "nothing signs without wallet approval", "review before deploy"]) {
    assert(templatePage.includes(text), `template page missing ${text}`);
  }
  assert(templatePage.includes("wallet-signed"), "template page must state wallet-signed approval model");
});

check("template detail renders proposal preview and explainability before deploy", () => {
  assert(templatePage.includes("<SimulationView template={template} />"), "template page must pass template into proposal preview");
  assert(templatePage.includes("how proposals are explained"), "template page must include explainability section");
  assert(templatePage.includes("template.explainability.approvalChecklist"), "template page must render approval checklist");
  assert(templatePage.includes("fillApprovalSummary(template)"), "template page must keep filled plan preview");
});

check("proposal preview avoids unsafe performance claims", () => {
  for (const text of ["proposal preview", "example review surface, not a performance claim", "approval-first", "wallet signature required"]) {
    assert(simulation.includes(text), `proposal preview missing ${text}`);
  }
  for (const unsafe of ["Est. APY", "Win Rate", "Run Backtest", "Historical Backtest"]) {
    assert(!simulation.includes(unsafe), `proposal preview must not include ${unsafe}`);
  }
});

check("parameter section shows defaults and server-side validation context", () => {
  assert(templatePage.includes("editable before deploy"), "template page must tell users defaults are editable");
  assert(templatePage.includes("server checked"), "template page must mention server validation");
  assert(templatePage.includes("formatDefaultValue(param.default, param.unit)"), "template defaults must include units consistently");
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
  console.error(`${failed} template detail audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} template detail audit checks passed`);
