"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Check, ChevronDown, LogOut, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSolanaAuth } from "@/lib/use-solana-auth";

const shortAddress = (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`;

export function WalletConnectButton() {
  const [open, setOpen] = useState(false);
  const [solanaBusy, setSolanaBusy] = useState(false);
  const [solanaError, setSolanaError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const solana = useWallet();
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const { auth: solanaAuth, signIn: signInSolana } = useSolanaAuth();

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    if (!solana.connected || !solana.publicKey || solanaAuth.state !== "unauthenticated" || solanaBusy) return;
    setSolanaBusy(true);
    setSolanaError(null);
    signInSolana()
      .catch((error: unknown) =>
        setSolanaError(error instanceof Error ? error.message : "Solana signature cancelled."),
      )
      .finally(() => setSolanaBusy(false));
  }, [signInSolana, solana.connected, solana.publicKey, solanaAuth.state, solanaBusy]);

  async function handleSolana() {
    setSolanaError(null);
    if (!solana.connected) {
      setOpen(false);
      setSolanaModalVisible(true);
      return;
    }
    if (solanaAuth.state === "authenticated") return;
    setSolanaBusy(true);
    try {
      await signInSolana();
    } catch (error) {
      setSolanaError(error instanceof Error ? error.message : "Solana signature cancelled.");
    } finally {
      setSolanaBusy(false);
    }
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        const baseConnected = mounted && Boolean(account && chain);
        const solanaConnected = solana.connected && Boolean(solana.publicKey);
        const summary = baseConnected
          ? account?.displayName
          : solanaConnected && solana.publicKey
            ? shortAddress(solana.publicKey.toBase58())
            : "connect wallet";

        return (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              className="flex h-10 min-w-[132px] items-center justify-between gap-2 border border-nm-border bg-nm-surface px-3 font-mono text-[10px] uppercase tracking-widest2 text-nm-fg transition-colors hover:border-nm-fg"
              onClick={() => setOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Wallet aria-hidden="true" size={14} />
                <span className="truncate">{summary}</span>
              </span>
              <ChevronDown aria-hidden="true" size={13} className={open ? "rotate-180" : ""} />
            </button>

            {open && (
              <div role="menu" className="absolute right-0 top-full z-[70] mt-2 w-64 border border-nm-border bg-nm-bg p-2 shadow-2xl">
                <p className="px-2 py-2 font-mono text-[9px] uppercase tracking-widest2 text-nm-muted">select network wallet</p>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center justify-between border border-transparent px-2 py-3 text-left hover:border-nm-border hover:bg-nm-surface"
                  onClick={() => {
                    setOpen(false);
                    if (!baseConnected) openConnectModal();
                    else if (chain?.unsupported) openChainModal();
                    else openAccountModal();
                  }}
                >
                  <span>
                    <span className="block font-mono text-[11px] uppercase tracking-widest2 text-nm-fg">Base</span>
                    <span className="mt-1 block font-mono text-[9px] text-nm-muted">{baseConnected ? account?.displayName : "connect EVM wallet"}</span>
                  </span>
                  {baseConnected && <Check aria-label="connected" size={15} className="text-nm-resolve" />}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="mt-1 flex w-full items-center justify-between border border-transparent px-2 py-3 text-left hover:border-nm-border hover:bg-nm-surface disabled:opacity-60"
                  onClick={() => void handleSolana()}
                  disabled={solana.connecting || solanaBusy}
                >
                  <span>
                    <span className="block font-mono text-[11px] uppercase tracking-widest2 text-nm-fg">Solflare</span>
                    <span className="mt-1 block font-mono text-[9px] text-nm-muted">
                      {solanaBusy ? "waiting for signature..." : solana.publicKey ? shortAddress(solana.publicKey.toBase58()) : "connect Solana wallet"}
                    </span>
                  </span>
                  {solanaConnected && <Check aria-label="connected" size={15} className="text-nm-resolve" />}
                </button>
                {solanaConnected && (
                  <button
                    type="button"
                    role="menuitem"
                    className="mt-1 flex w-full items-center gap-2 border-t border-nm-border px-2 py-3 font-mono text-[9px] uppercase tracking-widest2 text-nm-muted hover:text-nm-fragment-red"
                    onClick={() => {
                      setOpen(false);
                      void solana.disconnect();
                    }}
                  >
                    <LogOut aria-hidden="true" size={13} />
                    disconnect Solflare
                  </button>
                )}
                {solanaError && <p className="border-t border-nm-fragment-red px-2 py-2 font-mono text-[9px] text-nm-fragment-red">{solanaError}</p>}
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
