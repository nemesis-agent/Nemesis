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

function formatAge(createdAt: string): string {
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return "unknown";
  const seconds = Math.max(0, Math.floor((Date.now() - createdMs) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function field(label: string, valueHtml: string): string {
  return `<code>${escapeHtml(label.padEnd(12, " "))}</code> ${valueHtml}`;
}

function cleanSlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "").slice(0, 42) || "agent";
}

function firstDetail(details: Proposal["details"], label: string): string | null {
  return details.find((detail) => detail.label.toLowerCase() === label)?.value ?? null;
}

export function formatProposalMessage(proposal: Proposal, agentName: string): string {
  const explainabilityDetails = proposal.details.filter((detail) => EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const technicalDetails = proposal.details.filter((detail) => !EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const execution = summarizeExecutionPayload(proposal.unsignedTxPayload, completedStepCount(proposal));
  const executionLine = execution.executable
    ? `${execution.networkLabel} / ${execution.totalSteps > 1 ? `step ${Math.min(execution.currentStep, execution.totalSteps)}/${execution.totalSteps}` : "wallet signature"}`
    : `${execution.networkLabel} / review only`;
  const observed = firstDetail(proposal.details, "observed") ?? proposal.proposedAction;
  const approvalCheck = firstDetail(proposal.details, "approval check") ?? "Open dashboard and compare the preview before signing.";
  const limitation = firstDetail(proposal.details, "limitation") ?? "NEMESIS never signs or broadcasts from the server.";

  const lines = [
    `<code>[ NEMESIS / PROPOSAL / ${escapeHtml(cleanSlug(agentName))} ]</code>`,
    `<b>${escapeHtml(proposal.title)}</b>`,
    field("status", `<b>${proposal.status.toUpperCase()}</b>`),
    field("created", escapeHtml(formatAge(proposal.createdAt))),
    DIVIDER,
    "<b>review path</b>",
    field("1 observed", escapeHtml(observed)),
    field("2 proposal", `<b>${escapeHtml(proposal.proposedAction)}</b>`),
    field("3 approval", execution.executable ? "dashboard wallet preview, then user signature" : "manual dashboard review only"),
    "",
    "<b>execution window</b>",
    field("network", `<b>${escapeHtml(execution.networkLabel)}</b>`),
    field("mode", `<b>${escapeHtml(executionLine)}</b>`),
    field("payload ttl", `<b>${escapeHtml(formatExpiry(execution.expiresAt))}</b>`),
    field("gas est", escapeHtml(proposal.estimatedGasUsd)),
    "",
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
    "<b>approval boundary</b>",
    field("check", escapeHtml(approvalCheck)),
    field("limit", escapeHtml(limitation)),
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
