"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";
import { RISK_LABELS, type AgentTemplate } from "@nemesis/templates";

interface RiskAcknowledgmentModalProps {
  template: AgentTemplate;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Blocking modal shown before a "high" or "degen" risk template can be
 * deployed. The user must tick the checkbox before "Deploy anyway"
 * becomes enabled - this is the interactive counterpart to RiskBanner.
 *
 * Caller is responsible for rendering this conditionally (i.e. only when
 * template.risk is "high" or "degen") and for restoring focus to a
 * sensible element in onCancel/onConfirm.
 */
export function RiskAcknowledgmentModal({ template, onConfirm, onCancel }: RiskAcknowledgmentModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const checkboxId = useId();
  const titleId = useId();

  useEffect(() => {
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="modal-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-nm-bg/80 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="modal-panel-in w-full max-w-md border border-nm-fragment-red bg-nm-bg p-6"
      >
        <p id={titleId} className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">
          {RISK_LABELS[template.risk]} risk — read before deploying
        </p>

        <h2 className="mt-2 font-mono text-sm font-bold uppercase tracking-widest2 text-nm-fg">
          {template.name}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-nm-muted">
          {template.riskNote ?? "This template carries elevated risk. Review the parameters carefully before deploying."}
        </p>

        <div className="mt-4">
          <FragmentDivider segments={16} />
        </div>

        <label htmlFor={checkboxId} className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-nm-fg">
          <input
            id={checkboxId}
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 border border-nm-border bg-nm-surface accent-nm-fragment-red"
          />
          <span>
            I understand this strategy can result in total loss of the funds I allocate to it, and that
            approving a proposal is my decision alone. This is not financial advice.
          </span>
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" size="sm" magnetic disabled={!acknowledged} onClick={onConfirm}>
            Deploy anyway
          </Button>
          <Button variant="secondary" size="sm" magnetic onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
