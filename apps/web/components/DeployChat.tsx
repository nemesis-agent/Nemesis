"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { RiskAcknowledgmentModal } from "@/components/RiskAcknowledgmentModal";
import { RiskBanner } from "@/components/RiskBanner";
import { fillApprovalSummary } from "@/lib/format-template";
import { matchTemplate } from "@/lib/match-template";
import { useSiweAuth } from "@/lib/use-siwe-auth";
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
  const router = useRouter();
  const { isConnected } = useAccount();
  const { auth, signIn } = useSiweAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState(
    initialTemplate ? `Deploy a ${initialTemplate.name.toLowerCase()} for me.` : "",
  );
  const [stage, setStage] = useState<"idle" | "thinking" | "plan" | "deploying" | "deployed">("idle");
  const [pendingPlan, setPendingPlan] = useState<AgentTemplate | null>(null);
  const [pendingParams, setPendingParams] = useState<Record<string, string | number | boolean>>({});
  const [riskModalOpen, setRiskModalOpen] = useState(false);

  // Auto sign-in when wallet connects and session is unauthenticated.
  useEffect(() => {
    if (isConnected && auth.state === "unauthenticated") {
      setSigningIn(true);
      setSignInError(null);
      signIn()
        .catch((err: unknown) => {
          setSignInError(err instanceof Error ? err.message : "Signature cancelled.");
        })
        .finally(() => setSigningIn(false));
    }
    // Only trigger on auth state change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, auth.state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || stage === "thinking") return;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStage("thinking");

    const template = initialTemplate ?? matchTemplate(trimmed);

    // Simulated reasoning delay — replace with Hermes call in Phase 5.
    window.setTimeout(() => {
      const planMessage: ChatMessage = {
        id: `plan-${Date.now()}`,
        role: "agent",
        content: `Here's what I'd propose:`,
        plan: template,
      };
      setMessages((prev) => [...prev, planMessage]);
      setPendingPlan(template);
      
      // Initialize pending parameters with their defaults
      const defaults: Record<string, string | number | boolean> = {};
      if (template.parameters) {
        for (const param of template.parameters) {
          defaults[param.key] = param.default;
        }
      }
      setPendingParams(defaults);
      
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

  async function handleApprove() {
    if (!pendingPlan) return;

    setStage("deploying");

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: pendingPlan.id, parameters: pendingParams }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? `Deploy failed (${res.status})`);
      }

      const data = (await res.json()) as { agent: { id: string; name: string } };

      const confirmMessage: ChatMessage = {
        id: `deployed-${Date.now()}`,
        role: "agent",
        content: `Deployed. "${data.agent.name}" is now live and will appear on your dashboard. Proposals will be sent to your connected Telegram — you approve each one before it executes.`,
      };
      setMessages((prev) => [...prev, confirmMessage]);
      setPendingPlan(null);
      setPendingParams({});
      setStage("deployed");

      // Redirect to the new agent's page after a short delay.
      window.setTimeout(() => {
        router.push(`/agents/${data.agent.id}`);
        router.refresh();
      }, 1800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deployment failed.";
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "agent",
        content: `Error: ${message} Please try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setPendingPlan(null);
      setPendingParams({});
      setStage("idle");
    }
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
    setPendingParams({});
    setStage("idle");
  }

  const isAuthenticated = auth.state === "authenticated";
  const isLoading = auth.state === "loading" || signingIn;

  return (
    <div className="border border-nm-border">
      <div className="flex flex-col gap-4 p-6">
        {/* Auth status banner */}
        {isConnected && isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-24">
              <FragmentDivider segments={8} loading />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
              {signingIn ? "waiting for signature…" : "checking session…"}
            </span>
          </div>
        )}
        {signInError && (
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">
            {signInError} — reload to try again.
          </p>
        )}

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
                pendingParams={stage === "plan" && pendingPlan?.id === message.plan.id ? pendingParams : {}}
                setPendingParams={setPendingParams}
              />
            )}
          </div>
        ))}

        {(stage === "thinking" || stage === "deploying") && (
          <div className="max-w-[85%]">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">master agent</p>
            <div className="mt-3 w-32">
              <FragmentDivider segments={12} loading />
            </div>
            {stage === "deploying" && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                writing to chain…
              </p>
            )}
          </div>
        )}
      </div>

      <FragmentDivider />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-6 sm:flex-row">
        <label htmlFor="deploy-chat-input" className="sr-only">
          Describe what you want your agent to do
        </label>
        <input
          id="deploy-chat-input"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            !isConnected
              ? "connect your wallet first"
              : !isAuthenticated
                ? "sign in with your wallet to deploy"
                : "e.g. I want to buy ETH whenever it drops 5%"
          }
          disabled={!isConnected || !isAuthenticated || stage === "thinking" || stage === "deploying"}
          className="flex-1 border border-nm-border bg-nm-surface px-4 py-3 text-sm text-nm-fg placeholder:text-nm-muted focus:border-nm-fg disabled:opacity-50"
        />
        <Button
          type="submit"
          variant="primary"
          magnetic
          disabled={!isConnected || !isAuthenticated || stage === "thinking" || stage === "deploying" || !input.trim()}
        >
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
  pendingParams?: Record<string, string | number | boolean>;
  setPendingParams?: React.Dispatch<React.SetStateAction<Record<string, string | number | boolean>>>;
}

function DeploymentPlanCard({
  template,
  showActions,
  onApprove,
  onDecline,
  pendingParams,
  setPendingParams,
}: DeploymentPlanCardProps) {
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

      {showActions && template.parameters && template.parameters.length > 0 && pendingParams && setPendingParams && (
        <div className="mt-4 flex flex-col gap-3 border-t border-nm-border pt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fg">Parameters</p>
          {template.parameters.map((param) => (
            <div key={param.key} className="flex flex-col gap-1">
              <label htmlFor={`param-${param.key}`} className="font-mono text-[10px] uppercase text-nm-muted">
                {param.label} {param.unit ? `(${param.unit})` : ""}
              </label>
              {param.type === "boolean" ? (
                <div className="flex items-center gap-2">
                  <input
                    id={`param-${param.key}`}
                    type="checkbox"
                    checked={Boolean(pendingParams[param.key])}
                    onChange={(e) =>
                      setPendingParams((prev) => ({ ...prev, [param.key]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-nm-border bg-nm-bg text-nm-fg focus:ring-nm-fg"
                  />
                  <span className="text-xs text-nm-fg">{param.description}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <input
                    id={`param-${param.key}`}
                    type={param.type === "address" ? "text" : "number"}
                    value={pendingParams[param.key] as string | number}
                    onChange={(e) => {
                      const val = param.type === "address" ? e.target.value : Number(e.target.value);
                      setPendingParams((prev) => ({ ...prev, [param.key]: val }));
                    }}
                    className="border border-nm-border bg-nm-bg px-2 py-1 text-sm text-nm-fg focus:border-nm-fg"
                  />
                  {param.description && <span className="text-[10px] text-nm-muted">{param.description}</span>}
                </div>
              )}
            </div>
          ))}
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
