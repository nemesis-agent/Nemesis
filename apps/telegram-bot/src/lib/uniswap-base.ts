import { encodeFunctionData, parseEther } from "viem";

export const BASE_CHAIN_ID = 8453;
export const WETH_BASE = "0x4200000000000000000000000000000000000006" as const;
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const UNISWAP_V3_SWAP_ROUTER_02_BASE = "0x2626664c2603336E57B271c5C0b26F421741e481" as const;

const SWAP_ROUTER_ABI = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

export interface UnsignedTxPayload {
  chainId: typeof BASE_CHAIN_ID;
  to: `0x${string}`;
  value: string;
  data: `0x${string}`;
}

export function buildEthToUsdcSwapPayload(input: {
  recipient: string;
  ethAmount: string;
  ethUsdPrice: number;
  slippageBps?: number;
}): UnsignedTxPayload {
  if (!/^0x[a-fA-F0-9]{40}$/.test(input.recipient)) {
    throw new Error("Invalid swap recipient address");
  }

  const amountIn = parseEther(input.ethAmount);
  if (amountIn <= 0n) {
    throw new Error("Swap amount must be positive");
  }

  const slippageBps = BigInt(input.slippageBps ?? 100);
  if (slippageBps < 0n || slippageBps > 5_000n) {
    throw new Error("Slippage bps outside safe range");
  }

  const expectedUsdc = Number(input.ethAmount) * input.ethUsdPrice;
  if (!Number.isFinite(expectedUsdc) || expectedUsdc <= 0) {
    throw new Error("Invalid expected USDC amount");
  }

  const expectedUsdcAtomic = BigInt(Math.floor(expectedUsdc * 1_000_000));
  const amountOutMinimum = (expectedUsdcAtomic * (10_000n - slippageBps)) / 10_000n;

  const data = encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: WETH_BASE,
        tokenOut: USDC_BASE,
        fee: 500,
        recipient: input.recipient as `0x${string}`,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

  return {
    chainId: BASE_CHAIN_ID,
    to: UNISWAP_V3_SWAP_ROUTER_02_BASE,
    value: amountIn.toString(),
    data,
  };
}
