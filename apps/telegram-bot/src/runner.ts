import type { Telegraf } from "telegraf";
import {
  createProposal,
  getTelegramChatIdForWallet,
  listAgents,
  listProposalsForAgent,
  pruneOldProposals,
  updateAgentRuntimeState,
  type Agent,
  type ProposalDetail,
} from "@nemesis/db";
import { getLivePrice, type SupportedTicker } from "./lib/price-feed.js";
import { getBaseTokenPairs, getLatestBaseTokenProfiles, type DexScreenerPair } from "./lib/dexscreener.js";
import { sendProposal } from "./handlers/approval.js";
import { logger } from "./lib/logger.js";
import { sendOpsAlert } from "./lib/alerts.js";
import { buildEthToUsdcSwapPayload, buildUsdcApproveAndSwapToEthPayload } from "./lib/uniswap-base.js";
import { buildSolanaUsdcToSolSwapPayload } from "./lib/jupiter-solana.js";

const RUNNER_INTERVAL_MS = 1000 * 60;
const BASE_RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const PRODUCTION_TEMPLATES = new Set([
  "ape-agent",
  "pool-sniper",
  "launch-flipper",
  "limit-order",
  "dip-buyer",
  "profit-taker",
  "auto-compound",
  "gas-optimizer",
  "airdrop-farmer",
  "portfolio-rebalancer",
  "solana-dip-buyer",
  "solana-profit-taker",
]);
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
let cycleCount = 0;

interface EvaluationResult {
  title: string;
  action: string;
  estimatedGasUsd: string;
  details: ProposalDetail[];
  unsignedTxPayload?: string;
  state: Record<string, unknown>;
  lastEvent: string;
}

export function startRunner(bot: Telegraf) {
  logger.info({ msg: "initializing sub-agent runner" });

  setInterval(() => {
    cycleCount++;
    runCycle(bot).catch((err) => {
      void sendOpsAlert({ event: "runner_cycle_error", severity: "critical", message: "error in runner cycle", context: { error: String(err) } });
    });

    if (cycleCount % 1440 === 0) {
      pruneOldProposals(7)
        .then((count) => {
          if (count > 0) logger.info({ msg: `pruned ${count} old skipped proposals` });
        })
        .catch((err) => { void sendOpsAlert({ event: "proposal_prune_error", severity: "warning", message: "error pruning old proposals", context: { error: String(err) } }); });
    }
  }, RUNNER_INTERVAL_MS);

  runCycle(bot).catch((err) => { void sendOpsAlert({ event: "runner_first_cycle_error", severity: "critical", message: "error in first runner cycle", context: { error: String(err) } }); });
}

async function runCycle(bot: Telegraf) {
  const agents = await listAgents();
  const activeAgents = agents.filter((agent) => agent.status === "active");

  if (activeAgents.length === 0) {
    logger.debug({ msg: "cycle skipped: 0 active agents" });
    return;
  }

  logger.info({ msg: `cycle started: evaluating ${activeAgents.length} active agent(s)` });

  for (const agent of activeAgents) {
    if (!PRODUCTION_TEMPLATES.has(agent.templateId)) {
      await updateAgentRuntimeState(agent.id, agent.runtimeState, "Template runtime is not production-enabled yet.");
      continue;
    }

    const existingPending = (await listProposalsForAgent(agent.id)).some((proposal) => proposal.status === "pending");
    if (existingPending) {
      await updateAgentRuntimeState(agent.id, agent.runtimeState, "Skipped check: pending proposal already exists.");
      continue;
    }

    const result = await evaluateAgent(agent).catch((err) => {
      void sendOpsAlert({ event: "agent_evaluation_failed", severity: "warning", message: "agent evaluation failed", context: { agentId: agent.id, templateId: agent.templateId, error: String(err) } });
      return null;
    });

    if (!result) continue;

    const chatId = await getTelegramChatIdForWallet(agent.walletAddress);
    if (!chatId) {
      await updateAgentRuntimeState(agent.id, agent.runtimeState, "Proposal trigger detected, but Telegram is not linked yet.");
      logger.warn({ msg: "skip proposal dispatch: no Telegram linked", walletAddress: agent.walletAddress });
      continue;
    }

    try {
      const proposal = await createProposal({
        agentId: agent.id,
        title: result.title,
        proposedAction: result.action,
        estimatedGasUsd: result.estimatedGasUsd,
        details: result.details,
        unsignedTxPayload: result.unsignedTxPayload,
      });

      await sendProposal(bot, chatId, proposal, agent.name);
      await updateAgentRuntimeState(agent.id, result.state, result.lastEvent);
      logger.info({ msg: "proposal dispatched to Telegram", proposalId: proposal.id, agentId: agent.id });
    } catch (err) {
      await sendOpsAlert({
        event: "proposal_dispatch_failed",
        severity: "critical",
        message: "proposal dispatch failed",
        context: { agentId: agent.id, templateId: agent.templateId, error: String(err) },
      });
    }
  }
}

