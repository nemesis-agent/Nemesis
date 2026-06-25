"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";

type AuthStatus =
  | { state: "loading" }
  | { state: "unauthenticated" }
  | { state: "authenticated"; address: `0x${string}` };

/**
 * Client-side hook that manages the full SIWE authentication lifecycle:
 *   1. Checks current session via GET /api/auth/me on mount.
 *   2. Exposes `signIn()` — requests nonce, builds SIWE message, asks wallet
 *      to sign, then verifies with the server.
 *   3. Exposes `signOut()` — calls DELETE /api/auth/me.
 *
 * Components should call `signIn()` after the user connects their wallet.
 */
export function useSiweAuth() {
  const { address, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [auth, setAuth] = useState<AuthStatus>({ state: "loading" });

  // Check existing session on mount.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { address: string | null }) => {
        if (data.address) {
          setAuth({ state: "authenticated", address: data.address as `0x${string}` });
        } else {
          setAuth({ state: "unauthenticated" });
        }
      })
      .catch(() => setAuth({ state: "unauthenticated" }));
  }, []);

  // Re-check session when wallet account changes.
  useEffect(() => {
    if (auth.state === "authenticated" && address && auth.address.toLowerCase() !== address.toLowerCase()) {
      setAuth({ state: "unauthenticated" });
    }
  }, [address, auth]);

  const signIn = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected.");

    // Step 1: get a fresh nonce from the server.
    const nonceRes = await fetch("/api/auth/nonce");
    if (!nonceRes.ok) throw new Error("Failed to fetch nonce.");
    const { nonce } = (await nonceRes.json()) as { nonce: string };

    // Step 2: build the SIWE message.
    const siweMessage = new SiweMessage({
      domain: window.location.host,
      address,
      statement: "Sign in to NEMESIS. This request will not trigger a blockchain transaction or cost any fees.",
      uri: window.location.origin,
      version: "1",
      chainId: chain?.id ?? 8453, // Default Base mainnet
      nonce,
    });

    const message = siweMessage.prepareMessage();

    // Step 3: ask wallet to sign.
    const signature = await signMessageAsync({ message });

    // Step 4: verify with server.
    const verifyRes = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });

    if (!verifyRes.ok) {
      const err = (await verifyRes.json()) as { error?: string };
      throw new Error(err.error ?? "Signature verification failed.");
    }

    const verified = (await verifyRes.json()) as { address: string };
    setAuth({ state: "authenticated", address: verified.address as `0x${string}` });

    return verified.address as `0x${string}`;
  }, [address, chain, signMessageAsync]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    setAuth({ state: "unauthenticated" });
  }, []);

  return { auth, signIn, signOut };
}
