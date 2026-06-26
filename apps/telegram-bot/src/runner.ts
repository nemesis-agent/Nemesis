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
import { sendProposal } from "./handlers/approval.js";
import { logger } from "./lib/logger.js";

const RUNNER_INTERVAL_MS = 1000 * 60;
const BASE_RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const PRODUCTION_TEMPLATES = new Set(["dip-buyer", "limit-order", "launch-flipper", "profit-taker", "gas-optimizer", "airdrop-farmer", "portfolio-rebalancer"]);
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
let cycleCount = 0;

interface EvaluationResult {
  title: string;
  action: string;
  estimatedGasUsd: string;
  details: ProposalDetail[];
  state: Record<string, unknown>;
  lastEvent: string;
}

export function startRunner(bot: Telegraf) {
  logger.info({ msg: "initializing sub-agent runner" });

  setInterval(() => {
    cycleCount++;
    runCycle(bot).catch((err) => {
      logger.error({ msg: "error in runner cycle", err });
    });

    if (cycleCount % 1440 === 0) {
      pruneOldProposals(7)
        .then((count) => {
          if (count > 0) logger.info({ msg: `pruned ${count} old skipped proposals` });
        })
        .catch((err) => logger.error({ msg: "error pruning old proposals", err }));
    }
  }, RUNNER_INTERVAL_MS);

  runCycle(bot).catch((err) => logger.error({ msg: "error in first runner cycle", err }));
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
      logger.error({ msg: "agent evaluation failed", agentId: agent.id, err });
      return null;
    });

    if (!result) continue;

    await updateAgentRuntimeState(agent.id, result.state, result.lastEvent);

    const chatId = await getTelegramChatIdForWallet(agent.walletAddress);
    if (!chatId) {
      logger.warn({ msg: "skip proposal dispatch: no Telegram linked", walletAddress: agent.walletAddress });
      continue;
    }

    const proposal = await createProposal({
      agentId: agent.id,
      title: result.title,
      proposedAction: result.action,
      estimatedGasUsd: result.estimatedGasUsd,
      details: result.details,
    });

    await sendProposal(bot, chatId, proposal, agent.name);
    logger.info({ msg: "proposal dispatched to Telegram", proposalId: proposal.id, agentId: agent.id });
  }
}

async function evaluateAgent(agent: Agent): Promise<EvaluationResult | null> {
  if (agent.templateId === "dip-buyer") return evaluateDipBuyer(agent);
  if (agent.templateId === "limit-order") return evaluateLimitOrder(agent);
  if (agent.templateId === "launch-flipper") return evaluateLaunchFlipper(agent);
  if (agent.templateId === "profit-taker") return evaluateProfitTaker(agent);
  if (agent.templateId === "gas-optimizer") return evaluateGasOptimizer(agent);
  if (agent.templateId === "airdrop-farmer") return evaluateAirdropFarmer(agent);
  if (agent.templateId === "portfolio-rebalancer") return evaluatePortfolioRebalancer(agent);
  return null;
}

function tickerParam(agent: Agent): SupportedTicker {
  const raw = String(agent.parameters.asset ?? "ETH_USD");
  if (raw === "ETH_USD" || raw === "BTC_USD" || raw === "SOL_USD") return raw;
  return "ETH_USD";
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
  return {
    title: `${ticker} dip detected`,
    action: `${ticker} traded at $${price.toFixed(2)}, below the ${dipPercent}% dip trigger from $${highPrice.toFixed(2)}. Review a ${buyAmount} USDC buy proposal.`,
    estimatedGasUsd: "$0.10",
    details: [
      { label: "asset", value: ticker },
      { label: "current price", value: `$${price.toFixed(2)}` },
      { label: "recorded high", value: `$${highPrice.toFixed(2)}` },
      { label: "trigger", value: `${dipPercent}% dip` },
      { label: "cooldown", value: `${cooldownHours}h` },
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

  return {
    title: `${ticker} limit ${direction} hit`,
    action: `${ticker} traded at $${price.toFixed(2)} and crossed your ${direction} target of $${targetPrice}. Review a ${direction} proposal for ${amount} USDC notional.`,
    estimatedGasUsd: "$0.10",
    details: [
      { label: "asset", value: ticker },
      { label: "direction", value: direction },
      { label: "current price", value: `$${price.toFixed(2)}` },
      { label: "target price", value: `$${targetPrice}` },
      { label: "notional", value: `${amount} USDC` },
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
  return {
    title: "Portfolio drift detected",
    action: `ETH allocation is ${currentEthPercent.toFixed(2)}% versus target ${targetEthPercent}%. Review a rebalance to ${direction}.`,
    estimatedGasUsd: "$0.10",
    details: [
      { label: "ETH value", value: `$${ethValue.toFixed(2)}` },
      { label: "USDC balance", value: `$${usdcBalance.toFixed(2)}` },
      { label: "current ETH allocation", value: `${currentEthPercent.toFixed(2)}%` },
      { label: "target", value: `${targetEthPercent}% ETH` },
      { label: "drift", value: `${drift.toFixed(2)}%` },
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