async function evaluateAgent(agent: Agent): Promise<EvaluationResult | null> {
  if (agent.templateId === "ape-agent") return evaluateApeAgent(agent);
  if (agent.templateId === "pool-sniper") return evaluatePoolSniper(agent);
  if (agent.templateId === "dip-buyer") return evaluateDipBuyer(agent);
  if (agent.templateId === "limit-order") return evaluateLimitOrder(agent);
  if (agent.templateId === "launch-flipper") return evaluateLaunchFlipper(agent);
  if (agent.templateId === "profit-taker") return evaluateProfitTaker(agent);
  if (agent.templateId === "auto-compound") return evaluateAutoCompound(agent);
  if (agent.templateId === "gas-optimizer") return evaluateGasOptimizer(agent);
  if (agent.templateId === "airdrop-farmer") return evaluateAirdropFarmer(agent);
  if (agent.templateId === "portfolio-rebalancer") return evaluatePortfolioRebalancer(agent);
  if (agent.templateId === "solana-dip-buyer") return evaluateSolanaDipBuyer(agent);
  if (agent.templateId === "solana-profit-taker") return evaluateSolanaProfitTaker(agent);
  return null;
}

function tickerParam(agent: Agent): SupportedTicker {
  const raw = String(agent.parameters.asset ?? "ETH_USD");
  if (raw === "ETH_USD" || raw === "BTC_USD" || raw === "SOL_USD") return raw;
  return "ETH_USD";
}

async function evaluateApeAgent(agent: Agent): Promise<EvaluationResult | null> {
  const maxApeAmount = Number(agent.parameters.maxApeAmount ?? 50);
  const minLiquidity = Number(agent.parameters.minLiquidity ?? 20000);
  const seenTokens = new Set(readStringArray(agent.runtimeState.seenTokens));
  const profiles = (await getLatestBaseTokenProfiles()).slice(0, 12);
  const nextSeen = new Set(seenTokens);

  for (const profile of profiles) {
    const tokenAddress = profile.tokenAddress.toLowerCase();
    if (seenTokens.has(tokenAddress)) continue;

    nextSeen.add(tokenAddress);
    const pairs = await getBaseTokenPairs(profile.tokenAddress);
    const pair = selectMostLiquidPair(pairs);
    if (!pair || pairLiquidityUsd(pair) < minLiquidity) continue;

    const liquidity = pairLiquidityUsd(pair);
    return {
      title: "New Base token liquidity detected",
      action: `DexScreener reported ${tokenLabel(pair)} with $${liquidity.toFixed(0)} public liquidity. Review a ${maxApeAmount} USDC entry before taking any wallet action.`,
      estimatedGasUsd: "$0.10 review",
      details: [
        { label: "token", value: tokenLabel(pair) },
        { label: "token address", value: profile.tokenAddress },
        { label: "pair", value: pair.pairAddress },
        { label: "dex", value: pair.dexId ?? "unknown" },
        { label: "liquidity", value: `$${liquidity.toFixed(0)}` },
        { label: "allocation", value: `${maxApeAmount} USDC` },
        { label: "wallet action", value: "review only" },
        { label: "source", value: pair.url ?? profile.url ?? "DexScreener" },
      ],
      state: {
        ...agent.runtimeState,
        seenTokens: capStringArray([...nextSeen], 100),
        lastProposalAt: new Date().toISOString(),
      },
      lastEvent: `New Base token review proposed for ${tokenLabel(pair)} at $${liquidity.toFixed(0)} liquidity.`,
    };
  }

  await updateAgentRuntimeState(
    agent.id,
    { ...agent.runtimeState, seenTokens: capStringArray([...nextSeen], 100), checkedAt: new Date().toISOString() },
    `Checked ${profiles.length} latest Base token profile(s); no liquidity trigger.`
  );
  return null;
}

