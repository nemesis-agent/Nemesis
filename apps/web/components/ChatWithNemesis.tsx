"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";

type MessageRole = "agent" | "user";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

const INTRO_MESSAGE: ChatMessage = {
  id: "intro",
  role: "agent",
  content:
    "I am NEMESIS. Ask naturally about NEMESIS, crypto automation, Base, Solana, or anything else. I will not handle secrets, private keys, tokens, or private user data.",
};

const SUGGESTED_PROMPTS = [
  "Explain NEMESIS like I am new.",
  "Which templates are wallet-signable?",
  "How do Base and Solana proposals differ?",
  "What should I never paste into this chat?",
  "Help me think through a safe agent setup.",
];

const SECRET_LIKE_INPUT = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk-or-v1-|sk-[a-z0-9_-]{16,})|\b\d{8,12}:[A-Za-z0-9_-]{25,}|(?:seed|recovery|mnemonic|private\s*key)\s*[:=])/i;

export function ChatWithNemesis() {
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<"idle" | "thinking">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, stage]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
  }, [input]);

  async function sendMessage(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || stage === "thinking") return;

    if (SECRET_LIKE_INPUT.test(trimmed)) {
      const timestamp = Date.now();
      setMessages((current) => [
        ...current,
        { id: `user-${timestamp}`, role: "user", content: "[redacted sensitive input]" },
        {
          id: `guard-${timestamp}`,
          role: "agent",
          content:
            "Do not paste API keys, bot tokens, private keys, seed phrases, recovery phrases, or other credentials here. Revoke anything you already exposed, then ask again without the secret.",
        },
      ]);
      setInput("");
      return;
    }
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setStage("thinking");

    try {
      const conversation = nextMessages
        .filter((message) => message.id !== "intro")
        .slice(-40)
        .map((message) => ({
          role: message.role === "agent" ? "assistant" : "user",
          content: message.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error ?? "NEMESIS could not answer.");

      setMessages((current) => [
        ...current,
        { id: `agent-${Date.now()}`, role: "agent", content: data.reply! },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "agent",
          content: error instanceof Error ? `${error.message} Try again in a moment, or ask a shorter version while the brain reconnects.` : "NEMESIS could not answer right now. Try again in a moment.",
        },
      ]);
    } finally {
      setStage("idle");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(input);
  }

  return (
    <div className="border border-nm-border bg-nm-bg">
      <div
        ref={scrollRef}
        className="flex flex-col gap-5 overflow-y-auto p-6"
        style={{ maxHeight: "480px", scrollbarWidth: "thin", scrollBehavior: "smooth" }}
        aria-live="polite"
      >
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[88%]" : "max-w-[88%]"}>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
              {message.role === "user" ? "you" : "nemesis"}
            </p>
            <p className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
              message.role === "user" ? "text-nm-fg" : "text-nm-muted"
            }`}>
              {message.content}
            </p>
          </div>
        ))}

        {stage === "thinking" && (
          <div className="max-w-[88%]">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">nemesis</p>
            <p className="mt-1 text-sm leading-relaxed text-nm-muted">thinking with public NEMESIS context...</p>
            <div className="mt-3 w-32">
              <FragmentDivider segments={12} loading />
            </div>
          </div>
        )}
      </div>

      <FragmentDivider />

      <div className="bg-nm-surface p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="border border-nm-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted transition-colors hover:border-nm-fragment-red hover:text-nm-fg disabled:opacity-50"
              disabled={stage === "thinking"}
              onClick={() => void sendMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label htmlFor={inputId} className="sr-only">Ask NEMESIS</label>
          <textarea
            ref={textareaRef}
            id={inputId}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(input);
              }
            }}
            rows={3}
            autoComplete="off"
            placeholder="Ask NEMESIS anything. Shift + Enter for a new line. Do not paste secrets or private keys."
            className="min-h-28 flex-1 resize-none border border-nm-border bg-nm-bg px-4 py-3 text-sm leading-relaxed text-nm-fg placeholder:text-nm-muted focus:border-nm-fg focus:outline-none"
          />
          <Button type="submit" variant="primary" magnetic disabled={stage === "thinking" || !input.trim()}>
            Ask
          </Button>
        </form>
      </div>
    </div>
  );
}
