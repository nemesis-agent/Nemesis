"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

import { useSolanaAuth } from "@/lib/use-solana-auth";

function shortKey(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function SolanaConnectButton() {
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { auth, signIn } = useSolanaAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connected && publicKey && auth.state === "unauthenticated" && !busy) {
      setBusy(true);
      setError(null);
      signIn()
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Solana signature cancelled."))
        .finally(() => setBusy(false));
    }
  }, [auth.state, busy, connected, publicKey, signIn]);

  const label = publicKey
    ? shortKey(publicKey.toBase58())
    : connecting || busy
      ? "signing"
      : "Solflare";

  return (
    <div className="relative">
      <button
        type="button"
        className="h-10 border border-nm-border bg-nm-surface px-3 font-mono text-[10px] uppercase tracking-widest2 text-nm-fg transition-colors hover:border-nm-fg disabled:opacity-60"
        onClick={() => {
          if (connected && auth.state === "authenticated") {
            void disconnect();
          } else if (connected) {
            setBusy(true);
            setError(null);
            signIn()
              .catch((err: unknown) => setError(err instanceof Error ? err.message : "Solana signature cancelled."))
              .finally(() => setBusy(false));
          } else {
            setVisible(true);
          }
        }}
        disabled={connecting || busy}
        title={error ?? "Connect Solflare or another Solana wallet"}
      >
        {label}
      </button>
      {error && (
        <span className="absolute right-0 top-full mt-2 w-56 border border-nm-fragment-red bg-nm-bg p-2 font-mono text-[9px] uppercase tracking-widest2 text-nm-fragment-red">
          {error}
        </span>
      )}
    </div>
  );
}
