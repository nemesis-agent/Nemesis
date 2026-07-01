import type { Agent, AgentStatus, Proposal } from "@nemesis/db";
import { summarizeExecutionPayload } from "@nemesis/execution";

/** Escapes text for Telegram HTML parse mode. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const EXPLAINABILITY_LABELS = new Set(["why", "observed", "approval check", "limitation"]);
const DIVIDER = "<code>------------------------------</code>";

const STATUS_LABELS: Record<AgentStatus, string> = {
  active: "ACTIVE",
  paused: "PAUSED",
  "awaiting-approval": "AWAITING APPROVAL",
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

function field(label: string, value: string): string {
  return `<code>${escapeHtml(label.padEnd(12, " "))}</code> ${value}`;
}

function cleanSlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "").slice(0, 42) || "agent";
}

export function formatProposalMessage(proposal: Proposal, agentName: string): string {
  const explainabilityDetails = proposal.details.filter((detail) => EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const technicalDetails = proposal.details.filter((detail) => !EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const execution = summarizeExecutionPayload(proposal.unsignedTxPayload, completedStepCount(proposal));
  const executionLine = execution.executable
    ? `${execution.networkLabel} / ${execution.totalSteps > 1 ? `step ${Math.min(execution.currentStep, execution.totalSteps)}/${execution.totalSteps}` : "wallet signature"}`
    : `${execution.networkLabel} / review only`;

  const lines = [
    `<code>[ NEMESIS / PROPOSAL / ${escapeHtml(cleanSlug(agentName))} ]</code>`,
    `<b>${escapeHtml(proposal.title)}</b>`,
    DIVIDER,
    "<b>decision trace</b>",
    ...(explainabilityDetails.length > 0
      ? explainabilityDetails.map((detail) => field(detail.label, escapeHtml(detail.value)))
      : [field("why", escapeHtml(proposal.proposedAction))]),
    "",
    "<b>observed inputs</b>",
    ...(technicalDetails.length > 0
      ? technicalDetails.slice(0, 8).map((detail) => field(detail.label, `<b>${escapeHtml(detail.value)}</b>`))
      : [field("inputs", "not supplied")]),
    "",
    "<b>proposal</b>",
    field("action", `<b>${escapeHtml(proposal.proposedAction)}</b>`),
    field("execution", `<b>${escapeHtml(executionLine)}</b>`),
    field("payload ttl", `<b>${escapeHtml(formatExpiry(execution.expiresAt))}</b>`),
    field("gas est", escapeHtml(proposal.estimatedGasUsd)),
    execution.executable
      ? field("approval", "<b>your wallet signature is required</b> - open dashboard, review preview, then sign")
      : field("approval", "<b>review only</b> - no wallet signature payload"),
  ];
  if (execution.reason) lines.push(field("note", escapeHtml(execution.reason)));
  lines.push(DIVIDER, "<i>agents propose. users approve. wallets sign.</i>");
  return lines.join("\n");
}

export function formatAgentLine(agent: Agent): string {
  return [
    `<code>[ NEMESIS / AGENT ]</code>`,
    `<b>${escapeHtml(agent.name)}</b>`,
    DIVIDER,
    field("status", `<b>${STATUS_LABELS[agent.status]}</b>`),
    field("agent", `<code>${escapeHtml(agent.id)}</code>`),
    field("last check", escapeHtml(agent.lastCheckedAt ?? "never")),
    field("last event", escapeHtml(agent.lastEvent ?? "not checked yet")),
  ].join("\n");
}