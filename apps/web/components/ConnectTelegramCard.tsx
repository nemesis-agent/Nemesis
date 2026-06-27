"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { useSiweAuth } from "@/lib/use-siwe-auth";
import { useSolanaAuth } from "@/lib/use-solana-auth";

type LinkChain = "base" | "solana";

type LinkState =
  | { stage: "idle" }
  | { stage: "loading"; chain: LinkChain }
  | { stage: "ready"; code: string; expiresAt: string; chain: LinkChain }
  | { stage: "error"; message: string; chain?: LinkChain };

/**
 * Generates a one-time linking code for an authenticated wallet. The selected
 * chain is sent to the server so dual Base/Solana sessions link the intended
 * wallet instead of silently defaulting to Base.
 */
export function ConnectTelegramCard() {
  const { auth } = useSiweAuth();
  const { auth: solanaAuth } = useSolanaAuth();
  const [state, setState] = useState<LinkState>({ stage: "idle" });

  const baseAuthenticated = auth.state === "authenticated";
  const solanaAuthenticated = solanaAuth.state === "authenticated";
  const isAuthenticated = baseAuthenticated || solanaAuthenticated;
  const availableChains: LinkChain[] = [
    ...(baseAuthenticated ? (["base"] as const) : []),
    ...(solanaAuthenticated ? (["solana"] as const) : []),
  ];
  const telegramBotUsername = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "NemesisAgentAppBot").replace(/^@/, "");
  const telegramBotLabel = telegramBotUsername ? `@${telegramBotUsername}` : "the NEMESIS bot";
  const telegramBotUrl = telegramBotUsername ? `https://t.me/${telegramBotUsername}` : undefined;
  const telegramBotButtonClass = "inline-block select-none border border-nm-fragment-red px-4 py-2 text-center font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red transition-colors duration-200 hover:bg-nm-fragment-red hover:text-nm-bg";

  async function generateCode(chain: LinkChain) {
    setState({ stage: "loading", chain });
    try {
      const response = await fetch("/api/link/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain }),
      });
      if (response.status === 401) {
        setState({ stage: "error", chain, message: `Sign in with your ${chain === "solana" ? "Solana" : "Base"} wallet first.` });
        return;
      }
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const data = (await response.json()) as { code: string; expiresAt: string; chain?: LinkChain };
      setState({ stage: "ready", code: data.code, expiresAt: data.expiresAt, chain: data.chain ?? chain });
    } catch (error) {
      setState({
        stage: "error",
        chain,
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  const retryChain = state.stage === "error" && state.chain ? state.chain : availableChains[0];

  return (
    <div className="border border-nm-border p-5">
      <p className="font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">connect telegram</p>
      <p className="mt-2 text-sm leading-relaxed text-nm-muted">
        Proposals are delivered on Telegram. Link each wallet you want the bot to receive proposals for.
      </p>

      <div className="mt-4">
        <FragmentDivider segments={16} />
      </div>

      {!isAuthenticated && (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
          {auth.state === "loading" || solanaAuth.state === "loading" ? "checking session..." : "connect and sign in with your wallet above first"}
        </p>
      )}

      {isAuthenticated && state.stage === "idle" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {availableChains.map((chain) => (
            <Button key={chain} variant="primary" size="sm" magnetic onClick={() => generateCode(chain)}>
              {availableChains.length > 1 ? `Generate ${chain} code` : "Generate code"}
            </Button>
          ))}
          {telegramBotUrl && (
            <a className={telegramBotButtonClass} href={telegramBotUrl} target="_blank" rel="noreferrer">
              Open bot
            </a>
          )}
        </div>
      )}

      {state.stage === "loading" && (
        <div className="mt-4">
          <div className="w-32">
            <FragmentDivider segments={12} loading />
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            generating {state.chain} code...
          </p>
        </div>
      )}

      {state.stage === "ready" && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">{state.chain} wallet link code</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-widest2 text-nm-fragment-red">{state.code}</p>
          <p className="mt-2 text-sm leading-relaxed text-nm-muted">
            Send <code className="text-nm-fg">/link {state.code}</code> to{" "}
            {telegramBotUrl ? (
              <a className="text-nm-fg underline decoration-nm-border underline-offset-4" href={telegramBotUrl} target="_blank" rel="noreferrer">
                {telegramBotLabel}
              </a>
            ) : (
              telegramBotLabel
            )}{" "}
            on Telegram. Code expires in 10 minutes.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {telegramBotUrl && (
              <a className={telegramBotButtonClass} href={telegramBotUrl} target="_blank" rel="noreferrer">
                Open bot
              </a>
            )}
            <Button variant="secondary" size="sm" magnetic onClick={() => generateCode(state.chain)}>
              Generate new code
            </Button>
            {availableChains.filter((chain) => chain !== state.chain).map((chain) => (
              <Button key={chain} variant="secondary" size="sm" magnetic onClick={() => generateCode(chain)}>
                Generate {chain} code
              </Button>
            ))}
          </div>
        </div>
      )}

      {state.stage === "error" && (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-nm-fragment-red">{state.message}</p>
          {retryChain && (
            <Button variant="secondary" size="sm" magnetic onClick={() => generateCode(retryChain)} className="mt-3">
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}