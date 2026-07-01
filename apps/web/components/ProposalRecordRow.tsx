import type { Proposal, ProposalStatus } from "@nemesis/db";
import { summarizeExecutionPayload } from "@nemesis/execution";
import { ExecuteProposalButton } from "./ExecuteProposalButton";

const STATUS_STYLES: Record<ProposalStatus, string> = {
  pending: "text-nm-fragment-red border-nm-fragment-red",
  approved: "text-nm-resolve border-nm-resolve",
  skipped: "text-nm-muted border-nm-border",
};

const STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: "pending",
  approved: "approved",
  skipped: "skipped",
};

const EXPLAINABILITY_LABELS = new Set(["why", "observed", "approval check", "limitation"]);
const PRIORITY_DETAIL_LABELS = new Set(["wallet action", "asset", "chain", "current price", "target price", "review amount", "prepared buy", "prepared sell", "trigger", "drift"]);

interface ProposalRecordRowProps {
  proposal: Proposal;
}

function getCompletedStepCount(proposal: Proposal): number {
  const hashes = proposal.executionState?.completedTxHashes;
  return Array.isArray(hashes) ? hashes.length : 0;
}

function getReviewOnlyReason(proposal: Proposal, fallbackReason: string | null): string {
  const walletAction = proposal.details.find((detail) => detail.label.toLowerCase() === "wallet action")?.value;
  if (walletAction) return walletAction;
  return fallbackReason ?? "This template is currently review-only, so NEMESIS shows the proposal but does not open a wallet signing request.";
}

function lifecycleMessage(proposal: Proposal, execution: ReturnType<typeof summarizeExecutionPayload>, approvalLabel: string): string {
  if (proposal.status !== "pending") return `Proposal marked ${proposal.status}.`;
  if (execution.expired) return "Executable payload expired. Generate a fresh proposal before signing from your wallet.";
  if (!execution.executable) return getReviewOnlyReason(proposal, execution.reason);
  return `Ready for ${approvalLabel}. Confirm every wallet preview field before signing.`;
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "not executable";
  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs)) return "unknown";
  const seconds = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
  if (seconds === 0) return "expired";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function statusToneClass(proposal: Proposal, execution: ReturnType<typeof summarizeExecutionPayload>): string {
  if (proposal.status === "approved") return "border-nm-resolve text-nm-resolve";
  if (proposal.status === "skipped") return "border-nm-border text-nm-muted";
  if (execution.expired || execution.kind === "invalid") return "border-nm-fragment-red text-nm-fragment-red";
  if (execution.executable) return "border-nm-fragment-blue text-nm-fragment-blue";
  return "border-nm-border text-nm-muted";
}

function executionModeLabel(execution: ReturnType<typeof summarizeExecutionPayload>): string {
  if (execution.kind === "invalid") return "invalid payload";
  if (execution.expired) return "expired payload";
  if (execution.executable) return "wallet-signable";
  return "review-only";
}

