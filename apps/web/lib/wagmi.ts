import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia } from "wagmi/chains";

/**
 * Wallet connection config.
 *
 * NEMESIS never holds user funds — this config only powers wallet
 * connection and read calls / unsigned transaction proposals from the
 * client. See ARCHITECTURE.md, "Custody model".
 *
 * Get a project ID at https://cloud.walletconnect.com and set it as
 * NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. The placeholder below is enough
 * for local development but should be replaced before deploying.
 */
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

if (process.env.NODE_ENV === "production") {
  if (!walletConnectProjectId || walletConnectProjectId === "00000000000000000000000000000000") {
    throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be set to the NEMESIS WalletConnect project ID in production.");
  }
}

export const wagmiConfig = getDefaultConfig({
  appName: "NEMESIS",
  appDescription: "Autonomous agents on Base. Chaos in, order out.",
  appUrl: siteUrl,
  appIcon: `${siteUrl}/assets/nemesis-icon.png`,
  projectId: walletConnectProjectId ?? "00000000000000000000000000000000",
  chains: [base, baseSepolia],
  ssr: true,
});
