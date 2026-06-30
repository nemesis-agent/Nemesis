import { encodeFunctionData, parseEther } from "viem";
import {
  BASE_CHAIN_ID,
  WETH_BASE,
  USDC_BASE,
  UNISWAP_V3_SWAP_ROUTER_02_BASE,
  createBaseExecutionEnvelope,
  type BaseExecutionEnvelope,
} from "@nemesis/execution";


const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
] as const;

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


export function buildEthToUsdcSwapPayload(input: {
  recipient: string;
  ethAmount: string;
  ethUsdPrice: number;
  slippageBps?: number;
}): BaseExecutionEnvelope {
  if (!/^0x[a-fA-F0-9]{40}$/.test(input.recipient)) {
    throw new Error("Invalid swap recipient address");
  }

  const amountIn = parseEther(input.ethAmount);
  if (amountIn <= 0n) {
    throw new Error("Swap amount must be positive");
  }

  const slippageBps = BigInt(input.slippageBps ?? 100);
  if (slippageBps < 1n || slippageBps > 500n) {
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

  return createBaseExecutionEnvelope([
    {
      chainId: BASE_CHAIN_ID,
      to: UNISWAP_V3_SWAP_ROUTER_02_BASE,
      value: amountIn.toString(),
      data,
      label: "Swap ETH to USDC",
    },
  ]);
}


export function buildUsdcApproveAndSwapToEthPayload(input: {
  recipient: string;
  usdcAmount: number;
  ethUsdPrice: number;
  slippageBps?: number;
}): BaseExecutionEnvelope {
  if (!/^0x[a-fA-F0-9]{40}$/.test(input.recipient)) {
    throw new Error("Invalid swap recipient address");
  }
  if (!Number.isFinite(input.usdcAmount) || input.usdcAmount <= 0) {
    throw new Error("USDC amount must be positive");
  }
  if (!Number.isFinite(input.ethUsdPrice) || input.ethUsdPrice <= 0) {
    throw new Error("ETH price must be positive");
  }

  const slippageBps = BigInt(input.slippageBps ?? 100);
  if (slippageBps < 1n || slippageBps > 500n) {
    throw new Error("Slippage bps outside safe range");
  }

  const amountIn = BigInt(Math.floor(input.usdcAmount * 1_000_000));
  const expectedEthAtomic = BigInt(Math.floor((input.usdcAmount / input.ethUsdPrice) * 1e18));
  const amountOutMinimum = (expectedEthAtomic * (10_000n - slippageBps)) / 10_000n;

  const approveData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [UNISWAP_V3_SWAP_ROUTER_02_BASE, amountIn],
  });

  const swapData = encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: USDC_BASE,
        tokenOut: WETH_BASE,
        fee: 500,
        recipient: input.recipient as `0x${string}`,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

  return createBaseExecutionEnvelope([
    { chainId: BASE_CHAIN_ID, to: USDC_BASE, value: "0", data: approveData, label: "Approve exact USDC amount" },
    { chainId: BASE_CHAIN_ID, to: UNISWAP_V3_SWAP_ROUTER_02_BASE, value: "0", data: swapData, label: "Swap USDC to ETH" },
  ]);
}
