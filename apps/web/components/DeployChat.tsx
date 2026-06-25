"use client";

import { useId, useState } from "react";

import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { RiskAcknowledgmentModal } from "@/components/RiskAcknowledgmentModal";
import { RiskBanner } from "@/components/RiskBanner";
import { fillApprovalSummary } from "@/lib/format-template";
import { matchTemplate } from "@/lib/match-template";
import { getTemplateById, type AgentTemplate } from "@nemesis/templates";

type MessageRole = "agent" | "user";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  plan?: AgentTemplate;
}

const INTRO_MESSAGE: ChatMessage = {
  id: "intro",
  role: "agent",
  content:
    "Tell me what you want to do — what you're holding, what you want to happen, and how much risk you're comfortable with. I'll read your wallet and propose which agents to deploy.",
};

interface DeployChatProps {
  /** Pre-selects a template, e.g. when arriving from the template gallery. */
  initialTemplateId?: string;
}

export function DeployChat({ initialTemplateId }: DeployChatProps) {
  const initialTemplate = initialTemplateId ? getTemplateById(initialTemplateId) : undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState(
    initialTemplate ? `Deploy a ${initialTemplate.name.toLowerCase()} for me.` : "",
  );
  const [stage, setStage] = useState<"idle" | "thinking" | "plan" | "deployed">("idle");
  const [pendingPlan, setPendingPlan] = useState<AgentTemplate | null>(null);
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const inputId = useId();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || stage === "thinking") return;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStage("thinking");

    const template = initialTemplate ?? matchTemplate(trimmed);

    // Simulated reasoning delay. Replace with a real call to the Master
    // Agent backend — see ARCHITECTURE.md, "Master Agent — intent
    // interpretation".
    window.setTimeout(() => {
      const planMessage: ChatMessage = {
        id: `plan-${Date.now()}`,
        role: "agent",
        content: `Here's what I'd propose:`,
        plan: template,
      };
      setMessages((prev) => [...prev, planMessage]);
      setPendingPlan(template);
      setStage("plan");
    }, 900);
  }

  function handleApproveClick() {
    if (!pendingPlan) return;
    if (pendingPlan.risk === "high" || pendingPlan.risk === "degen") {
      setRiskModalOpen(true);
      return;
    }
    handleApprove();
  }

  function handleApprove() {
    if (!pendingPlan) return;
    const confirmMessage: ChatMessage = {
      id: `deployed-${Date.now()}`,
      role: "agent",
      content: `Deployed. "${pendingPlan.name}" is now live and will appear on your dashboard. Proposals will be sent to your connected Telegram — you approve each one before it executes.`,
    };
    setMessages((prev) => [...prev, confirmMessage]);
    setPendingPlan(null);
    setStage("deployed");
  }

  function handleDecline() {
    if (!pendingPlan) return;
    const declineMessage: ChatMessage = {
      id: `declined-${Date.now()}`,
      role: "agent",
      content: "Got it — nothing was deployed. Tell me what you'd like to change and I'll propose a new plan.",
    };
    setMessages((prev) => [...prev, declineMessage]);
    setPendingPlan(null);
    setStage("idle");
  }

  return (
    <div className="border border-nm-border">
      <div className="flex flex-col gap-4 p-6">
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

            {message.plan && (
              <DeploymentPlanCard
                template={message.plan}
                showActions={stage === "plan" && pendingPlan?.id === message.plan.id}
                onApprove={handleApproveClick}
                onDecline={handleDecline}
              />
            )}
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-6 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Describe what you want your agent to do
        </label>
        <input
          id={inputId}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. I want to buy ETH whenever it drops 5%"
          className="flex-1 border border-nm-border bg-nm-surface px-4 py-3 text-sm text-nm-fg placeholder:text-nm-muted focus:border-nm-fg"
        />
        <Button type="submit" variant="primary" magnetic disabled={stage === "thinking" || !input.trim()}>
          Send
        </Button>
      </form>

      {riskModalOpen && pendingPlan && (
        <RiskAcknowledgmentModal
          template={pendingPlan}
          onConfirm={() => {
            setRiskModalOpen(false);
            handleApprove();
          }}
          onCancel={() => setRiskModalOpen(false)}
        />
      )}
    </div>
  );
}

interface DeploymentPlanCardProps {
  template: AgentTemplate;
  showActions: boolean;
  onApprove: () => void;
  onDecline: () => void;
}

function DeploymentPlanCard({ template, showActions, onApprove, onDecline }: DeploymentPlanCardProps) {
  return (
    <div className="mt-3 border border-nm-border bg-nm-surface p-4">
      <p className="font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">{template.name}</p>
      <p className="mt-2 text-sm leading-relaxed text-nm-muted">{fillApprovalSummary(template)}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {template.protocols.map((protocol) => (
          <span
            key={protocol}
            className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted"
          >
            {protocol}
          </span>
        ))}
      </div>

      {(template.risk === "high" || template.risk === "degen") && (
        <div className="mt-3">
          <RiskBanner template={template} />
        </div>
      )}

      {showActions && (
        <div className="mt-4 flex gap-3">
          <Button variant="resolve" size="sm" magnetic onClick={onApprove}>
            Approve &amp; deploy
          </Button>
          <Button variant="secondary" size="sm" magnetic onClick={onDecline}>
            Not this
          </Button>
        </div>
      )}
    </div>
  );
}
