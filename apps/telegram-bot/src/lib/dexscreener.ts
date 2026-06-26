const DEXSCREENER_BASE_URL = "https://api.dexscreener.com";

export interface DexScreenerTokenProfile {
  chainId: string;
  tokenAddress: string;
  url?: string;
  description?: string;
}

export interface DexScreenerPair {
  chainId: string;
  dexId?: string;
  pairAddress: string;
  url?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  pairCreatedAt?: number;
}

export async function getLatestBaseTokenProfiles(): Promise<DexScreenerTokenProfile[]> {
  const data = await fetchDexScreener<unknown>("/token-profiles/latest/v1");
  if (!Array.isArray(data)) return [];

  return data
    .filter((item): item is DexScreenerTokenProfile => {
      if (!item || typeof item !== "object") return false;
      const profile = item as Record<string, unknown>;
      return profile.chainId === "base" && typeof profile.tokenAddress === "string" && profile.tokenAddress.startsWith("0x");
    })
    .map((profile) => ({
      chainId: profile.chainId,
      tokenAddress: profile.tokenAddress,
      url: typeof profile.url === "string" ? profile.url : undefined,
      description: typeof profile.description === "string" ? profile.description : undefined,
    }));
}

export async function getBaseTokenPairs(tokenAddress: string): Promise<DexScreenerPair[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return [];

  const data = await fetchDexScreener<unknown>(`/token-pairs/v1/base/${tokenAddress}`);
  if (!Array.isArray(data)) return [];

  return data
    .filter((item): item is DexScreenerPair => {
      if (!item || typeof item !== "object") return false;
      const pair = item as Record<string, unknown>;
      return pair.chainId === "base" && typeof pair.pairAddress === "string" && pair.pairAddress.startsWith("0x");
    })
    .map((pair) => ({
      chainId: pair.chainId,
      dexId: pair.dexId,
      pairAddress: pair.pairAddress,
      url: pair.url,
      baseToken: pair.baseToken,
      quoteToken: pair.quoteToken,
      priceUsd: pair.priceUsd,
      liquidity: pair.liquidity,
      pairCreatedAt: pair.pairCreatedAt,
    }));
}

async function fetchDexScreener<T>(path: string): Promise<T> {
  const response = await fetch(`${DEXSCREENER_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`DexScreener request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}