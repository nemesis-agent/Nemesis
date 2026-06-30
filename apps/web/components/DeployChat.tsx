"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { RiskAcknowledgmentModal } from "@/components/RiskAcknowledgmentModal";
import { RiskBanner } from "@/components/RiskBanner";
import { fillApprovalSummary } from "@/lib/format-template";
import { useSiweAuth } from "@/lib/use-siwe-auth";
import { useSolanaAuth } from "@/lib/use-solana-auth";
import { getTemplateById, getTemplateChain, getTemplateUnavailableReason, isTemplateProductionReady, type AgentTemplate } from "@nemesis/templates";

type MessageRole = "agent" | "user";

interface PendingPlan {
  id: string; // unique instance id
  template: AgentTemplate;
  params: Record<string, any>;
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  plans?: PendingPlan[];
}

const INTRO_MESSAGE: ChatMessage = {
  id: "intro",
  role: "agent",
  content:
    "Tell me what you want to do - what you're holding, what you want to happen, and how much risk you're comfortable with. I'll read your wallet and propose which agents to deploy.",
};

interface DeployChatProps {
  /** Pre-selects a template, e.g. when arriving from the template gallery. */
  initialTemplateId?: string;
}

export function DeployChat({ initialTemplateId }: DeployChatProps) {
  const initialTemplate = initialTemplateId ? getTemplateById(initialTemplateId) : undefined;
  const router = useRouter();
  const { isConnected } = useAccount();
  const { connected: isSolanaConnected } = useWallet();
  const { auth, signIn } = useSiweAuth();
  const { auth: solanaAuth, signIn: signInSolana } = useSolanaAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [solanaSigningIn, setSolanaSigningIn] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState(
    initialTemplate ? `Deploy a ${initialTemplate.name.toLowerCase()} for me.` : "",
  );
  const [stage, setStage] = useState<"idle" | "thinking" | "plan" | "deploying">("idle");
  const [pendingPlans, setPendingPlans] = useState<PendingPlan[]>([]);
  const [riskModalPlan, setRiskModalPlan] = useState<PendingPlan | null>(null);

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

  useEffect(() => {
    if (isSolanaConnected && solanaAuth.state === "unauthenticated") {
      setSolanaSigningIn(true);
      setSignInError(null);
      signInSolana()
        .catch((err: unknown) => {
          setSignInError(err instanceof Error ? err.message : "Solana signature cancelled.");
        })
        .finally(() => setSolanaSigningIn(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSolanaConnected, solanaAuth.state]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || stage === "thinking") return;

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setStage("thinking");

    if (initialTemplate && trimmed.toLowerCase().includes("deploy a")) {
      finalizePlan([{ templateId: initialTemplate.id, parameters: {} }], "Here's what I'd propose:");
      return;
    }

    try {
      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));
      
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        throw new Error("NEMESIS planner is unavailable.");
      }

      const { intent } = await res.json();
      finalizePlan(intent.plans || [], intent.reasoning);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "agent",
        content: `Failed to analyze intent: ${err.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStage("idle");
    }
  }

  function finalizePlan(extractedPlans: Array<{ templateId: string; parameters: Record<string, any> }>, reasoning: string) {
    const plans: PendingPlan[] = [];
    
    for (const extracted of extractedPlans) {
      const template = getTemplateById(extracted.templateId);
      if (template) {
        const defaults: Record<string, any> = {};
        if (template.parameters) {
          for (const param of template.parameters) {
            defaults[param.key] = extracted.parameters[param.key] !== undefined ? extracted.parameters[param.key] : param.default;
          }
        }
        plans.push({ id: `${template.id}-${Date.now()}-${Math.random()}`, template, params: defaults });
      }
    }

    if (plans.length === 0) {
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "agent", content: "I couldn't find a matching strategy for that." }]);
      setStage("idle");
      return;
    }

    const planMessage: ChatMessage = {
      id: `plan-${Date.now()}`,
      role: "agent",
      content: reasoning || "Here's what I'd propose:",
      plans: plans,
    };
    
    setMessages((prev) => [...prev, planMessage]);
    setPendingPlans(plans);
    setStage("plan");
  }

  function handleApproveClick(plan: PendingPlan) {
    if (!isTemplateProductionReady(plan.template)) {
      setMessages((prev) => [
        ...prev,
        {
          id: `gated-${Date.now()}`,
          role: "agent",
          content: getTemplateUnavailableReason(plan.template),
        },
      ]);
      return;
    }

    if (plan.template.risk === "high" || plan.template.risk === "degen") {
      setRiskModalPlan(plan);
      return;
    }
    handleApprove(plan);
  }

  async function handleApprove(plan: PendingPlan) {
    setStage("deploying");

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: plan.template.id, parameters: plan.params }),
      });

      if (!res.ok) {
        throw new Error(`Deploy failed (${res.status})`);
      }

      const data = (await res.json()) as { agent: { id: string; name: string } };

      const confirmMessage: ChatMessage = {
        id: `deployed-${Date.now()}`,
        role: "agent",
        content: `Deployed. "${data.agent.name}" is now live and will appear on your dashboard. Proposals will be sent to your connected Telegram.`,
      };
      setMessages((prev) => [...prev, confirmMessage]);
      
      setPendingPlans((prev) => {
        const remaining = prev.filter((p) => p.id !== plan.id);
        if (remaining.length === 0) setStage("idle");
        return remaining;
      });

      // Redirect if this was the only or last plan
      window.setTimeout(() => {
        router.push(`/agents/${data.agent.id}`);
        router.refresh();
      }, 1800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deployment failed.";
      setMessages((prev) => [...prev, { id: `error-${Date.now()}`, role: "agent", content: `Error: ${message}` }]);
      setStage("idle");
    }
  }

  function handleDecline(planId: string) {
    const declineMessage: ChatMessage = {
      id: `declined-${Date.now()}`,
      role: "agent",
      content: "Got it - I've discarded that plan.",
    };
    setMessages((prev) => [...prev, declineMessage]);
    
    setPendingPlans((prev) => {
      const remaining = prev.filter((p) => p.id !== planId);
      if (remaining.length === 0) setStage("idle");
      return remaining;
    });
  }

  const isAuthenticated = auth.state === "authenticated" || solanaAuth.state === "authenticated";
  const anyWalletConnected = isConnected || isSolanaConnected;
  const isLoading = auth.state === "loading" || solanaAuth.state === "loading" || signingIn || solanaSigningIn;

  return (
    <div className="border border-nm-border">
      <div className="flex flex-col gap-4 p-6">
        {/* Auth status banner */}
        {anyWalletConnected && isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-24">
              <FragmentDivider segments={8} loading />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
              {signingIn || solanaSigningIn ? "waiting for signature..." : "checking session..."}
            </span>
          </div>
        )}
        {signInError && (
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">
            {signInError} - reload to try again.
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

            {message.plans && message.plans.map((plan) => (
              <DeploymentPlanCard
                key={plan.id}
                template={plan.template}
                showActions={stage === "plan" && pendingPlans.some(p => p.id === plan.id)}
                onApprove={() => handleApproveClick(plan)}
                onDecline={() => handleDecline(plan.id)}
                pendingParams={pendingPlans.find(p => p.id === plan.id)?.params}
                onChangeParam={(key, val) => {
                  setPendingPlans(prev => prev.map(p => p.id === plan.id ? { ...p, params: { ...p.params, [key]: val } } : p));
                }}
              />
            ))}
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
                creating agent...
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
            !anyWalletConnected
              ? "connect Base or Solflare first"
              : !isAuthenticated
                ? "sign in with your wallet to deploy"
                : "e.g. I want to buy ETH whenever it drops 5%"
          }
          disabled={!anyWalletConnected || !isAuthenticated || stage === "thinking" || stage === "deploying"}
          className="flex-1 border border-nm-border bg-nm-surface px-4 py-3 text-sm text-nm-fg placeholder:text-nm-muted focus:border-nm-fg disabled:opacity-50"
        />
        <Button
          type="submit"
          variant="primary"
          magnetic
          disabled={!anyWalletConnected || !isAuthenticated || stage === "thinking" || stage === "deploying" || !input.trim()}
        >
          Send
        </Button>
      </form>

      {riskModalPlan && (
        <RiskAcknowledgmentModal
          template={riskModalPlan.template}
          onConfirm={() => {
            handleApprove(riskModalPlan);
            setRiskModalPlan(null);
          }}
          onCancel={() => setRiskModalPlan(null)}
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
  onChangeParam?: (key: string, value: string | number | boolean) => void;
}

function DeploymentPlanCard({
  template,
  showActions,
  onApprove,
  onDecline,
  pendingParams,
  onChangeParam,
}: DeploymentPlanCardProps) {
  return (
    <div className="mt-3 border border-nm-border bg-nm-surface p-4">
      <p className="font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">{template.name}</p>
      <p className="mt-2 text-sm leading-relaxed text-nm-muted">{fillApprovalSummary(template, pendingParams)}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="border border-nm-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
          {getTemplateChain(template)}
        </span>
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

      {showActions && template.parameters && template.parameters.length > 0 && pendingParams && onChangeParam && (
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
                    onChange={(e) => onChangeParam(param.key, e.target.checked)}
                    className="h-4 w-4 rounded border-nm-border bg-nm-bg text-nm-fg focus:ring-nm-fg"
                  />
                  <span className="text-xs text-nm-fg">{param.description}</span>
                </div>
              ) : param.type === "select" ? (
                <div className="flex flex-col gap-1">
                  <select
                    id={`param-${param.key}`}
                    value={String(pendingParams[param.key])}
                    onChange={(e) => onChangeParam(param.key, e.target.value)}
                    className="border border-nm-border bg-nm-bg px-2 py-1 text-sm text-nm-fg focus:border-nm-fg"
                  >
                    {param.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {param.description && <span className="text-[10px] text-nm-muted">{param.description}</span>}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <input
                    id={`param-${param.key}`}
                    type={param.type === "address" ? "text" : "number"}
                    min={param.type === "address" ? undefined : param.min}
                    max={param.type === "address" ? undefined : param.max}
                    step={param.type === "address" ? undefined : param.type === "number" ? "any" : "0.01"}
                    value={pendingParams[param.key] as string | number}
                    onChange={(e) => {
                      const val = param.type === "address" ? e.target.value : Number(e.target.value);
                      onChangeParam(param.key, val);
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
          <Button
            variant="resolve"
            size="sm"
            magnetic
            onClick={onApprove}
            disabled={!isTemplateProductionReady(template)}
          >
            {isTemplateProductionReady(template) ? "Approve & deploy" : "gated"}
          </Button>
          <Button variant="secondary" size="sm" magnetic onClick={onDecline}>
            Not this
          </Button>
        </div>
      )}
    </div>
  );
}
