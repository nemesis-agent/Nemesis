import type { Proposal, ProposalStatus } from "@nemesis/db";

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

interface ProposalRecordRowProps {
  proposal: Proposal;
}

export function ProposalRecordRow({ proposal }: ProposalRecordRowProps) {
  return (
    <div className="border border-nm-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">
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
        {proposal.details.map((detail) => (
          <span key={detail.label} className="font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
            {detail.label}:{" "}
            <span className="text-nm-fg">{detail.value}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-nm-muted">
          {proposal.proposedAction}
          <span className="ml-2 font-mono text-[10px] text-nm-muted">
            gas ~{proposal.estimatedGasUsd}
          </span>
        </p>
        {proposal.txHash && (
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-nm-resolve">
            tx {proposal.txHash}
          </span>
        )}
      </div>
    </div>
  );
}
