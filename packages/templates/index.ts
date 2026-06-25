import type { AgentTemplate } from "./types";

/**
 * The NEMESIS template library.
 *
 * Every template follows the same shape: one condition, one proposed action,
 * proposed through Base MCP, always pending user approval. Templates are
 * intentionally scoped to single-condition logic — see ARCHITECTURE.md for
 * why compound strategies (looping, delta-neutral, perps) were cut from v1.
 */
export const TEMPLATES: AgentTemplate[] = [
  // ---------------------------------------------------------------------
  // Launch & snipe
  // ---------------------------------------------------------------------
  {
    id: "ape-agent",
    name: "Ape agent",
    category: "launch-snipe",
    risk: "degen",
    summary: "Auto-detect new token launches and ape in if filters pass",
    condition:
      "A new token launches on Bankr or Virtuals and passes your safety filters: minimum liquidity, max dev wallet share, and a simulated honeypot check.",
    action: "Propose a buy of a fixed USDC amount for the new token.",
    protocols: ["bankr", "virtuals", "uniswap"],
    parameters: [
      {
        key: "maxApeAmount",
        label: "Max ape per token",
        type: "currency",
        default: 50,
        unit: "USDC",
        description: "The largest amount proposed for any single new launch.",
      },
      {
        key: "minLiquidity",
        label: "Minimum liquidity",
        type: "currency",
        default: 20000,
        unit: "USDC",
        description: "Launches below this liquidity are skipped entirely.",
      },
      {
        key: "maxDevWalletPercent",
        label: "Max dev wallet share",
        type: "percent",
        default: 5,
        unit: "%",
        description: "Launches where the dev wallet holds more than this are skipped.",
      },
      {
        key: "honeypotCheck",
        label: "Run honeypot simulation",
        type: "boolean",
        default: true,
        description: "Simulate a sell before proposing a buy to filter out honeypots.",
      },
    ],
    approvalSummary:
      "This agent watches new token launches on Bankr and Virtuals. When a launch has at least {minLiquidity} USDC liquidity, a dev wallet holding under {maxDevWalletPercent}%, and passes a honeypot simulation, it proposes buying {maxApeAmount} USDC of the token. Every buy needs your approval — nothing executes automatically.",
    riskNote:
      "New token launches fail far more often than they succeed. Filters reduce obvious scams but cannot guarantee a token isn't a rug, a honeypot variant the simulation missed, or simply worthless within hours. Treat every approved ape as money you are comfortable losing completely.",
  },
  {
    id: "pool-sniper",
    name: "Pool sniper",
    category: "launch-snipe",
    risk: "degen",
    summary: "Detect new liquidity pools and propose entry early",
    condition:
      "A new pool is created on Aerodrome or Uniswap with initial liquidity above your threshold, for a token pair you've whitelisted.",
    action: "Propose a swap into the new pool for a fixed allocation.",
    protocols: ["aerodrome", "uniswap"],
    parameters: [
      {
        key: "minInitialLiquidity",
        label: "Min initial liquidity",
        type: "currency",
        default: 10000,
        unit: "USDC",
        description: "Pools created below this liquidity are ignored.",
      },
      {
        key: "allocationPerPool",
        label: "Allocation per pool",
        type: "currency",
        default: 100,
        unit: "USDC",
        description: "Amount proposed when a matching new pool is found.",
      },
      {
        key: "tokenWhitelist",
        label: "Token pair whitelist",
        type: "select",
        default: "any-base-pair",
        options: ["any-base-pair", "eth-pairs-only", "stable-pairs-only"],
        description: "Restrict which new pools this agent reacts to.",
      },
    ],
    approvalSummary:
      "This agent watches for new pools on Aerodrome and Uniswap. When a new pool matching {tokenWhitelist} launches with at least {minInitialLiquidity} USDC liquidity, it proposes a {allocationPerPool} USDC swap into that pool. You approve each entry before anything moves.",
    riskNote:
      "Brand-new pools have no price history — the price you enter at can be wildly different from where it settles seconds later, and liquidity can be pulled entirely. Initial liquidity above your threshold does not mean the pool is safe, only that it passed one filter.",
  },
  {
    id: "launch-flipper",
    name: "Launch flipper",
    category: "launch-snipe",
    risk: "high",
    summary: "Enter a launch and propose exit at your profit target",
    condition:
      "You hold a position from a launch via Bankr, and its price reaches your take-profit or stop-loss target.",
    action: "Propose selling the position back to USDC.",
    protocols: ["bankr", "uniswap"],
    parameters: [
      {
        key: "takeProfitPercent",
        label: "Take profit",
        type: "percent",
        default: 100,
        unit: "%",
        description: "Propose selling once the position is up by this much.",
      },
      {
        key: "stopLossPercent",
        label: "Stop loss",
        type: "percent",
        default: 30,
        unit: "%",
        description: "Propose selling once the position is down by this much.",
      },
      {
        key: "maxHoldHours",
        label: "Max hold duration",
        type: "number",
        default: 48,
        unit: "hours",
        description: "Propose an exit if neither target is hit within this window.",
      },
    ],
    approvalSummary:
      "This agent tracks one launch position. If it gains {takeProfitPercent}% it proposes taking profit; if it loses {stopLossPercent}% it proposes cutting the loss; if neither happens within {maxHoldHours} hours it proposes exiting anyway. Every exit needs your approval.",
    riskNote:
      "Stop-loss and take-profit levels are proposals, not guarantees — by the time you approve an exit, the price may have moved further against you, especially in thin liquidity. A {stopLossPercent}% stop loss can still result in a larger realized loss if the price gaps past it.",
  },

  // ---------------------------------------------------------------------
  // Simple actions
  // ---------------------------------------------------------------------
  {
    id: "limit-order",
    name: "Limit order agent",
    category: "simple-actions",
    risk: "low",
    summary: "Buy or sell a token when it reaches your target price",
    condition: "The price of your chosen token crosses your target price.",
    action: "Propose a swap at the current market price.",
    protocols: ["uniswap", "aerodrome"],
    parameters: [
      {
        key: "targetPrice",
        label: "Target price",
        type: "currency",
        default: 3000,
        unit: "USDC",
        description: "The price at which this agent should propose the trade.",
      },
      {
        key: "direction",
        label: "Order direction",
        type: "select",
        default: "buy",
        options: ["buy", "sell"],
        description: "Whether to propose buying or selling when the target is hit.",
      },
      {
        key: "amount",
        label: "Order size",
        type: "currency",
        default: 500,
        unit: "USDC",
        description: "The size of the order proposed when the target price is reached.",
      },
    ],
    approvalSummary:
      "This agent waits until the price hits {targetPrice} USDC, then proposes a {direction} order for {amount} USDC. Neither Uniswap nor Aerodrome support native limit orders — this agent fills that gap, with your approval on every trade.",
  },
  {
    id: "dip-buyer",
    name: "Dip buyer",
    category: "simple-actions",
    risk: "low",
    summary: "Buy a fixed amount every time the price drops by a set %",
    condition: "The price of your chosen token drops by your set percentage from its recent high.",
    action: "Propose a buy of a fixed amount.",
    protocols: ["uniswap"],
    parameters: [
      {
        key: "dipPercent",
        label: "Dip trigger",
        type: "percent",
        default: 5,
        unit: "%",
        description: "Propose a buy whenever the price falls this much from its recent high.",
      },
      {
        key: "buyAmount",
        label: "Buy amount",
        type: "currency",
        default: 50,
        unit: "USDC",
        description: "Amount proposed for each dip-triggered buy.",
      },
      {
        key: "cooldownHours",
        label: "Cooldown between buys",
        type: "number",
        default: 12,
        unit: "hours",
        description: "Minimum time between two dip-triggered proposals.",
      },
    ],
    approvalSummary:
      "This agent proposes buying {buyAmount} USDC of your chosen token every time its price drops {dipPercent}% from its recent high, with at least {cooldownHours} hours between proposals. You approve each buy individually.",
  },
  {
    id: "profit-taker",
    name: "Profit taker",
    category: "simple-actions",
    risk: "mid",
    summary: "Sell a portion of a position once it hits your target gain",
    condition: "Your position in a chosen token gains your target percentage from your entry price.",
    action: "Propose selling a portion of the position back to USDC.",
    protocols: ["uniswap", "aerodrome"],
    parameters: [
      {
        key: "gainTargetPercent",
        label: "Gain target",
        type: "percent",
        default: 100,
        unit: "%",
        description: "Propose a partial sell once the position gains this much.",
      },
      {
        key: "sellPortionPercent",
        label: "Portion to sell",
        type: "percent",
        default: 30,
        unit: "%",
        description: "How much of the position to propose selling when the target is hit.",
      },
      {
        key: "repeatAfterReset",
        label: "Repeat for further gains",
        type: "boolean",
        default: true,
        description: "If on, the agent resets and watches for the next gain target after each sell.",
      },
    ],
    approvalSummary:
      "This agent watches your position in a chosen token. Once it's up {gainTargetPercent}% from your entry, it proposes selling {sellPortionPercent}% of it back to USDC, then resets to watch for the next target if repeat is on. You approve each sell.",
  },
  {
    id: "auto-compound",
    name: "Auto compound",
    category: "simple-actions",
    risk: "low",
    summary: "Collect yield from Morpho or Aerodrome and reinvest it",
    condition: "Accrued yield or fees on your position exceed your minimum claim amount.",
    action: "Propose claiming the yield and depositing it back into the same position.",
    protocols: ["morpho", "aerodrome"],
    parameters: [
      {
        key: "minClaimAmount",
        label: "Minimum claim amount",
        type: "currency",
        default: 5,
        unit: "USDC",
        description: "Only propose a claim once accrued yield exceeds this amount.",
      },
      {
        key: "source",
        label: "Yield source",
        type: "select",
        default: "morpho-lending",
        options: ["morpho-lending", "aerodrome-lp-fees"],
        description: "Which position this agent monitors for accruing yield.",
      },
    ],
    approvalSummary:
      "This agent monitors your chosen position. Once accrued yield passes {minClaimAmount} USDC, it proposes claiming it and depositing it straight back into the same position — set and forget, with your approval on each compound.",
  },

  // ---------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------
  {
    id: "gas-optimizer",
    name: "Gas optimizer",
    category: "utility",
    risk: "low",
    summary: "Hold a pending transaction until gas drops below your threshold",
    condition: "Base network gas price drops below your threshold while a transaction is queued.",
    action: "Propose executing the queued transaction.",
    protocols: ["uniswap"],
    parameters: [
      {
        key: "maxGasGwei",
        label: "Max gas price",
        type: "number",
        default: 5,
        unit: "gwei",
        description: "The agent waits until gas drops to or below this level.",
      },
      {
        key: "maxWaitHours",
        label: "Max wait time",
        type: "number",
        default: 6,
        unit: "hours",
        description: "Propose executing anyway after this long, even if gas hasn't dropped.",
      },
    ],
    approvalSummary:
      "This agent holds a queued transaction until Base gas drops to {maxGasGwei} gwei or below, or {maxWaitHours} hours pass — whichever comes first. It then proposes executing the transaction for your approval.",
  },
  {
    id: "airdrop-farmer",
    name: "Airdrop farmer",
    category: "utility",
    risk: "low",
    summary: "Run a scheduled interaction pattern across target protocols",
    condition: "Your weekly interaction schedule comes due for one of your target protocols.",
    action: "Propose a small, low-cost interaction (swap, deposit, or withdrawal) with that protocol.",
    protocols: ["morpho", "aerodrome", "uniswap", "moonwell"],
    parameters: [
      {
        key: "targetProtocols",
        label: "Target protocols",
        type: "select",
        default: "all-supported",
        options: ["all-supported", "morpho-and-moonwell", "aerodrome-and-uniswap"],
        description: "Which protocols this agent rotates interactions through.",
      },
      {
        key: "weeklyBudget",
        label: "Weekly gas budget",
        type: "currency",
        default: 2,
        unit: "USDC",
        description: "Approximate total gas this agent should spend per week.",
      },
    ],
    approvalSummary:
      "This agent proposes a small interaction with your selected protocols on a weekly schedule, staying within a {weeklyBudget} USDC gas budget. Nemesis memory tracks which protocols you've already interacted with — you approve each interaction.",
  },
  {
    id: "portfolio-rebalancer",
    name: "Portfolio rebalancer",
    category: "utility",
    risk: "mid",
    summary: "Propose a rebalance when your allocation drifts from target",
    condition: "Your wallet's allocation between two assets drifts beyond your tolerance from the target split.",
    action: "Propose a swap to bring the allocation back to target.",
    protocols: ["uniswap", "aerodrome"],
    parameters: [
      {
        key: "targetAllocation",
        label: "Target split",
        type: "select",
        default: "60-40",
        options: ["50-50", "60-40", "70-30", "80-20"],
        description: "Target allocation between your two chosen assets, e.g. ETH / USDC.",
      },
      {
        key: "driftTolerancePercent",
        label: "Drift tolerance",
        type: "percent",
        default: 10,
        unit: "%",
        description: "Propose a rebalance once the actual split drifts this far from target.",
      },
    ],
    approvalSummary:
      "This agent monitors your allocation against a {targetAllocation} target split. Once it drifts more than {driftTolerancePercent}% from target, it proposes a swap to bring it back in line. You approve each rebalance.",
  },
];

export const getTemplateById = (id: string): AgentTemplate | undefined =>
  TEMPLATES.find((template) => template.id === id);

export const getTemplatesByCategory = (category: AgentTemplate["category"]): AgentTemplate[] =>
  TEMPLATES.filter((template) => template.category === category);

export type { AgentTemplate, TemplateCategory, RiskLevel, BaseProtocol, TemplateParameter } from "./types";
export { TEMPLATE_CATEGORIES, RISK_LABELS } from "./types";
