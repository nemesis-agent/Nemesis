import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SOLANA_USDC_MINT,
  SOL_MINT,
  executionWindowContainsTimestamp,
  isValidEvmTransactionHash,
  summarizeExecutionPayload,
  validateBaseExecutionPayload,
  validateSolanaExecutionPayload,
} from "../packages/execution/index.ts";
import {
  buildEthToUsdcSwapPayload,
  buildUsdcApproveAndSwapToEthPayload,
} from "../apps/telegram-bot/src/lib/uniswap-base.ts";

const WALLET = "0x1111111111111111111111111111111111111111";
const OTHER_WALLET = "0x2222222222222222222222222222222222222222";
const NOW = Date.parse("2026-07-01T00:00:00.000Z");

test("valid Base buy envelope passes strict policy", () => {
  const payload = buildUsdcApproveAndSwapToEthPayload({
    recipient: WALLET,
    usdcAmount: 100,
    ethUsdPrice: 2_500,
    slippageBps: 100,
  });
  const result = validateBaseExecutionPayload(JSON.stringify(payload), WALLET, Date.parse(payload.createdAt) + 1);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.steps.length, 2);
});

test("valid Base sell envelope passes strict policy", () => {
  const payload = buildEthToUsdcSwapPayload({
    recipient: WALLET,
    ethAmount: "0.1",
    ethUsdPrice: 2_500,
    slippageBps: 100,
  });
  const result = validateBaseExecutionPayload(JSON.stringify(payload), WALLET, Date.parse(payload.createdAt) + 1);
  assert.equal(result.ok, true);
});

test("Base policy rejects wrong recipient", () => {
  const payload = buildEthToUsdcSwapPayload({
    recipient: WALLET,
    ethAmount: "0.1",
    ethUsdPrice: 2_500,
  });
  const result = validateBaseExecutionPayload(JSON.stringify(payload), OTHER_WALLET, Date.parse(payload.createdAt) + 1);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /recipient/i);
});

test("Base policy rejects expired payload", () => {
  const payload = buildEthToUsdcSwapPayload({
    recipient: WALLET,
    ethAmount: "0.1",
    ethUsdPrice: 2_500,
  });
  const result = validateBaseExecutionPayload(JSON.stringify(payload), WALLET, Date.parse(payload.expiresAt) + 1);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /expired|lifetime/i);
});

test("Base policy rejects non-allowlisted target", () => {
  const payload = buildEthToUsdcSwapPayload({
    recipient: WALLET,
    ethAmount: "0.1",
    ethUsdPrice: 2_500,
  });
  payload.steps[0]!.to = OTHER_WALLET;
  const result = validateBaseExecutionPayload(JSON.stringify(payload), WALLET, Date.parse(payload.createdAt) + 1);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /allowlisted/i);
});

test("Base policy rejects approval and swap amount mismatch", () => {
  const payload = buildUsdcApproveAndSwapToEthPayload({
    recipient: WALLET,
    usdcAmount: 100,
    ethUsdPrice: 2_500,
  });
  const secondPayload = buildUsdcApproveAndSwapToEthPayload({
    recipient: WALLET,
    usdcAmount: 101,
    ethUsdPrice: 2_500,
  });
  payload.steps[1] = secondPayload.steps[1]!;
  const result = validateBaseExecutionPayload(JSON.stringify(payload), WALLET, Date.parse(payload.createdAt) + 1);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /exactly match/i);
});

test("execution confirmation policy rejects malformed and stale confirmations", () => {
  const envelope = {
    createdAt: new Date(NOW).toISOString(),
    expiresAt: new Date(NOW + 10 * 60_000).toISOString(),
  };

  assert.equal(isValidEvmTransactionHash(`0x${"a".repeat(64)}`), true);
  assert.equal(isValidEvmTransactionHash("0x1234"), false);
  assert.equal(isValidEvmTransactionHash(`0x${"z".repeat(64)}`), false);
  assert.equal(executionWindowContainsTimestamp(envelope, NOW + 5 * 60_000).ok, true);

  const tooEarly = executionWindowContainsTimestamp(envelope, NOW - 91_000);
  assert.equal(tooEarly.ok, false);
  if (!tooEarly.ok) assert.match(tooEarly.error, /outside/i);

  const tooLate = executionWindowContainsTimestamp(envelope, NOW + 10 * 60_000 + 91_000);
  assert.equal(tooLate.ok, false);
  if (!tooLate.ok) assert.match(tooLate.error, /outside/i);
});

