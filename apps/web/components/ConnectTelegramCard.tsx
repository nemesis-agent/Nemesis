"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { useSiweAuth } from "@/lib/use-siwe-auth";

type LinkState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "ready"; code: string; expiresAt: string }
  | { stage: "error"; message: string };

/**
 * Generates a one-time linking code for the connected + authenticated wallet.
 * Now secured via SIWE session — the server reads the wallet from the cookie
 * rather than trusting a body parameter (Phase 1 security fix).
 */
export function ConnectTelegramCard() {
  const { auth } = useSiweAuth();
  const [state, setState] = useState<LinkState>({ stage: "idle" });

  const isAuthenticated = auth.state === "authenticated";
  const telegramBotUsername = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "NemesisAgentAppBot").replace(/^@/, "");
  const telegramBotLabel = telegramBotUsername ? `@${telegramBotUsername}` : "the NEMESIS bot";
  const telegramBotUrl = telegramBotUsername ? `https://t.me/${telegramBotUsername}` : undefined;
  const telegramBotButtonClass = "inline-block select-none border border-nm-fragment-red px-4 py-2 text-center font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red transition-colors duration-200 hover:bg-nm-fragment-red hover:text-nm-bg";

  async function generateCode() {
    setState({ stage: "loading" });
    try {
      const response = await fetch("/api/link/generate", { method: "POST" });
      if (response.status === 401) {
        setState({ stage: "error", message: "Sign in with your wallet first." });
        return;
      }
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

      {!isAuthenticated && (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
          {auth.state === "loading" ? "checking session…" : "connect and sign in with your wallet above first"}
        </p>
      )}

      {isAuthenticated && state.stage === "idle" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" magnetic onClick={generateCode}>
            Generate code
          </Button>
          {telegramBotUrl && (
            <a className={telegramBotButtonClass} href={telegramBotUrl} target="_blank" rel="noreferrer">
              Open bot
            </a>
          )}
        </div>
      )}

      {isAuthenticated && state.stage === "loading" && (
        <div className="mt-4 w-32">
          <FragmentDivider segments={12} loading />
        </div>
      )}

      {state.stage === "ready" && (
        <div className="mt-4">
          <p className="font-mono text-2xl font-bold tracking-widest2 text-nm-fragment-red">{state.code}</p>
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
              <a
                className={telegramBotButtonClass}
                href={telegramBotUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open bot
              </a>
            )}
            <Button variant="secondary" size="sm" magnetic onClick={generateCode}>
              Generate new code
            </Button>
          </div>
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
