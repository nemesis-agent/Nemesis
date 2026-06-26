"use client";

import { useId, useState, useEffect, useRef } from "react";

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
    "I am the Master Agent. I orchestrate the chaos of the market into order. Ask me anything about NEMESIS, sub-agents, or our approval-first architecture.",
};

const KNOWLEDGE_BASE = [
  {
    keywords: ["what", "nemesis", "explain", "who"],
    reply: "NEMESIS is an autonomous agent platform on Base. You describe your intent, and I deploy specialized sub-agents to monitor the market and propose actions on your behalf. We orchestrate chaos into order.",
  },
  {
    keywords: ["safe", "funds", "wallet", "custody", "steal", "hack", "private"],
    reply: "NEMESIS never holds your keys or custodies your assets. The architecture is approval-first: agents can propose transactions, but your wallet must explicitly approve before anything moves.",
  },
  {
    keywords: ["master", "agent", "sub", "sub-agent", "template", "how"],
    reply: "I am the Master Agent. When you give me an intent, I interpret it and select specific production templates, like Dip Buyer or Portfolio Rebalancer. Deployed sub-agents monitor one condition and create approval-first proposals for your wallet to review.",
  },
  {
    keywords: ["hermes", "nous", "llm", "ai", "model"],
    reply: "My reasoning layer is designed around Hermes-style agents. I interpret plain-language intent and map it to deterministic NEMESIS templates before any proposal reaches your wallet.",
  },
  {
    keywords: ["base", "mcp", "chain", "network", "coinbase"],
    reply: "NEMESIS supports Base and Solana. Base templates can include verified payloads where safe; Solana templates are review-only for now, with final approval staying in your wallet.",
  },
];

const FALLBACK_REPLIES = [
  "I am designed to turn intent into approval-first proposals. What else would you like to know about the architecture?",
  "An interesting query. NEMESIS fundamentally changes how you interact with DeFi by abstracting the complexity into plain-language intents.",
  "I focus primarily on orchestrating market strategies. If you want to inspect the system, review the template library, dashboard, terms, and privacy policy.",
];

export function ChatWithNemesis() {
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<"idle" | "thinking">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, stage]);

  function getMockReply(userInput: string): string {
    const lowerInput = userInput.toLowerCase();
    
    for (const kb of KNOWLEDGE_BASE) {
      if (kb.keywords.some((kw) => lowerInput.includes(kw))) {
        return kb.reply;
      }
    }
    
    return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)]!;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || stage === "thinking") return;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStage("thinking");

    // Simulated reasoning delay
    window.setTimeout(() => {
      const replyContent = getMockReply(trimmed);
      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: "agent",
        content: replyContent,
      };
      setMessages((prev) => [...prev, agentMessage]);
      setStage("idle");
    }, 1200 + Math.random() * 800); // 1.2s to 2s delay for "thinking" realism
  }

  return (
    <div className="border border-nm-border bg-nm-bg">
      <div 
        ref={scrollRef}
        className="flex flex-col gap-5 overflow-y-auto p-6"
        style={{ maxHeight: "400px", scrollbarWidth: "thin", scrollBehavior: "smooth" }}
      >
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[85%]"}>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
              {message.role === "user" ? "you" : "master agent"}
            </p>
            <p
              className={`mt-1 text-sm leading-relaxed ${
                message.role === "user" ? "text-nm-fg" : "text-nm-muted"
              }`}
            >
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-6 sm:flex-row bg-nm-surface">
        <label htmlFor={inputId} className="sr-only">
          Ask NEMESIS
        </label>
        <input
          id={inputId}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. What is NEMESIS? Are my funds safe?"
          className="flex-1 border border-nm-border bg-nm-bg px-4 py-3 text-sm text-nm-fg placeholder:text-nm-muted focus:border-nm-fg focus:outline-none"
        />
        <Button type="submit" variant="primary" magnetic disabled={stage === "thinking" || !input.trim()}>
          Ask
        </Button>
      </form>
    </div>
  );
}
