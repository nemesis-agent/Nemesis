"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";

export type SolanaAuthStatus =
  | { state: "loading" }
  | { state: "unauthenticated" }
  | { state: "authenticated"; solanaAddress: string };

function buildSolanaSignInMessage(params: { address: string; nonce: string }) {
  return [
    "Sign in to NEMESIS with Solana.",
    `Domain: ${window.location.host}`,
    `Address: ${params.address}`,
    `URI: ${window.location.origin}`,
    "Version: 1",
    "Chain: solana:mainnet",
    `Nonce: ${params.nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
}

export function useSolanaAuth() {
  const { publicKey, signMessage } = useWallet();
  const [auth, setAuth] = useState<SolanaAuthStatus>({ state: "loading" });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { solanaAddress: string | null }) => {
        if (data.solanaAddress) {
          setAuth({ state: "authenticated", solanaAddress: data.solanaAddress });
        } else {
          setAuth({ state: "unauthenticated" });
        }
      })
      .catch(() => setAuth({ state: "unauthenticated" }));
  }, []);

  useEffect(() => {
    const current = publicKey?.toBase58();
    if (auth.state === "authenticated" && current && auth.solanaAddress !== current) {
      setAuth({ state: "unauthenticated" });
    }
  }, [auth, publicKey]);

  const signIn = useCallback(async () => {
    const address = publicKey?.toBase58();
    if (!address) throw new Error("Solana wallet not connected.");
    if (!signMessage) throw new Error("This Solana wallet does not support message signing.");

    const nonceRes = await fetch("/api/auth/nonce?chain=solana");
    if (!nonceRes.ok) throw new Error("Failed to fetch Solana nonce.");
    const { nonce } = (await nonceRes.json()) as { nonce: string };

    const message = buildSolanaSignInMessage({ address, nonce });
    const signed = await signMessage(new TextEncoder().encode(message));
    const signature = btoa(String.fromCharCode(...signed));

    const verifyRes = await fetch("/api/auth/solana/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, message, signature, encoding: "base64" }),
    });

    if (!verifyRes.ok) {
      const err = (await verifyRes.json()) as { error?: string };
      throw new Error(err.error ?? "Solana signature verification failed.");
    }

    const verified = (await verifyRes.json()) as { solanaAddress: string };
    setAuth({ state: "authenticated", solanaAddress: verified.solanaAddress });
    return verified.solanaAddress;
  }, [publicKey, signMessage]);

  return { auth, signIn };
}