export function ProposalRecordRow({ proposal }: ProposalRecordRowProps) {
  const explainabilityDetails = proposal.details.filter((detail) => EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const technicalDetails = proposal.details.filter((detail) => !EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const priorityDetails = technicalDetails.filter((detail) => PRIORITY_DETAIL_LABELS.has(detail.label.toLowerCase()));
  const secondaryDetails = technicalDetails.filter((detail) => !PRIORITY_DETAIL_LABELS.has(detail.label.toLowerCase()));
  const execution = summarizeExecutionPayload(proposal.unsignedTxPayload, getCompletedStepCount(proposal));
  const approvalLabel = execution.executable ? "wallet signature required" : "review only";
  const lifecycleCopy = lifecycleMessage(proposal, execution, approvalLabel);
  const toneClass = statusToneClass(proposal, execution);
  const completedStepCount = getCompletedStepCount(proposal);
  const remainingSteps = Math.max(0, execution.totalSteps - completedStepCount);

  const checklist = execution.executable
    ? [
        "Match the observed values against the wallet preview.",
        "Confirm network, token, recipient, value, calldata, fee, and route before signing.",
        "Reject the proposal if the preview differs or the market moved too far.",
      ]
    : [
        "Read the proposal and observed inputs manually.",
        "Do not expect a wallet popup for review-only proposals.",
        "Take any manual action outside NEMESIS only if it still matches your intent.",
      ];

  return (
    <div className="min-w-0 border border-nm-border bg-nm-bg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">
            {proposal.title}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {formatDate(proposal.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 ${STATUS_STYLES[proposal.status]}`}>
            {STATUS_LABELS[proposal.status]}
          </span>
          <span className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 ${toneClass}`}>
            {executionModeLabel(execution)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { label: "1 observed", value: priorityDetails[0]?.value ?? "condition matched" },
          { label: "2 proposal", value: proposal.proposedAction },
          { label: "3 approval", value: execution.executable ? execution.actionLabel : "manual review" },
        ].map((step) => (
          <div key={step.label} className="border border-nm-border/70 bg-black/20 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">{step.label}</p>
            <p className="mt-2 line-clamp-3 break-words text-sm leading-relaxed text-nm-muted">{step.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 border border-nm-border/70 p-3 sm:grid-cols-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">network</p>
          <p className="mt-1 text-xs text-nm-fg">{execution.networkLabel}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">step</p>
          <p className="mt-1 text-xs text-nm-fg">
            {execution.totalSteps > 0 ? `${Math.min(execution.currentStep, execution.totalSteps)}/${execution.totalSteps}` : "none"}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">remaining</p>
          <p className="mt-1 text-xs text-nm-fg">{remainingSteps}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">ttl</p>
          <p className={`mt-1 text-xs ${execution.expired ? "text-nm-fragment-red" : "text-nm-fg"}`}>{formatExpiry(execution.expiresAt)}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">gas</p>
          <p className="mt-1 text-xs text-nm-fg">{proposal.estimatedGasUsd}</p>
        </div>
      </div>

      {explainabilityDetails.length > 0 && (
        <div className="mt-3 border border-nm-border bg-black/20 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">decision trace</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {explainabilityDetails.map((detail) => (
              <div key={detail.label}>
                <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">{detail.label}</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-nm-muted">{detail.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {technicalDetails.length > 0 && (
        <div className="mt-3 border border-nm-border/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">observed inputs</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[...priorityDetails, ...secondaryDetails].map((detail) => (
              <div key={`${detail.label}:${detail.value}`} className="min-w-0 border border-nm-border/50 bg-black/10 p-2">
                <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">{detail.label}</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-nm-fg">{detail.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.1fr]">
        <div className="border border-nm-border/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">lifecycle</p>
          <p className={`mt-2 text-sm leading-relaxed ${execution.expired || execution.kind === "invalid" ? "text-nm-fragment-red" : "text-nm-muted"}`}>
            {lifecycleCopy}
          </p>
          {proposal.txHash && (
            <p className="mt-2 break-all font-mono text-[10px] uppercase tracking-widest2 text-nm-resolve">
              tx {proposal.txHash.slice(0, 8)}...{proposal.txHash.slice(-6)}
            </p>
          )}
        </div>

        <div className="border border-nm-border/70 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">approval checklist</p>
          <ul className="mt-2 grid gap-1 text-sm leading-relaxed text-nm-muted">
            {checklist.map((item) => (
              <li key={item} className="break-words">- {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-words text-sm text-nm-muted">
          {proposal.proposedAction}
          {proposal.status === "pending" && execution.expiresAt && (
            <span className={`ml-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest2 ${execution.expired ? "text-nm-fragment-red" : "text-nm-muted"}`}>
              expires {formatExpiry(execution.expiresAt)}
            </span>
          )}
        </p>
        {proposal.status === "pending" && (
          <ExecuteProposalButton proposal={proposal} />
        )}
      </div>
    </div>
  );
}
