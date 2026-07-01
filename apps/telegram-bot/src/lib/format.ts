import type { Agent, AgentStatus, Proposal } from "@nemesis/db";
import { summarizeExecutionPayload } from "@nemesis/execution";

/** Escapes text for Telegram HTML parse mode. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const EXPLAINABILITY_LABELS = new Set(["why", "observed", "approval check", "limitation"]);

const STATUS_LABELS: Record<AgentStatus, string> = {
  active: "active",
  paused: "paused",
  "awaiting-approval": "awaiting approval",
};

function completedStepCount(proposal: Proposal): number {
  const hashes = proposal.executionState?.completedTxHashes;
  return Array.isArray(hashes) ? hashes.length : 0;
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "none";
  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs)) return "unknown";
  const seconds = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
  if (seconds === 0) return "expired";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
}

/**
 * Renders a proposal in the brand's terminal-derived style: a bracketed
 * header, then key/value detail lines in monospace. Now uses the real
 * Proposal type from @nemesis/db rather than the deleted mock shape.
 */
export function formatProposalMessage(proposal: Proposal, agentName: string): string {
  const explainabilityDetails = proposal.details.filter((detail) => EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const technicalDetails = proposal.details.filter((detail) => !EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const execution = summarizeExecutionPayload(proposal.unsignedTxPayload, completedStepCount(proposal));
  const executionLine = execution.executable
    ? `${execution.networkLabel} / ${execution.totalSteps > 1 ? `step ${Math.min(execution.currentStep, execution.totalSteps)}/${execution.totalSteps}` : "wallet signature"}`
    : `${execution.networkLabel} / review only`;
  const lines = [
    `<code>[ NEMESIS / ${escapeHtml(agentName.toLowerCase().replace(/\s+/g, "-"))} ]</code>`,
    `<b>${escapeHtml(proposal.title)}</b>`,
    "",
    "<b>why</b>",
    ...(explainabilityDetails.length > 0
      ? explainabilityDetails.map((detail) => `${escapeHtml(detail.label)}: ${escapeHtml(detail.value)}`)
      : [escapeHtml(proposal.proposedAction)]),
    "",
    "<b>observed inputs</b>",
    ...technicalDetails.slice(0, 8).map((detail) => `${escapeHtml(detail.label)}: <b>${escapeHtml(detail.value)}</b>`),
    "",
    `propose: <b>${escapeHtml(proposal.proposedAction)}</b>`,
    `execution: <b>${escapeHtml(executionLine)}</b>`,
    execution.expiresAt ? `payload ttl: <b>${escapeHtml(formatExpiry(execution.expiresAt))}</b>` : "payload ttl: <b>none</b>",
    `gas est.: ${escapeHtml(proposal.estimatedGasUsd)}`,
    execution.executable
      ? "approval: <b>your wallet signature is required - open dashboard, review wallet preview, then sign</b>"
      : "approval: <b>review only - no wallet signature payload</b>",
  ];
  if (execution.reason) lines.push(`note: ${escapeHtml(execution.reason)}`);
  return lines.join("\n");
}

export function formatAgentLine(agent: Agent): string {
  return [
    `<b>${escapeHtml(agent.name)}</b> - ${STATUS_LABELS[agent.status]}`,
    `<code>${escapeHtml(agent.id)}</code>`,
    escapeHtml(agent.lastEvent ?? "Not checked yet"),
    `last checked ${escapeHtml(agent.lastCheckedAt ?? "never")}`,
  ].join("\n");
}