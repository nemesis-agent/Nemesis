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
export const wagmiConfig = getDefaultConfig({
  appName: "NEMESIS",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "00000000000000000000000000000000",
  chains: [base, baseSepolia],
  ssr: true,
});
