import { readFileSync } from "node:fs";

const proposalRow = readFileSync("apps/web/components/ProposalRecordRow.tsx", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const checks = [
  ["proposal row has visual review stages", () => {
    for (const text of ["1 observed", "2 proposal", "3 approval"]) {
      assert(proposalRow.includes(text), `proposal visualization missing ${text}`);
    }
  }],
  ["proposal row exposes execution preview fields", () => {
    for (const text of ["network", "step", "remaining", "ttl", "gas"]) {
      assert(proposalRow.includes(text), `execution preview missing ${text}`);
    }
  }],
  ["proposal row separates observed inputs and decision trace", () => {
    assert(proposalRow.includes("decision trace"), "decision trace panel missing");
    assert(proposalRow.includes("observed inputs"), "observed inputs panel missing");
    assert(proposalRow.includes("priorityDetails"), "priority detail grouping missing");
    assert(proposalRow.includes("secondaryDetails"), "secondary detail grouping missing");
  }],
  ["proposal row keeps approval-first checklist copy", () => {
    assert(proposalRow.includes("approval checklist"), "approval checklist panel missing");
    assert(proposalRow.includes("Confirm network, token, recipient, value, calldata, fee, and route before signing."), "wallet-signable checklist missing exact wallet preview boundary");
    assert(proposalRow.includes("Do not expect a wallet popup for review-only proposals."), "review-only checklist missing");
  }],
  ["proposal row preserves execution policy hooks", () => {
    assert(proposalRow.includes("summarizeExecutionPayload"), "execution summary hook missing");
    assert(proposalRow.includes("ExecuteProposalButton"), "execution button hook missing");
    assert(proposalRow.includes("proposal.status === \"pending\""), "pending-only execution rendering missing");
  }],
];

let failed = 0;
for (const [name, run] of checks) {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  console.error(`${failed} proposal visualization audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} proposal visualization audit checks passed`);
