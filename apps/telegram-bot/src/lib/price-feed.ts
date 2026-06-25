/**
 * Simple Price Feed client using Pyth Network Hermes API.
 * 
 * In a full production scenario this would connect via WebSockets
 * or query on-chain Pyth contracts, but for the MVP runner loop,
 * the REST API is sufficient and reliable.
 */

// Pyth Price Feed IDs (Base/Mainnet)
export const PRICE_FEEDS = {
  ETH_USD: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  BTC_USD: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  SOL_USD: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
} as const;

export type SupportedTicker = keyof typeof PRICE_FEEDS;

interface PythPriceResponse {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

export async function getLivePrice(ticker: SupportedTicker): Promise<number> {
  const feedId = PRICE_FEEDS[ticker];
  if (!feedId) throw new Error(`Unsupported ticker: ${ticker}`);

  const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}`);
  if (!res.ok) {
    throw new Error(`Pyth API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as any;
  const update = data.parsed?.[0];
  
  if (!update || !update.price) {
    throw new Error("Invalid response from Pyth API");
  }

  const priceObj = update.price;
  const rawPrice = Number(priceObj.price);
  const exponent = priceObj.expo;

  // e.g. price 250000000 with expo -8 = 2500.00
  return rawPrice * Math.pow(10, exponent);
}
