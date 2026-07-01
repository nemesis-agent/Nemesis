import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const checks = [];
const read = (path) => readFileSync(path, "utf8");
const check = (name, fn) => checks.push([name, fn]);

const execution = read("packages/execution/index.ts");
const confirmBase = read("apps/web/app/api/proposals/[id]/confirm/route.ts");
const confirmSolana = read("apps/web/app/api/proposals/[id]/confirm-solana/route.ts");
const tests = read("tests/execution-policy.test.ts");

check("execution package exposes strict confirmation safety helpers", () => {
  assert(execution.includes("EXECUTION_CONFIRMATION_GRACE_MS"), "confirmation grace constant missing");
  assert(execution.includes("isValidEvmTransactionHash"), "strict EVM tx hash validator missing");
  assert(execution.includes("executionWindowContainsTimestamp"), "execution timestamp window validator missing");
  assert(execution.includes("Transaction timestamp is outside the proposal execution window"), "timestamp rejection copy missing");
});

check("Base confirmation rejects malformed, duplicate, replayed, and mismatched execution", () => {
  assert(confirmBase.includes("isValidEvmTransactionHash(txHash)"), "Base confirmation must reject malformed tx hashes");
  assert(confirmBase.includes("receipt.transactionHash.toLowerCase() !== txHash.toLowerCase()"), "Base receipt must match submitted tx hash");
  assert(confirmBase.includes("publicClient.getBlock({ blockNumber: receipt.blockNumber })"), "Base confirmation must load block timestamp");
  assert(confirmBase.includes("executionWindowContainsTimestamp(payloadValidation.value, blockTimestamp)"), "Base confirmation must enforce payload time window");
  assert(confirmBase.includes("completedTxHashes.some((hash) => hash.toLowerCase() === txHash.toLowerCase())"), "Base confirmation must reject duplicate tx hashes");
  assert(confirmBase.includes("recordProposalExecutionStep("), "Base confirmation must record execution state for every step");
  assert(!confirmBase.includes("approveProposal("), "Base confirmation should use execution step CAS state instead of direct approval");
});

check("Solana confirmation rejects failed and replayed execution", () => {
  assert(confirmSolana.includes("tx.meta?.err"), "Solana confirmation must reject failed on-chain transactions");
  assert(confirmSolana.includes("typeof tx.blockTime !== \"number\""), "Solana confirmation must require transaction block time");
  assert(confirmSolana.includes("executionWindowContainsTimestamp(payload, tx.blockTime * 1000)"), "Solana confirmation must enforce payload time window");
  assert(confirmSolana.includes("transactionMessageHash(tx) !== payload.messageHash"), "Solana confirmation must still verify message hash");
});

check("execution safety tests cover strict hash and timestamp policy", () => {
  assert(tests.includes("execution confirmation policy rejects malformed and stale confirmations"), "confirmation safety test missing");
  assert(tests.includes("isValidEvmTransactionHash"), "strict tx hash test missing");
  assert(tests.includes("executionWindowContainsTimestamp"), "timestamp window test missing");
});

let failed = 0;
for (const [name, fn] of checks) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error.message);
  }
}

if (failed > 0) {
  console.error(`${failed} execution safety audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} execution safety audit checks passed`);