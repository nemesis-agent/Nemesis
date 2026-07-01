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
const templates = read("packages/templates/index.ts");

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

check("template execution coverage matrix is explicit", () => {
  for (const id of ["dip-buyer", "limit-order", "profit-taker", "portfolio-rebalancer", "solana-dip-buyer", "solana-profit-taker"]) {
    assert(templates.includes(`"${id}"`), `${id} missing from execution coverage source`);
  }
  assert(templates.includes("WALLET_SIGNABLE_TEMPLATE_IDS"), "wallet-signable template source of truth missing");
  assert(templates.includes("getTemplateExecutionCoverage"), "execution coverage helper missing");
  assert(templates.includes("Review-only proposal"), "review-only default coverage missing");
  assert(templates.includes("No signing payload is prepared until a dedicated encoder"), "review-only boundary missing");
});

check("dip buyer can prepare guarded ETH buy payloads", () => {
  const block = functionBlock("evaluateDipBuyer");
  assert(block.includes("ticker === \"ETH_USD\""), "dip buyer must only prepare Base ETH route payloads");
  assert(block.includes("getUsdcBalance"), "dip buyer must check USDC balance before payload preparation");
  assert(block.includes("buildUsdcApproveAndSwapToEthPayload"), "dip buyer must use dedicated USDC buy encoder");
  assert(block.includes("insufficient USDC balance"), "dip buyer must disclose insufficient balance review-only state");
});

check("limit order can prepare guarded ETH buy and sell payloads", () => {
  const block = functionBlock("evaluateLimitOrder");
  assert(block.includes("buildEthToUsdcSwapPayload"), "limit order sell side missing");
  assert(block.includes("buildUsdcApproveAndSwapToEthPayload"), "limit order buy side missing");
  assert(block.includes("MIN_BASE_ETH_RESERVE"), "limit order sell must protect ETH reserve");
  assert(block.includes("getUsdcBalance"), "limit order buy must check USDC balance");
  assert(block.includes("review only - insufficient balance or unsupported asset"), "limit order must disclose review-only fallback");
});

check("Solana executable templates use Jupiter envelopes and protected reserves", () => {
  const dipBlock = functionBlock("evaluateSolanaDipBuyer");
  assert(dipBlock.includes("buildSolanaUsdcToSolSwapPayload"), "Solana dip buyer must use dedicated Jupiter buy encoder");
  assert(dipBlock.includes("getSolanaUsdcBalanceAtomic"), "Solana dip buyer must check USDC balance");
  assert(dipBlock.includes("sign Jupiter USDC -> SOL swap in Solflare"), "Solana dip buyer wallet action label missing");

  const profitBlock = functionBlock("evaluateSolanaProfitTaker");
  assert(profitBlock.includes("MIN_SOL_RESERVE_LAMPORTS"), "Solana profit taker must protect SOL reserve");
  assert(profitBlock.includes("buildSolanaSolToUsdcSwapPayload"), "Solana profit taker must use dedicated Jupiter sell encoder");
  assert(profitBlock.includes("sign Jupiter SOL -> USDC swap in Solflare"), "Solana profit taker wallet action label missing");
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
  for (const fn of ["evaluateApeAgent", "evaluatePoolSniper", "evaluateAutoCompound", "evaluateAirdropFarmer", "evaluateLaunchFlipper", "evaluateGasOptimizer"]) {
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
