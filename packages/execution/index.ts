import { decodeFunctionData } from "viem";

export const BASE_CHAIN_ID = 8453 as const;
export const WETH_BASE = "0x4200000000000000000000000000000000000006" as const;
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const UNISWAP_V3_SWAP_ROUTER_02_BASE = "0x2626664c2603336E57B271c5C0b26F421741e481" as const;
export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const EXECUTION_TTL_MS = 10 * 60 * 1000;
const MAX_EXECUTION_TTL_MS = 15 * 60 * 1000;
const MAX_USDC_ATOMIC = 1_000_000n * 1_000_000n;
const MAX_WEI = 10_000n * 10n ** 18n;
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const HEX_RE = /^0x(?:[a-fA-F0-9]{2})*$/;

const ERC20_ABI = [{
  type: "function", name: "approve", stateMutability: "nonpayable",
  inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ name: "success", type: "bool" }],
}] as const;

const SWAP_ROUTER_ABI = [{
  type: "function", name: "exactInputSingle", stateMutability: "payable",
  inputs: [{
    name: "params", type: "tuple", components: [
      { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" },
      { name: "fee", type: "uint24" }, { name: "recipient", type: "address" },
      { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" },
      { name: "sqrtPriceLimitX96", type: "uint160" },
    ],
  }],
  outputs: [{ name: "amountOut", type: "uint256" }],
}] as const;

export type BaseExecutionStep = {
  chainId: typeof BASE_CHAIN_ID;
  to: `0x${string}`;
  value: string;
  data: `0x${string}`;
  label: string;
};

export type BaseExecutionEnvelope = {
  kind: "base-uniswap-v3";
  version: 1;
  createdAt: string;
  expiresAt: string;
  steps: BaseExecutionStep[];
};

export type SolanaExecutionEnvelope = {
  kind: "solana-jupiter-swap";
  chain: "solana";
  walletAddress: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  expectedOutputAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  serializedTransaction: string;
  messageHash: string;
  quoteHash: string;
  label: string;
  createdAt: string;
  expiresAt: string;
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function fail<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

function parsePositiveInteger(value: unknown, maximum: bigint): bigint | null {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed <= maximum ? parsed : null;
}

function validWindow(createdAt: unknown, expiresAt: unknown, nowMs: number): boolean {
  if (typeof createdAt !== "string" || typeof expiresAt !== "string") return false;
  const created = Date.parse(createdAt);
  const expires = Date.parse(expiresAt);
  return Number.isFinite(created) && Number.isFinite(expires)
    && created <= nowMs + 60_000
    && expires > nowMs
    && expires > created
    && expires - created <= MAX_EXECUTION_TTL_MS;
}

export function createBaseExecutionEnvelope(
  steps: BaseExecutionStep[],
  nowMs: number = Date.now(),
): BaseExecutionEnvelope {
  return {
    kind: "base-uniswap-v3",
    version: 1,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + EXECUTION_TTL_MS).toISOString(),
    steps,
  };
}

export function validateBaseExecutionPayload(
  rawPayload: string,
  expectedWallet: string,
  nowMs: number = Date.now(),
): ValidationResult<BaseExecutionEnvelope> {
  if (!EVM_ADDRESS_RE.test(expectedWallet)) return fail("Expected wallet is invalid.");

  let payload: BaseExecutionEnvelope;
  try {
    payload = JSON.parse(rawPayload) as BaseExecutionEnvelope;
  } catch {
    return fail("Payload is not valid JSON.");
  }

  if (payload.kind !== "base-uniswap-v3" || payload.version !== 1) return fail("Unsupported Base execution payload.");
  if (!validWindow(payload.createdAt, payload.expiresAt, nowMs)) return fail("Execution payload is expired or has an invalid lifetime.");
  if (!Array.isArray(payload.steps) || payload.steps.length < 1 || payload.steps.length > 2) return fail("Execution payload must contain one or two steps.");

  let approvedAmount: bigint | null = null;
  let swapAmount: bigint | null = null;
  let swapDirection: "buy" | "sell" | null = null;

  for (let index = 0; index < payload.steps.length; index += 1) {
    const step = payload.steps[index];
    if (!step || step.chainId !== BASE_CHAIN_ID || !EVM_ADDRESS_RE.test(step.to)) return fail("Execution step chain or target is invalid.");
    if (!HEX_RE.test(step.data) || typeof step.label !== "string" || step.label.length < 3 || step.label.length > 80) return fail("Execution step calldata or label is invalid.");
    const value = typeof step.value === "string" && /^(0|[1-9][0-9]*)$/.test(step.value) ? BigInt(step.value) : -1n;
    if (value < 0n || value > MAX_WEI) return fail("Execution step value is invalid.");

    const target = step.to.toLowerCase();
    try {
      if (target === USDC_BASE.toLowerCase()) {
        if (payload.steps.length !== 2 || index !== 0 || value !== 0n) return fail("USDC approval must be the first step of a two-step buy.");
        const decoded = decodeFunctionData({ abi: ERC20_ABI, data: step.data });
        if (decoded.functionName !== "approve") return fail("Unsupported USDC function.");
        const [spender, amount] = decoded.args;
        if (spender.toLowerCase() !== UNISWAP_V3_SWAP_ROUTER_02_BASE.toLowerCase()) return fail("Approval spender is not allowlisted.");
        if (amount <= 0n || amount > MAX_USDC_ATOMIC) return fail("Approval amount is outside policy.");
        approvedAmount = amount;
      } else if (target === UNISWAP_V3_SWAP_ROUTER_02_BASE.toLowerCase()) {
        const decoded = decodeFunctionData({ abi: SWAP_ROUTER_ABI, data: step.data });
        if (decoded.functionName !== "exactInputSingle") return fail("Unsupported router function.");
        const [params] = decoded.args;
        if (params.recipient.toLowerCase() !== expectedWallet.toLowerCase()) return fail("Swap recipient does not match the authenticated wallet.");
        if (params.fee !== 500 || params.sqrtPriceLimitX96 !== 0n || params.amountIn <= 0n || params.amountOutMinimum <= 0n) return fail("Swap parameters are outside policy.");
        const tokenIn = params.tokenIn.toLowerCase();
        const tokenOut = params.tokenOut.toLowerCase();
        if (tokenIn === WETH_BASE.toLowerCase() && tokenOut === USDC_BASE.toLowerCase()) {
          if (payload.steps.length !== 1 || value !== params.amountIn || params.amountIn > MAX_WEI) return fail("ETH sell payload value or shape is invalid.");
          swapDirection = "sell";
        } else if (tokenIn === USDC_BASE.toLowerCase() && tokenOut === WETH_BASE.toLowerCase()) {
          if (payload.steps.length !== 2 || index !== 1 || value !== 0n || params.amountIn > MAX_USDC_ATOMIC) return fail("USDC buy payload value or shape is invalid.");
          swapDirection = "buy";
        } else {
          return fail("Swap token pair is not allowlisted.");
        }
        swapAmount = params.amountIn;
      } else {
        return fail("Execution target is not allowlisted.");
      }
    } catch {
      return fail("Execution calldata could not be decoded.");
    }
  }

  if (payload.steps.length === 2 && (swapDirection !== "buy" || approvedAmount === null || approvedAmount !== swapAmount)) {
    return fail("Approval amount must exactly match the swap input.");
  }
  if (payload.steps.length === 1 && swapDirection !== "sell") return fail("Single-step execution must be an ETH sell.");

  return { ok: true, value: payload };
}

export function validateSolanaExecutionPayload(
  rawPayload: string,
  expectedWallet: string,
  nowMs: number = Date.now(),
): ValidationResult<SolanaExecutionEnvelope> {
  let payload: SolanaExecutionEnvelope;
  try {
    payload = JSON.parse(rawPayload) as SolanaExecutionEnvelope;
  } catch {
    return fail("Payload is not valid JSON.");
  }

  if (payload.kind !== "solana-jupiter-swap" || payload.chain !== "solana") return fail("Unsupported Solana execution payload.");
  if (payload.walletAddress !== expectedWallet) return fail("Solana payload wallet does not match.");
  if (!validWindow(payload.createdAt, payload.expiresAt, nowMs)) return fail("Solana execution payload is expired or has an invalid lifetime.");
  const pair = `${payload.inputMint}:${payload.outputMint}`;
  const allowedPairs = new Set([`${SOLANA_USDC_MINT}:${SOL_MINT}`, `${SOL_MINT}:${SOLANA_USDC_MINT}`]);
  if (!allowedPairs.has(pair)) return fail("Solana swap pair is not allowlisted.");
  if (!parsePositiveInteger(payload.inputAmount, 10_000n * 10n ** 9n)) return fail("Solana input amount is outside policy.");
  if (!parsePositiveInteger(payload.expectedOutputAmount, 10n ** 24n) || !parsePositiveInteger(payload.otherAmountThreshold, 10n ** 24n)) return fail("Solana quote amounts are invalid.");
  if (!Number.isInteger(payload.slippageBps) || payload.slippageBps < 1 || payload.slippageBps > 500) return fail("Solana slippage is outside policy.");
  if (typeof payload.serializedTransaction !== "string" || payload.serializedTransaction.length < 32 || payload.serializedTransaction.length > 20_000) return fail("Serialized Solana transaction is invalid.");
  if (!/^[a-f0-9]{64}$/.test(payload.messageHash) || !/^[a-f0-9]{64}$/.test(payload.quoteHash)) return fail("Solana payload hash is invalid.");

  return { ok: true, value: payload };
}
export type ExecutionPayloadSummary = {
  kind: "base" | "solana" | "review-only" | "invalid";
  executable: boolean;
  networkLabel: string;
  actionLabel: string;
  currentStep: number;
  totalSteps: number;
  expiresAt: string | null;
  expired: boolean;
  reason: string | null;
};

function expiredAt(expiresAt: unknown, nowMs: number): { expiresAt: string | null; expired: boolean } {
  if (typeof expiresAt !== "string") return { expiresAt: null, expired: false };
  const parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed)) return { expiresAt: null, expired: false };
  return { expiresAt, expired: parsed <= nowMs };
}