async function evaluatePoolSniper(agent: Agent): Promise<EvaluationResult | null> {
  const minInitialLiquidity = Number(agent.parameters.minInitialLiquidity ?? 10000);
  const allocationPerPool = Number(agent.parameters.allocationPerPool ?? 100);
  const tokenWhitelist = String(agent.parameters.tokenWhitelist ?? "any-base-pair");
  const seenPairs = new Set(readStringArray(agent.runtimeState.seenPairs));
  const profiles = (await getLatestBaseTokenProfiles()).slice(0, 10);
  const nextSeen = new Set(seenPairs);
  const recentWindowMs = 24 * 60 * 60 * 1000;

  for (const profile of profiles) {
    const pairs = await getBaseTokenPairs(profile.tokenAddress);
    const candidates = pairs
      .filter((pair) => pair.pairCreatedAt && Date.now() - pair.pairCreatedAt <= recentWindowMs)
      .filter((pair) => !seenPairs.has(pair.pairAddress.toLowerCase()))
      .filter((pair) => pairLiquidityUsd(pair) >= minInitialLiquidity)
      .filter((pair) => pairMatchesFilter(pair, tokenWhitelist))
      .sort((a, b) => pairLiquidityUsd(b) - pairLiquidityUsd(a));

    for (const pair of pairs) nextSeen.add(pair.pairAddress.toLowerCase());
    const pair = candidates[0];
    if (!pair) continue;

    const liquidity = pairLiquidityUsd(pair);
    return {
      title: "New Base pool matched",
      action: `A recent ${pair.dexId ?? "Base"} pool for ${tokenLabel(pair)} matched ${tokenWhitelist} with $${liquidity.toFixed(0)} liquidity. Review a ${allocationPerPool} USDC entry before taking any wallet action.`,
      estimatedGasUsd: "$0.10 review",
      details: [
        { label: "token", value: tokenLabel(pair) },
        { label: "pair", value: pair.pairAddress },
        { label: "dex", value: pair.dexId ?? "unknown" },
        { label: "liquidity", value: `$${liquidity.toFixed(0)}` },
        { label: "pair age", value: pair.pairCreatedAt ? formatAge(pair.pairCreatedAt) : "unknown" },
        { label: "filter", value: tokenWhitelist },
        { label: "allocation", value: `${allocationPerPool} USDC` },
        { label: "wallet action", value: "review only" },
        { label: "source", value: pair.url ?? "DexScreener" },
      ],
      state: {
        ...agent.runtimeState,
        seenPairs: capStringArray([...nextSeen], 150),
        lastProposalAt: new Date().toISOString(),
      },
      lastEvent: `New Base pool review proposed for ${tokenLabel(pair)} at $${liquidity.toFixed(0)} liquidity.`,
    };
  }

  await updateAgentRuntimeState(
    agent.id,
    { ...agent.runtimeState, seenPairs: capStringArray([...nextSeen], 150), checkedAt: new Date().toISOString() },
    `Checked ${profiles.length} latest Base token profile(s); no pool trigger.`
  );
  return null;
}

async function evaluateAutoCompound(agent: Agent): Promise<EvaluationResult | null> {
  const minClaimAmount = Number(agent.parameters.minClaimAmount ?? 5);
  const source = String(agent.parameters.source ?? "morpho-lending");
  const reviewIntervalHours = Number(agent.parameters.reviewIntervalHours ?? 24);
  const lastProposalAt = typeof agent.runtimeState.lastProposalAt === "string" ? Date.parse(agent.runtimeState.lastProposalAt) : 0;
  const intervalMs = Math.max(1, reviewIntervalHours) * 60 * 60 * 1000;

  if (lastProposalAt && Date.now() - lastProposalAt < intervalMs) {
    await updateAgentRuntimeState(agent.id, { ...agent.runtimeState, checkedAt: new Date().toISOString() }, `Yield review cadence not due for ${source}.`);
    return null;
  }

  return {
    title: "Yield review due",
    action: `Review ${source} and check whether at least ${minClaimAmount} USDC can be claimed and redeposited. Nothing will be claimed automatically.`,
    estimatedGasUsd: "$0.10 review",
    details: [
      { label: "source", value: source },
      { label: "minimum claim", value: `${minClaimAmount} USDC` },
      { label: "cadence", value: `${reviewIntervalHours}h` },
      { label: "wallet action", value: "review only" },
    ],
    state: { ...agent.runtimeState, lastProposalAt: new Date().toISOString() },
    lastEvent: `Yield review proposed for ${source}.`,
  };
}

function selectMostLiquidPair(pairs: DexScreenerPair[]): DexScreenerPair | undefined {
  return [...pairs].sort((a, b) => pairLiquidityUsd(b) - pairLiquidityUsd(a))[0];
}

