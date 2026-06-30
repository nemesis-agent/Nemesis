import { createHash } from "crypto";
import { VersionedTransaction } from "@solana/web3.js";
import {
  EXECUTION_TTL_MS,
  SOL_MINT,
  SOLANA_USDC_MINT as USDC_MINT,
  type SolanaExecutionEnvelope as SolanaJupiterSwapPayload,
} from "@nemesis/execution";

const JUPITER_SWAP_API_URL = (process.env.JUPITER_SWAP_API_URL ?? "https://api.jup.ag/swap/v1").replace(/\/$/, "");
const USDC_DECIMALS = 6;

type JupiterQuoteResponse = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  swapMode: string;
  routePlan?: unknown[];
};

type JupiterSwapResponse = {
  swapTransaction?: string;
  error?: string;
};

function toUsdcAtomicAmount(usdcAmount: number): string {
  if (!Number.isFinite(usdcAmount) || usdcAmount <= 0) {
    throw new Error("USDC amount must be greater than zero");
  }

  return Math.round(usdcAmount * 10 ** USDC_DECIMALS).toString();
}

function toPositiveAtomicString(amount: bigint, label: string): string {
  if (amount <= 0n) throw new Error(`${label} amount must be greater than zero`);
  return amount.toString();
}

function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hashSolanaMessage(serializedTransaction: string): string {
  const transaction = VersionedTransaction.deserialize(Buffer.from(serializedTransaction, "base64"));
  return createHash("sha256").update(Buffer.from(transaction.message.serialize())).digest("hex");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !data) {
    throw new Error(`Jupiter API request failed: ${response.status}`);
  }

  return data;
}

async function buildJupiterSwapPayload(input: {
  walletAddress: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  slippageBps: number;
  label: string;
}): Promise<SolanaJupiterSwapPayload> {
  const quoteUrl = new URL(`${JUPITER_SWAP_API_URL}/quote`);
  quoteUrl.searchParams.set("inputMint", input.inputMint);
  quoteUrl.searchParams.set("outputMint", input.outputMint);
  quoteUrl.searchParams.set("amount", input.inputAmount);
  quoteUrl.searchParams.set("slippageBps", String(input.slippageBps));
  quoteUrl.searchParams.set("swapMode", "ExactIn");

  const quote = await fetchJson<JupiterQuoteResponse>(quoteUrl.toString());
  if (quote.inputMint !== input.inputMint || quote.outputMint !== input.outputMint || quote.inAmount !== input.inputAmount) {
    throw new Error("Jupiter quote did not match requested swap parameters");
  }

  const swap = await fetchJson<JupiterSwapResponse>(`${JUPITER_SWAP_API_URL}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: input.walletAddress,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });

  if (!swap.swapTransaction) {
    throw new Error(swap.error ?? "Jupiter did not return a swap transaction");
  }

  const createdAt = Date.now();
  return {
    kind: "solana-jupiter-swap",
    chain: "solana",
    walletAddress: input.walletAddress,
    inputMint: quote.inputMint,
    outputMint: quote.outputMint,
    inputAmount: quote.inAmount,
    expectedOutputAmount: quote.outAmount,
    otherAmountThreshold: quote.otherAmountThreshold,
    slippageBps: input.slippageBps,
    serializedTransaction: swap.swapTransaction,
    messageHash: hashSolanaMessage(swap.swapTransaction),
    quoteHash: hashJson(quote),
    label: input.label,
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(createdAt + EXECUTION_TTL_MS).toISOString(),
  };
}

export async function buildSolanaUsdcToSolSwapPayload(input: {
  walletAddress: string;
  usdcAmount: number;
  slippageBps?: number;
}): Promise<SolanaJupiterSwapPayload> {
  const slippageBps = Math.max(1, Math.min(500, Math.round(input.slippageBps ?? 75)));
  return buildJupiterSwapPayload({
    walletAddress: input.walletAddress,
    inputMint: USDC_MINT,
    outputMint: SOL_MINT,
    inputAmount: toUsdcAtomicAmount(input.usdcAmount),
    slippageBps,
    label: "Sign Jupiter USDC -> SOL swap in Solflare",
  });
}

export async function buildSolanaSolToUsdcSwapPayload(input: {
  walletAddress: string;
  lamportsAmount: bigint;
  slippageBps?: number;
}): Promise<SolanaJupiterSwapPayload> {
  const slippageBps = Math.max(1, Math.min(500, Math.round(input.slippageBps ?? 75)));
  return buildJupiterSwapPayload({
    walletAddress: input.walletAddress,
    inputMint: SOL_MINT,
    outputMint: USDC_MINT,
    inputAmount: toPositiveAtomicString(input.lamportsAmount, "SOL"),
    slippageBps,
    label: "Sign Jupiter SOL -> USDC swap in Solflare",
  });
}