export function summarizeExecutionPayload(
  rawPayload: string | null | undefined,
  completedSteps: number = 0,
  nowMs: number = Date.now(),
): ExecutionPayloadSummary {
  if (!rawPayload) {
    return {
      kind: "review-only",
      executable: false,
      networkLabel: "review only",
      actionLabel: "Review proposal",
      currentStep: 0,
      totalSteps: 0,
      expiresAt: null,
      expired: false,
      reason: "No wallet transaction payload was generated.",
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload) as unknown;
  } catch {
    return {
      kind: "invalid",
      executable: false,
      networkLabel: "invalid",
      actionLabel: "Invalid payload",
      currentStep: 0,
      totalSteps: 0,
      expiresAt: null,
      expired: false,
      reason: "Payload is not valid JSON.",
    };
  }

  if (payload && typeof payload === "object" && (payload as BaseExecutionEnvelope).kind === "base-uniswap-v3") {
    const basePayload = payload as BaseExecutionEnvelope;
    const steps = Array.isArray(basePayload.steps) ? basePayload.steps : [];
    const safeCompleted = Math.max(0, Math.min(steps.length, Math.floor(completedSteps)));
    const expiry = expiredAt(basePayload.expiresAt, nowMs);
    const nextStep = steps[safeCompleted];
    return {
      kind: "base",
      executable: steps.length > 0 && !expiry.expired && safeCompleted < steps.length,
      networkLabel: "Base",
      actionLabel: nextStep?.label ?? (safeCompleted >= steps.length ? "All steps confirmed" : "Sign in wallet"),
      currentStep: steps.length > 0 ? safeCompleted + 1 : 0,
      totalSteps: steps.length,
      expiresAt: expiry.expiresAt,
      expired: expiry.expired,
      reason: expiry.expired ? "Execution payload expired. Wait for the agent to create a fresh proposal." : null,
    };
  }

  if (payload && typeof payload === "object" && (payload as SolanaExecutionEnvelope).kind === "solana-jupiter-swap") {
    const solanaPayload = payload as SolanaExecutionEnvelope;
    const expiry = expiredAt(solanaPayload.expiresAt, nowMs);
    return {
      kind: "solana",
      executable: !expiry.expired,
      networkLabel: "Solana",
      actionLabel: solanaPayload.label || "Sign Jupiter swap in Solflare",
      currentStep: 1,
      totalSteps: 1,
      expiresAt: expiry.expiresAt,
      expired: expiry.expired,
      reason: expiry.expired ? "Execution payload expired. Wait for the agent to create a fresh proposal." : null,
    };
  }

  return {
    kind: "invalid",
    executable: false,
    networkLabel: "unknown",
    actionLabel: "Unsupported payload",
    currentStep: 0,
    totalSteps: 0,
    expiresAt: null,
    expired: false,
    reason: "Payload type is not supported by the current execution policy.",
  };
}
