"use client";

import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";

import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useSiweAuth } from "@/lib/use-siwe-auth";
import { useSolanaAuth } from "@/lib/use-solana-auth";

interface WalletSessionGateProps {
  walletKeys: string[];
  children: ReactNode;
}

function normalize(value: string) {
  return value.toLowerCase();
}

export function WalletSessionGate({ walletKeys, children }: WalletSessionGateProps) {
  const { address, isConnected: baseConnected } = useAccount();
  const solana = useWallet();
  const { auth: baseAuth, signIn: signInBase } = useSiweAuth();
  const { auth: solanaAuth, signIn: signInSolana } = useSolanaAuth();

  const normalizedKeys = walletKeys.map(normalize);
  const baseKey = address ? normalize(address) : null;
  const solanaKey = solana.publicKey ? normalize(`solana:${solana.publicKey.toBase58()}`) : null;
  const baseMatches = Boolean(baseConnected && baseKey && normalizedKeys.includes(baseKey));
  const solanaMatches = Boolean(solana.connected && solanaKey && normalizedKeys.includes(solanaKey));

  if (baseMatches || solanaMatches) return <>{children}</>;

  const hasConnectedWallet = Boolean(baseConnected || solana.connected);

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="border border-nm-border bg-nm-bg p-8">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">private surface</p>
        <h1 className="mt-3 font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">
          connect your wallet
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-nm-muted">
          Dashboard and agent detail pages are wallet-private. Connect and sign with the same wallet that owns this session before viewing deployed agents.
        </p>

        <div className="mt-6">
          <FragmentDivider />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <WalletConnectButton />
          {baseConnected && baseAuth.state !== "authenticated" && (
            <Button variant="secondary" magnetic onClick={() => void signInBase()}>
              sign base wallet
            </Button>
          )}
          {solana.connected && solanaAuth.state !== "authenticated" && (
            <Button variant="secondary" magnetic onClick={() => void signInSolana()}>
              sign solana wallet
            </Button>
          )}
        </div>

        {hasConnectedWallet && (
          <p className="mt-4 text-sm leading-relaxed text-nm-muted">
            Connected wallet does not match the authenticated NEMESIS session. Sign the connected wallet or switch to the wallet that deployed this agent.
          </p>
        )}
      </div>
    </div>
  );
}
