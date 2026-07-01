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

export function ProposalRecordRow({ proposal }: ProposalRecordRowProps) {
  const explainabilityDetails = proposal.details.filter((detail) => EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const technicalDetails = proposal.details.filter((detail) => !EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const execution = summarizeExecutionPayload(proposal.unsignedTxPayload, getCompletedStepCount(proposal));
  const approvalLabel = execution.executable ? "wallet signature required" : "review only";
  const lifecycleCopy = lifecycleMessage(proposal, execution, approvalLabel);

  return (
    <div className="min-w-0 border border-nm-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">
            {proposal.title}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {new Date(proposal.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 ${STATUS_STYLES[proposal.status]}`}
        >
          {STATUS_LABELS[proposal.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        {technicalDetails.map((detail) => (
          <span key={detail.label} className="min-w-0 break-words font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {detail.label}:{" "}
            <span className="break-words text-nm-fg">{detail.value}</span>
          </span>
        ))}
      </div>

      {explainabilityDetails.length > 0 && (
        <div className="mt-3 border border-nm-border bg-black/20 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">decision trace</p>
          <div className="mt-2 grid gap-2">
            {explainabilityDetails.map((detail) => (
              <div key={detail.label}>
                <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">{detail.label}</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-nm-muted">{detail.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-2 border border-nm-border/70 p-3 sm:grid-cols-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">created</p>
          <p className="mt-1 text-xs text-nm-fg">{new Date(proposal.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">status</p>
          <p className="mt-1 text-xs text-nm-fg">{STATUS_LABELS[proposal.status]}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">execution</p>
          <p className="mt-1 text-xs text-nm-fg">
            {execution.networkLabel}{execution.totalSteps > 1 ? ` ${Math.min(execution.currentStep, execution.totalSteps)}/${execution.totalSteps}` : ""}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">approval</p>
          <p className="mt-1 text-xs text-nm-fg">{execution.expired ? "payload expired" : approvalLabel}</p>
        </div>
      </div>

      <div className="mt-3 border border-nm-border/70 p-3">
        <p className={`text-sm leading-relaxed ${execution.expired ? "text-nm-fragment-red" : "text-nm-muted"}`}>
          {lifecycleCopy}
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-words text-sm text-nm-muted">
          {proposal.proposedAction}
          <span className="ml-2 whitespace-nowrap font-mono text-[10px] text-nm-muted">
            gas ~{proposal.estimatedGasUsd}
          </span>
          {proposal.status === "pending" && execution.expiresAt && (
            <span className={`ml-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest2 ${execution.expired ? "text-nm-fragment-red" : "text-nm-muted"}`}>
              expires {formatExpiry(execution.expiresAt)}
            </span>
          )}
        </p>
        {proposal.txHash && (
          <span className="break-all font-mono text-[10px] uppercase tracking-widest2 text-nm-resolve">
            tx {proposal.txHash.slice(0, 8)}...{proposal.txHash.slice(-6)}
          </span>
        )}
        {proposal.status === "pending" && (
          <ExecuteProposalButton proposal={proposal} />
        )}
      </div>
    </div>
  );
}
