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

const runner = read("apps/telegram-bot/src/runner.ts");
const uniswap = read("apps/telegram-bot/src/lib/uniswap-base.ts");
const confirmBase = read("apps/web/app/api/proposals/[id]/confirm/route.ts");
const executeButton = read("apps/web/components/ExecuteProposalButton.tsx");

function functionBlock(name) {
  const start = runner.indexOf(`async function ${name}`);
  assert(start !== -1, `${name} not found`);
  const next = runner.indexOf("async function", start + 1);
  return runner.slice(start, next === -1 ? undefined : next);
}

check("Base swap payload builders remain constrained to known contracts", () => {
  assert(uniswap.includes("UNISWAP_V3_SWAP_ROUTER_02_BASE"), "Uniswap router constant missing");
  assert(uniswap.includes("USDC_BASE"), "USDC constant missing");
  assert(uniswap.includes("WETH_BASE"), "WETH constant missing");
  assert(uniswap.includes("buildEthToUsdcSwapPayload"), "ETH -> USDC builder missing");
  assert(uniswap.includes("buildUsdcApproveAndSwapToEthPayload"), "USDC -> ETH builder missing");
  assert(uniswap.includes("Slippage bps outside safe range"), "slippage guard missing");
});

check("profit taker can prepare guarded ETH sell payloads", () => {
  const block = functionBlock("evaluateProfitTaker");
  assert(block.includes("MIN_BASE_ETH_RESERVE"), "profit taker must protect ETH reserve");
  assert(block.includes("buildEthToUsdcSwapPayload"), "profit taker must use dedicated ETH sell encoder");
  assert(block.includes("preparedSellEth"), "profit taker must show prepared ETH amount");
  assert(block.includes("walletAction = \"sign ETH -> USDC swap\""), "profit taker must label executable wallet action");
});

check("portfolio rebalancer supports both Base rebalance directions", () => {
  const block = functionBlock("evaluatePortfolioRebalancer");
  assert(block.includes("buildEthToUsdcSwapPayload"), "portfolio sell side missing");
  assert(block.includes("buildUsdcApproveAndSwapToEthPayload"), "portfolio buy side missing");
  assert(block.includes("prepared buy"), "portfolio buy proposal must disclose USDC amount");
  assert(block.includes("prepared sell"), "portfolio sell proposal must disclose ETH amount");
  assert(block.includes("approve USDC, then swap USDC -> ETH"), "portfolio buy wallet action label missing");
});

check("review-only templates still do not generate arbitrary calldata", () => {
  for (const fn of ["evaluateApeAgent", "evaluatePoolSniper", "evaluateAutoCompound", "evaluateAirdropFarmer", "evaluateLaunchFlipper"]) {
    const block = functionBlock(fn);
    assert(!block.includes("unsignedTxPayload"), `${fn} must remain review-only until dedicated encoder coverage exists`);
  }
});

check("web execution still verifies exact payloads before approval", () => {
  assert(executeButton.includes("validateBaseExecutionPayload"), "frontend must validate Base payloads before signing");
  assert(executeButton.includes("validation.value.steps"), "frontend must execute only validated stored steps");
  assert(executeButton.includes("summarizeExecutionPayload"), "frontend must expose execution metadata before signing");
  assert(executeButton.includes("payload.chainId !== 8453"), "frontend must reject unexpected Base chain");
  assert(confirmBase.includes("expectedTo !== actualTo"), "server must verify tx target");
  assert(confirmBase.includes("expectedData.toLowerCase() !== tx.input.toLowerCase()"), "server must verify calldata");
  assert(confirmBase.includes("expectedValue !== tx.value"), "server must verify value");
  assert(confirmBase.includes("recordProposalExecutionStep"), "server must support multi-step approval tracking");
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
  console.error(`${failed} real execution audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} real execution audit checks passed`);
