import { createHash } from "crypto";
import { VersionedTransaction } from "@solana/web3.js";

const JUPITER_SWAP_API_URL = (process.env.JUPITER_SWAP_API_URL ?? "https://api.jup.ag/swap/v1").replace(/\/$/, "");
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_DECIMALS = 6;

export interface SolanaJupiterSwapPayload {
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
}

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

export async function buildSolanaUsdcToSolSwapPayload(input: {
  walletAddress: string;
  usdcAmount: number;
  slippageBps?: number;
}): Promise<SolanaJupiterSwapPayload> {
  const slippageBps = Math.max(1, Math.min(500, Math.round(input.slippageBps ?? 75)));
  const amount = toUsdcAtomicAmount(input.usdcAmount);
  const quoteUrl = new URL(`${JUPITER_SWAP_API_URL}/quote`);
  quoteUrl.searchParams.set("inputMint", USDC_MINT);
  quoteUrl.searchParams.set("outputMint", SOL_MINT);
  quoteUrl.searchParams.set("amount", amount);
  quoteUrl.searchParams.set("slippageBps", String(slippageBps));
  quoteUrl.searchParams.set("swapMode", "ExactIn");

  const quote = await fetchJson<JupiterQuoteResponse>(quoteUrl.toString());
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

  return {
    kind: "solana-jupiter-swap",
    chain: "solana",
    walletAddress: input.walletAddress,
    inputMint: quote.inputMint,
    outputMint: quote.outputMint,
    inputAmount: quote.inAmount,
    expectedOutputAmount: quote.outAmount,
    otherAmountThreshold: quote.otherAmountThreshold,
    slippageBps,
    serializedTransaction: swap.swapTransaction,
    messageHash: hashSolanaMessage(swap.swapTransaction),
    quoteHash: hashJson(quote),
    label: "Sign Jupiter swap in Solflare",
  };
}
