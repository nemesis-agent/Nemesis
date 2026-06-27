import type { Agent, AgentStatus, Proposal } from "@nemesis/db";

/** Escapes text for Telegram HTML parse mode. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
  const lines = [
    `<code>[ NEMESIS / ${escapeHtml(agentName.toLowerCase().replace(/\s+/g, "-"))} ]</code>`,
    `<b>${escapeHtml(proposal.title)}</b>`,
    "",
    ...proposal.details.map((d) => `${escapeHtml(d.label)}: <b>${escapeHtml(d.value)}</b>`),
    "",
    `propose: <b>${escapeHtml(proposal.proposedAction)}</b>`,
    `gas est.: ${escapeHtml(proposal.estimatedGasUsd)}`,
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
