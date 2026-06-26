"use client";

import "@rainbow-me/rainbowkit/styles.css";
import "@solana/wallet-adapter-react-ui/styles.css";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wagmi";

const nemesisTheme = darkTheme({
  accentColor: "#e2524f",
  accentColorForeground: "#0a0a0a",
  borderRadius: "small",
  fontStack: "system",
  overlayBlur: "none",
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const solanaEndpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("mainnet-beta"),
    [],
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <ConnectionProvider endpoint={solanaEndpoint}>
        <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider theme={nemesisTheme}>{children}</RainbowKitProvider>
            </QueryClientProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </WagmiProvider>
  );
}
