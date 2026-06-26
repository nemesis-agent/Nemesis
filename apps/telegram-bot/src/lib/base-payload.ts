const BASE_CHAIN_ID = 8453;
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface BaseUnsignedTxPayload {
  chainId: typeof BASE_CHAIN_ID;
  to: `0x${string}`;
  value: string;
  data: `0x${string}`;
}

export function buildWalletSignatureCheckPayload(walletAddress: string): string {
  if (!EVM_ADDRESS_RE.test(walletAddress)) {
    throw new Error("Cannot build Base payload for an invalid wallet address.");
  }

  const payload: BaseUnsignedTxPayload = {
    chainId: BASE_CHAIN_ID,
    to: walletAddress as `0x${string}`,
    value: "0",
    data: "0x",
  };

  return JSON.stringify(payload);
}

export function dashboardProposalUrl(agentId: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "https://nemesis-agent.xyz";
  return `${siteUrl}/agents/${encodeURIComponent(agentId)}`;
}
