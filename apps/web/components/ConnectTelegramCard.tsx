"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";

type LinkState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "ready"; code: string; expiresAt: string }
  | { stage: "error"; message: string };

/**
 * Generates a one-time linking code for the connected wallet via
 * POST /api/link/generate, then shows it with instructions to send it to
 * the bot. This is the real, working half of the wallet↔Telegram linking
 * flow — see packages/db/src/links.ts and
 * apps/telegram-bot/src/commands/link.ts for the other half.
 */
export function ConnectTelegramCard() {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<LinkState>({ stage: "idle" });

  async function generateCode() {
    if (!address) return;
    setState({ stage: "loading" });
    try {
      const response = await fetch("/api/link/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const data = (await response.json()) as { code: string; expiresAt: string };
      setState({ stage: "ready", code: data.code, expiresAt: data.expiresAt });
    } catch (error) {
      setState({
        stage: "error",
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  return (
    <div className="border border-nm-border p-5">
      <p className="font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">connect telegram</p>
      <p className="mt-2 text-sm leading-relaxed text-nm-muted">
        Proposals are delivered on Telegram. Link your wallet to the bot to receive them.
      </p>

      <div className="mt-4">
        <FragmentDivider segments={16} />
      </div>

      {!isConnected && (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
          connect your wallet above first
        </p>
      )}

      {isConnected && state.stage === "idle" && (
        <div className="mt-4">
          <Button variant="primary" size="sm" magnetic onClick={generateCode}>
            Generate code
          </Button>
        </div>
      )}

      {isConnected && state.stage === "loading" && (
        <div className="mt-4 w-32">
          <FragmentDivider segments={12} loading />
        </div>
      )}

      {state.stage === "ready" && (
        <div className="mt-4">
          <p className="font-mono text-2xl font-bold tracking-widest2 text-nm-fragment-red">{state.code}</p>
          <p className="mt-2 text-sm leading-relaxed text-nm-muted">
            Send <code className="text-nm-fg">/link {state.code}</code> to the NEMESIS bot on Telegram. Code
            expires in 10 minutes.
          </p>
          <Button variant="secondary" size="sm" magnetic onClick={generateCode} className="mt-3">
            Generate new code
          </Button>
        </div>
      )}

      {state.stage === "error" && (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-nm-fragment-red">{state.message}</p>
          <Button variant="secondary" size="sm" magnetic onClick={generateCode} className="mt-3">
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