function pairLiquidityUsd(pair: DexScreenerPair): number {
  const value = pair.liquidity?.usd;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function tokenLabel(pair: DexScreenerPair): string {
  const symbol = pair.baseToken?.symbol ?? pair.baseToken?.name ?? "unknown token";
  const quote = pair.quoteToken?.symbol ?? "quote";
  return `${symbol}/${quote}`;
}

function pairMatchesFilter(pair: DexScreenerPair, filter: string): boolean {
  if (filter === "any-base-pair") return true;
  const symbols = [pair.baseToken?.symbol, pair.quoteToken?.symbol].map((value) => value?.toUpperCase() ?? "");
  if (filter === "eth-pairs-only") return symbols.some((symbol) => symbol === "ETH" || symbol === "WETH");
  if (filter === "stable-pairs-only") return symbols.some((symbol) => ["USDC", "USDBC", "DAI"].includes(symbol));
  return false;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function capStringArray(values: string[], max: number): string[] {
  return [...new Set(values.map((value) => value.toLowerCase()))].slice(-max);
}

function formatAge(createdAtMs: number): string {
  const ageMinutes = Math.max(0, Math.floor((Date.now() - createdAtMs) / (60 * 1000)));
  if (ageMinutes < 60) return `${ageMinutes}m`;
  return `${(ageMinutes / 60).toFixed(1)}h`;
}
async function evaluateDipBuyer(agent: Agent): Promise<EvaluationResult | null> {
  const ticker = tickerParam(agent);
  const price = await getLivePrice(ticker);
  const dipPercent = Number(agent.parameters.dipPercent ?? 5);
  const buyAmount = Number(agent.parameters.buyAmount ?? 50);
  const cooldownHours = Number(agent.parameters.cooldownHours ?? 12);
  const previousHigh = Number(agent.runtimeState.highPrice ?? price);
  const highPrice = Math.max(previousHigh, price);
  const lastProposalAt = typeof agent.runtimeState.lastProposalAt === "string" ? Date.parse(agent.runtimeState.lastProposalAt) : 0;
  const cooldownMs = Math.max(1, cooldownHours) * 60 * 60 * 1000;
  const triggerPrice = highPrice * (1 - dipPercent / 100);
  const state = { ...agent.runtimeState, ticker, highPrice, lastPrice: price, checkedAt: new Date().toISOString() };

  if (price > triggerPrice) {
    return null;
  }

  if (lastProposalAt && Date.now() - lastProposalAt < cooldownMs) {
    return null;
  }

  const now = new Date().toISOString();
  const unsignedTxPayload = ticker === "ETH_USD"
    ? JSON.stringify(buildUsdcApproveAndSwapToEthPayload({
        recipient: agent.walletAddress,
        usdcAmount: buyAmount,
        ethUsdPrice: price,
      }))
    : undefined;

  return {
    title: `${ticker} dip detected`,
    action: `${ticker} traded at $${price.toFixed(2)}, below the ${dipPercent}% dip trigger from $${highPrice.toFixed(2)}. Review a ${buyAmount} USDC buy proposal.`,
    estimatedGasUsd: "$0.10",
    unsignedTxPayload,
    details: [
      { label: "asset", value: ticker },
      { label: "current price", value: `$${price.toFixed(2)}` },
      { label: "recorded high", value: `$${highPrice.toFixed(2)}` },
      { label: "trigger", value: `${dipPercent}% dip` },
      { label: "cooldown", value: `${cooldownHours}h` },
      { label: "wallet action", value: unsignedTxPayload ? "approve USDC, then swap USDC -> ETH" : "review only" },
    ],
    state: { ...state, highPrice: price, lastProposalAt: now },
    lastEvent: `Dip trigger fired for ${ticker} at $${price.toFixed(2)}.`,
  };
}

async function evaluateLimitOrder(agent: Agent): Promise<EvaluationResult | null> {
  const ticker = tickerParam(agent);
  const price = await getLivePrice(ticker);
  const targetPrice = Number(agent.parameters.targetPrice ?? 3000);
  const direction = String(agent.parameters.direction ?? "buy") === "sell" ? "sell" : "buy";
  const amount = Number(agent.parameters.amount ?? 500);
  const hit = direction === "buy" ? price <= targetPrice : price >= targetPrice;

  if (!hit) {
    await updateAgentRuntimeState(agent.id, { ...agent.runtimeState, ticker, lastPrice: price, checkedAt: new Date().toISOString() }, `Checked ${ticker}: $${price.toFixed(2)}; target not hit.`);
    return null;
  }

  let unsignedTxPayload: string | undefined;
  if (ticker === "ETH_USD" && direction === "sell") {
    unsignedTxPayload = JSON.stringify(buildEthToUsdcSwapPayload({
      recipient: agent.walletAddress,
      ethAmount: (amount / price).toFixed(8),
      ethUsdPrice: price,
    }));
  }
  if (ticker === "ETH_USD" && direction === "buy") {
    unsignedTxPayload = JSON.stringify(buildUsdcApproveAndSwapToEthPayload({
      recipient: agent.walletAddress,
      usdcAmount: amount,
      ethUsdPrice: price,
    }));
  }

  return {
    title: `${ticker} limit ${direction} hit`,
    action: `${ticker} traded at $${price.toFixed(2)} and crossed your ${direction} target of $${targetPrice}. Review a ${direction} proposal for ${amount} USDC notional.`,
    estimatedGasUsd: "$0.10",
    unsignedTxPayload,
    details: [
      { label: "asset", value: ticker },
      { label: "direction", value: direction },
      { label: "current price", value: `$${price.toFixed(2)}` },
      { label: "target price", value: `$${targetPrice}` },
      { label: "notional", value: `${amount} USDC` },
      { label: "wallet action", value: direction === "buy" && unsignedTxPayload ? "approve USDC, then swap USDC -> ETH" : unsignedTxPayload ? "sign ETH -> USDC swap" : "review only" },
    ],
    state: { ...agent.runtimeState, ticker, lastPrice: price, lastProposalAt: new Date().toISOString() },
    lastEvent: `Limit ${direction} trigger fired for ${ticker} at $${price.toFixed(2)}.`,
  };
}

async function evaluateLaunchFlipper(agent: Agent): Promise<EvaluationResult | null> {
  const ticker = tickerParam(agent);
  const price = await getLivePrice(ticker);
  const entryPrice = Number(agent.parameters.entryPrice ?? 3000);
  const takeProfitPercent = Number(agent.parameters.takeProfitPercent ?? 100);
  const stopLossPercent = Number(agent.parameters.stopLossPercent ?? 30);
  const maxHoldHours = Number(agent.parameters.maxHoldHours ?? 48);
  const ageHours = (Date.now() - new Date(agent.createdAt).getTime()) / (60 * 60 * 1000);
  const gainPercent = ((price - entryPrice) / entryPrice) * 100;
  const takeProfitHit = gainPercent >= takeProfitPercent;
  const stopLossHit = gainPercent <= -stopLossPercent;
  const maxHoldHit = ageHours >= maxHoldHours;

  if (!takeProfitHit && !stopLossHit && !maxHoldHit) {
    await updateAgentRuntimeState(agent.id, { ...agent.runtimeState, ticker, lastPrice: price, gainPercent, checkedAt: new Date().toISOString() }, `Checked ${ticker}: ${gainPercent.toFixed(2)}% from entry; no exit trigger.`);
    return null;
  }

  const reason = takeProfitHit ? "take-profit" : stopLossHit ? "stop-loss" : "max-hold";
  return {
    title: `${ticker} ${reason} trigger hit`,
    action: `${ticker} is ${gainPercent.toFixed(2)}% from your $${entryPrice} entry. Review an exit proposal before signing anything.`,
    estimatedGasUsd: "$0.10",
    details: [
      { label: "asset", value: ticker },
      { label: "current price", value: `$${price.toFixed(2)}` },
      { label: "entry price", value: `$${entryPrice}` },
      { label: "change", value: `${gainPercent.toFixed(2)}%` },
      { label: "reason", value: reason },
    ],
    state: { ...agent.runtimeState, ticker, lastPrice: price, gainPercent, lastProposalAt: new Date().toISOString() },
    lastEvent: `${reason} trigger fired for ${ticker} at ${gainPercent.toFixed(2)}%.`,
  };
}

async function evaluateProfitTaker(agent: Agent): Promise<EvaluationResult | null> {
  const ticker = tickerParam(agent);
  const price = await getLivePrice(ticker);
  const entryPrice = Number(agent.parameters.entryPrice ?? 3000);
  const gainTargetPercent = Number(agent.parameters.gainTargetPercent ?? 100);
  const sellPortionPercent = Number(agent.parameters.sellPortionPercent ?? 30);
  const repeatAfterReset = Boolean(agent.parameters.repeatAfterReset ?? true);
  const gainPercent = ((price - entryPrice) / entryPrice) * 100;

  if (gainPercent < gainTargetPercent) {
    await updateAgentRuntimeState(agent.id, { ...agent.runtimeState, ticker, lastPrice: price, gainPercent, checkedAt: new Date().toISOString() }, `Checked ${ticker}: ${gainPercent.toFixed(2)}% gain; target not hit.`);
    return null;
  }

  return {
    title: `${ticker} profit target hit`,
    action: `${ticker} is up ${gainPercent.toFixed(2)}% from your $${entryPrice} entry. Review selling ${sellPortionPercent}% of the position.`,
    estimatedGasUsd: "$0.10",
    details: [
      { label: "asset", value: ticker },
      { label: "current price", value: `$${price.toFixed(2)}` },
      { label: "entry price", value: `$${entryPrice}` },
      { label: "gain", value: `${gainPercent.toFixed(2)}%` },
      { label: "portion", value: `${sellPortionPercent}%` },
    ],
    state: {
      ...agent.runtimeState,
      ticker,
      lastPrice: price,
      gainPercent,
      entryPrice: repeatAfterReset ? price : entryPrice,
      lastProposalAt: new Date().toISOString(),
    },
    lastEvent: `Profit target fired for ${ticker} at ${gainPercent.toFixed(2)}%.`,
  };
}


async function evaluateSolanaDipBuyer(agent: Agent): Promise<EvaluationResult | null> {
  const ticker: SupportedTicker = "SOL_USD";
  const price = await getLivePrice(ticker);
  const dipPercent = Number(agent.parameters.dipPercent ?? 5);
  const buyAmount = Number(agent.parameters.buyAmount ?? 50);
  const cooldownHours = Number(agent.parameters.cooldownHours ?? 12);
  const previousHigh = Number(agent.runtimeState.highPrice ?? price);
  const highPrice = Math.max(previousHigh, price);
  const lastProposalAt = typeof agent.runtimeState.lastProposalAt === "string" ? Date.parse(agent.runtimeState.lastProposalAt) : 0;
  const cooldownMs = Math.max(1, cooldownHours) * 60 * 60 * 1000;
  const triggerPrice = highPrice * (1 - dipPercent / 100);
  const state = { ...agent.runtimeState, ticker, chain: "solana", highPrice, lastPrice: price, checkedAt: new Date().toISOString() };

  if (price > triggerPrice) return null;
  if (lastProposalAt && Date.now() - lastProposalAt < cooldownMs) return null;

  let unsignedTxPayload: string | undefined;
  let walletAction = "review only - no transaction payload generated";
  const solanaWallet = solanaAddressFromWalletKey(agent.walletAddress);
  if (solanaWallet) {
    try {
      unsignedTxPayload = JSON.stringify(await buildSolanaUsdcToSolSwapPayload({
        walletAddress: solanaWallet,
        usdcAmount: buyAmount,
      }));
      walletAction = "sign Jupiter USDC -> SOL swap in Solflare";
    } catch (err) {
      logger.warn({ msg: "Solana Jupiter payload unavailable", agentId: agent.id, error: String(err) });
      void sendOpsAlert({
        event: "solana_jupiter_payload_unavailable",
        severity: "warning",
        message: "Solana proposal created without executable Jupiter payload",
        context: { agentId: agent.id, error: String(err) },
      });
    }
  }

  return {
    title: "SOL dip review ready",
    action: unsignedTxPayload
      ? `SOL traded at $${price.toFixed(2)}, below the ${dipPercent}% dip trigger from $${highPrice.toFixed(2)}. Sign the prepared ${buyAmount} USDC Jupiter buy only if the wallet preview still matches this proposal.`
      : `SOL traded at $${price.toFixed(2)}, below the ${dipPercent}% dip trigger from $${highPrice.toFixed(2)}. Review a ${buyAmount} USDC buy before signing anything in Solflare.`,
    estimatedGasUsd: unsignedTxPayload ? "Solana network fee" : "Solana review only",
    unsignedTxPayload,
    details: [
      { label: "chain", value: "Solana" },
      { label: "asset", value: ticker },
      { label: "current price", value: `$${price.toFixed(2)}` },
      { label: "recorded high", value: `$${highPrice.toFixed(2)}` },
      { label: "trigger", value: `${dipPercent}% dip` },
      { label: "review amount", value: `${buyAmount} USDC` },
      { label: "wallet action", value: walletAction },
    ],
    state: { ...state, highPrice: price, lastProposalAt: new Date().toISOString() },
    lastEvent: `Solana dip review triggered for SOL at $${price.toFixed(2)}.`,
  };
}

function solanaAddressFromWalletKey(walletAddress: string): string | null {
  return walletAddress.startsWith("solana:") ? walletAddress.slice("solana:".length) : null;
}

async function evaluateSolanaProfitTaker(agent: Agent): Promise<EvaluationResult | null> {
  const ticker: SupportedTicker = "SOL_USD";
  const price = await getLivePrice(ticker);
  const entryPrice = Number(agent.parameters.entryPrice ?? 140);
  const gainTargetPercent = Number(agent.parameters.gainTargetPercent ?? 25);
  const sellPortionPercent = Number(agent.parameters.sellPortionPercent ?? 25);
  const gainPercent = ((price - entryPrice) / entryPrice) * 100;

  if (gainPercent < gainTargetPercent) {
    await updateAgentRuntimeState(agent.id, { ...agent.runtimeState, ticker, chain: "solana", lastPrice: price, gainPercent, checkedAt: new Date().toISOString() }, `Checked SOL: ${gainPercent.toFixed(2)}% gain; target not hit.`);
    return null;
  }

  return {
    title: "SOL profit review ready",
    action: `SOL is up ${gainPercent.toFixed(2)}% from your $${entryPrice} entry. Review selling ${sellPortionPercent}% through Jupiter before signing anything in Solflare.`,
    estimatedGasUsd: "Solana review only",
    details: [
      { label: "chain", value: "Solana" },
      { label: "asset", value: ticker },
      { label: "current price", value: `$${price.toFixed(2)}` },
      { label: "entry price", value: `$${entryPrice}` },
      { label: "gain", value: `${gainPercent.toFixed(2)}%` },
      { label: "portion", value: `${sellPortionPercent}%` },
      { label: "wallet action", value: "review only - no transaction payload generated" },
    ],
    state: { ...agent.runtimeState, ticker, chain: "solana", lastPrice: price, gainPercent, lastProposalAt: new Date().toISOString() },
    lastEvent: `Solana profit review triggered for SOL at ${gainPercent.toFixed(2)}% gain.`,
  };
}
async function evaluateGasOptimizer(agent: Agent): Promise<EvaluationResult | null> {
  const maxGasGwei = Number(agent.parameters.maxGasGwei ?? 5);
  const maxWaitHours = Number(agent.parameters.maxWaitHours ?? 6);
  const gasGwei = await getBaseGasGwei();
  const createdAtMs = new Date(agent.createdAt).getTime();
  const waitExpired = Number.isFinite(createdAtMs) && Date.now() - createdAtMs >= maxWaitHours * 60 * 60 * 1000;

  if (gasGwei > maxGasGwei && !waitExpired) {
    await updateAgentRuntimeState(agent.id, { ...agent.runtimeState, gasGwei, checkedAt: new Date().toISOString() }, `Checked Base gas: ${gasGwei.toFixed(4)} gwei; threshold not hit.`);
    return null;
  }

  return {
    title: "Base gas condition met",
    action: waitExpired
      ? `Max wait of ${maxWaitHours}h expired. Review your queued transaction before signing.`
      : `Base gas is ${gasGwei.toFixed(4)} gwei, below your ${maxGasGwei} gwei threshold. Review your queued transaction before signing.`,
    estimatedGasUsd: "$0.02",
    details: [
      { label: "base gas", value: `${gasGwei.toFixed(4)} gwei` },
      { label: "threshold", value: `${maxGasGwei} gwei` },
      { label: "max wait", value: `${maxWaitHours}h` },
    ],
    state: { ...agent.runtimeState, gasGwei, lastProposalAt: new Date().toISOString() },
    lastEvent: `Gas trigger fired at ${gasGwei.toFixed(4)} gwei.`,
  };
}


async function evaluateAirdropFarmer(agent: Agent): Promise<EvaluationResult | null> {
  const weeklyBudget = Number(agent.parameters.weeklyBudget ?? 2);
  const targetProtocols = String(agent.parameters.targetProtocols ?? "all-supported");
  const lastProposalAt = typeof agent.runtimeState.lastProposalAt === "string" ? Date.parse(agent.runtimeState.lastProposalAt) : 0;
  const intervalMs = 7 * 24 * 60 * 60 * 1000;

  if (lastProposalAt && Date.now() - lastProposalAt < intervalMs) {
    return null;
  }

  return {
    title: "Weekly interaction review due",
    action: `Review a small interaction for ${targetProtocols} within the ${weeklyBudget} USDC weekly gas budget.`,
    estimatedGasUsd: `$${weeklyBudget.toFixed(2)} max budget`,
    details: [
      { label: "protocol set", value: targetProtocols },
      { label: "weekly budget", value: `${weeklyBudget} USDC` },
      { label: "cadence", value: "weekly" },
    ],
    state: { ...agent.runtimeState, lastProposalAt: new Date().toISOString() },
    lastEvent: `Weekly airdrop interaction review proposed for ${targetProtocols}.`,
  };
}

async function evaluatePortfolioRebalancer(agent: Agent): Promise<EvaluationResult | null> {
  const [ethBalance, usdcBalance, ethPrice] = await Promise.all([
    getEthBalance(agent.walletAddress),
    getUsdcBalance(agent.walletAddress),
    getLivePrice("ETH_USD"),
  ]);
  const ethValue = ethBalance * ethPrice;
  const totalValue = ethValue + usdcBalance;

  if (totalValue <= 0) {
    await updateAgentRuntimeState(agent.id, { ...agent.runtimeState, checkedAt: new Date().toISOString() }, "Checked portfolio: no ETH/USDC value detected.");
    return null;
  }

  const [ethTargetRaw] = String(agent.parameters.targetAllocation ?? "60-40").split("-");
  const targetEthPercent = Number(ethTargetRaw);
  const driftTolerancePercent = Number(agent.parameters.driftTolerancePercent ?? 10);
  const currentEthPercent = (ethValue / totalValue) * 100;
  const drift = currentEthPercent - targetEthPercent;

  if (Math.abs(drift) < driftTolerancePercent) {
    await updateAgentRuntimeState(agent.id, { ...agent.runtimeState, ethBalance, usdcBalance, ethValue, currentEthPercent, checkedAt: new Date().toISOString() }, `Checked portfolio: ETH allocation ${currentEthPercent.toFixed(2)}%; drift within tolerance.`);
    return null;
  }

  const direction = drift > 0 ? "sell ETH for USDC" : "buy ETH with USDC";
  const targetEthValue = totalValue * (targetEthPercent / 100);
  const excessEthValue = Math.max(0, ethValue - targetEthValue);
  const ethAmount = excessEthValue > 0 ? (excessEthValue / ethPrice).toFixed(8) : undefined;
  const unsignedTxPayload = ethAmount
    ? JSON.stringify(buildEthToUsdcSwapPayload({
        recipient: agent.walletAddress,
        ethAmount,
        ethUsdPrice: ethPrice,
      }))
    : undefined;

  return {
    title: "Portfolio drift detected",
    action: `ETH allocation is ${currentEthPercent.toFixed(2)}% versus target ${targetEthPercent}%. Review a rebalance to ${direction}.`,
    estimatedGasUsd: "$0.10",
    unsignedTxPayload,
    details: [
      { label: "ETH value", value: `$${ethValue.toFixed(2)}` },
      { label: "USDC balance", value: `$${usdcBalance.toFixed(2)}` },
      { label: "current ETH allocation", value: `${currentEthPercent.toFixed(2)}%` },
      { label: "target", value: `${targetEthPercent}% ETH` },
      { label: "drift", value: `${drift.toFixed(2)}%` },
      { label: "wallet action", value: unsignedTxPayload ? "sign ETH -> USDC swap" : "review only" },
    ],
    state: { ...agent.runtimeState, ethBalance, usdcBalance, ethValue, currentEthPercent, lastProposalAt: new Date().toISOString() },
    lastEvent: `Portfolio drift fired at ${currentEthPercent.toFixed(2)}% ETH allocation.`,
  };
}

async function getBaseGasGwei(): Promise<number> {
  const result = await callBaseRpc("eth_gasPrice", []);
  return Number(BigInt(result)) / 1e9;
}


async function getEthBalance(address: string): Promise<number> {
  const result = await callBaseRpc("eth_getBalance", [address, "latest"]);
  return Number(BigInt(result)) / 1e18;
}

async function getUsdcBalance(address: string): Promise<number> {
  const selector = "0x70a08231";
  const paddedAddress = address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const result = await callBaseRpc("eth_call", [{ to: USDC_BASE, data: `${selector}${paddedAddress}` }, "latest"]);
  return Number(BigInt(result)) / 1e6;
}

async function callBaseRpc(method: string, params: unknown[]): Promise<`0x${string}`> {
  const response = await fetch(BASE_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  if (!response.ok) {
    throw new Error(`Base RPC ${method} failed: ${response.status}`);
  }

  const data = (await response.json()) as { result?: `0x${string}`; error?: { message?: string } };
  if (!data.result) {
    throw new Error(data.error?.message ?? `Base RPC ${method} returned no result`);
  }

  return data.result;
}