function solanaPayload(overrides: Record<string, unknown> = {}) {
  return {
    kind: "solana-jupiter-swap",
    chain: "solana",
    walletAddress: "11111111111111111111111111111111",
    inputMint: SOLANA_USDC_MINT,
    outputMint: SOL_MINT,
    inputAmount: "1000000",
    expectedOutputAmount: "5000000",
    otherAmountThreshold: "4900000",
    slippageBps: 75,
    serializedTransaction: "A".repeat(64),
    messageHash: "a".repeat(64),
    quoteHash: "b".repeat(64),
    label: "Sign Jupiter swap",
    createdAt: new Date(NOW).toISOString(),
    expiresAt: new Date(NOW + 10 * 60_000).toISOString(),
    ...overrides,
  };
}

test("valid Solana envelope passes policy", () => {
  const payload = solanaPayload();
  assert.equal(validateSolanaExecutionPayload(JSON.stringify(payload), payload.walletAddress, NOW + 1).ok, true);
});

test("Solana policy rejects arbitrary mint and excessive slippage", () => {
  const wrongMint = solanaPayload({ outputMint: "11111111111111111111111111111111" });
  assert.equal(validateSolanaExecutionPayload(JSON.stringify(wrongMint), wrongMint.walletAddress, NOW + 1).ok, false);

  const highSlippage = solanaPayload({ slippageBps: 501 });
  assert.equal(validateSolanaExecutionPayload(JSON.stringify(highSlippage), highSlippage.walletAddress, NOW + 1).ok, false);
});

test("Solana policy rejects expired payload and wrong wallet", () => {
  const payload = solanaPayload();
  assert.equal(validateSolanaExecutionPayload(JSON.stringify(payload), "OtherWallet", NOW + 1).ok, false);
  assert.equal(validateSolanaExecutionPayload(JSON.stringify(payload), payload.walletAddress, NOW + 11 * 60_000).ok, false);
});
test("execution summary exposes step labels and expiry state", () => {
  const payload = buildUsdcApproveAndSwapToEthPayload({
    recipient: WALLET,
    usdcAmount: 100,
    ethUsdPrice: 2_500,
  });

  const firstStep = summarizeExecutionPayload(JSON.stringify(payload), 0, Date.parse(payload.createdAt) + 1);
  assert.equal(firstStep.kind, "base");
  assert.equal(firstStep.executable, true);
  assert.equal(firstStep.actionLabel, "Approve exact USDC amount");
  assert.equal(firstStep.totalSteps, 2);

  const secondStep = summarizeExecutionPayload(JSON.stringify(payload), 1, Date.parse(payload.createdAt) + 1);
  assert.equal(secondStep.actionLabel, "Swap USDC to ETH");

  const expired = summarizeExecutionPayload(JSON.stringify(payload), 0, Date.parse(payload.expiresAt) + 1);
  assert.equal(expired.executable, false);
  assert.equal(expired.expired, true);
});

test("execution summary classifies review-only and Solana payloads", () => {
  const reviewOnly = summarizeExecutionPayload(null, 0, NOW);
  assert.equal(reviewOnly.kind, "review-only");
  assert.equal(reviewOnly.executable, false);

  const payload = solanaPayload();
  const solana = summarizeExecutionPayload(JSON.stringify(payload), 0, NOW + 1);
  assert.equal(solana.kind, "solana");
  assert.equal(solana.networkLabel, "Solana");
  assert.equal(solana.actionLabel, "Sign Jupiter swap");
});
test("template execution coverage matrix is explicit and review-only templates stay bounded", () => {
  const templatesSource = readFileSync("packages/templates/index.ts", "utf8");
  for (const id of [
    "dip-buyer",
    "limit-order",
    "portfolio-rebalancer",
    "profit-taker",
    "solana-dip-buyer",
    "solana-profit-taker",
  ]) {
    assert.match(templatesSource, new RegExp(`"${id}"`), `${id} must be listed as wallet-signable`);
  }
  assert.match(templatesSource, /getTemplateExecutionCoverage/, "coverage helper must be exported");
  assert.match(templatesSource, /Review-only proposal/, "review-only fallback must stay explicit");
  assert.match(templatesSource, /dedicated encoder and policy test/, "review-only boundary must stay explicit");
  assert.match(templatesSource, /Plain-language proposal only/, "review-only payload copy must stay explicit");
});
