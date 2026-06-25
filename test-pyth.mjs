import { getLivePrice } from "./apps/telegram-bot/dist/lib/price-feed.js";

async function run() {
  console.log("Testing Pyth Hermes Network...");
  try {
    const ethPrice = await getLivePrice("ETH_USD");
    console.log(`[SUCCESS] Live ETH Price: $${ethPrice.toFixed(2)}`);
  } catch (error) {
    console.error(`[ERROR] Failed to fetch price:`, error);
    process.exit(1);
  }
}

run();
