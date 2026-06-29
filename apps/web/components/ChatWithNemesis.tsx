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
    "I am the NEMESIS Master Agent. Ask naturally about NEMESIS, crypto automation, Base, Solana, or anything else. I will not handle secrets, private keys, tokens, or private user data.",
};

export function ChatWithNemesis() {
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<"idle" | "thinking">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, stage]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || stage === "thinking") return;

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
        .slice(-10)
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
          content: error instanceof Error ? error.message : "NEMESIS could not answer right now.",
        },
      ]);
    } finally {
      setStage("idle");
    }
  }

  return (
    <div className="border border-nm-border bg-nm-bg">
      <div
        ref={scrollRef}
        className="flex flex-col gap-5 overflow-y-auto p-6"
        style={{ maxHeight: "400px", scrollbarWidth: "thin", scrollBehavior: "smooth" }}
        aria-live="polite"
      >
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[85%]"}>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
              {message.role === "user" ? "you" : "master agent"}
            </p>
            <p className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
              message.role === "user" ? "text-nm-fg" : "text-nm-muted"
            }`}>
              {message.content}
            </p>
          </div>
        ))}

        {stage === "thinking" && (
          <div className="max-w-[85%]">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">master agent</p>
            <div className="mt-3 w-32">
              <FragmentDivider segments={12} loading />
            </div>
          </div>
        )}
      </div>

      <FragmentDivider />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 bg-nm-surface p-6 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">Ask NEMESIS</label>
        <input
          id={inputId}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={1_000}
          autoComplete="off"
          placeholder="Ask NEMESIS anything. Do not paste secrets or private keys."
          className="flex-1 border border-nm-border bg-nm-bg px-4 py-3 text-sm text-nm-fg placeholder:text-nm-muted focus:border-nm-fg focus:outline-none"
        />
        <Button type="submit" variant="primary" magnetic disabled={stage === "thinking" || !input.trim()}>
          Ask
        </Button>
      </form>
    </div>
  );
}
