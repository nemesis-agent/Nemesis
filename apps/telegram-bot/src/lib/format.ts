import type { Agent, AgentStatus, Proposal } from "@nemesis/db";

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

/**
 * Renders a proposal in the brand's terminal-derived style: a bracketed
 * header, then key/value detail lines in monospace. Now uses the real
 * Proposal type from @nemesis/db rather than the deleted mock shape.
 */
export function formatProposalMessage(proposal: Proposal, agentName: string): string {
  const explainabilityDetails = proposal.details.filter((detail) => EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
  const technicalDetails = proposal.details.filter((detail) => !EXPLAINABILITY_LABELS.has(detail.label.toLowerCase()));
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
    `gas est.: ${escapeHtml(proposal.estimatedGasUsd)}`,
    "approval: <b>your wallet signature is required</b>",
  ];
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
