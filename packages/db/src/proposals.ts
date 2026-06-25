import { randomUUID } from "node:crypto";

import { db } from "./client.js";

export type ProposalStatus = "pending" | "approved" | "skipped";

export interface ProposalDetail {
  label: string;
  value: string;
}

export interface Proposal {
  id: string;
  agentId: string;
  title: string;
  details: ProposalDetail[];
  proposedAction: string;
  estimatedGasUsd: string;
  status: ProposalStatus;
  txHash: string | null;
  createdAt: string;
}

interface ProposalRow {
  id: string;
  agent_id: string;
  title: string;
  details: string;
  proposed_action: string;
  estimated_gas_usd: string;
  status: ProposalStatus;
  tx_hash: string | null;
  created_at: string;
}

function rowToProposal(row: ProposalRow): Proposal {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    details: JSON.parse(row.details),
    proposedAction: row.proposed_action,
    estimatedGasUsd: row.estimated_gas_usd,
    status: row.status,
    txHash: row.tx_hash,
    createdAt: row.created_at,
  };
}

export function listProposalsForAgent(agentId: string): Proposal[] {
  const rows = db
    .prepare("SELECT * FROM proposals WHERE agent_id = ? ORDER BY created_at DESC")
    .all(agentId) as unknown as ProposalRow[];
  return rows.map(rowToProposal);
}

export function getProposal(id: string): Proposal | undefined {
  const row = db.prepare("SELECT * FROM proposals WHERE id = ?").get(id) as ProposalRow | undefined;
  return row ? rowToProposal(row) : undefined;
}

export interface CreateProposalInput {
  agentId: string;
  title: string;
  details: ProposalDetail[];
  proposedAction: string;
  estimatedGasUsd: string;
}

export function createProposal(input: CreateProposalInput): Proposal {
  const id = `prop_${randomUUID().slice(0, 8)}`;
  db.prepare(
    `INSERT INTO proposals (id, agent_id, title, details, proposed_action, estimated_gas_usd, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
  ).run(id, input.agentId, input.title, JSON.stringify(input.details), input.proposedAction, input.estimatedGasUsd);

  const created = getProposal(id);
  if (!created) {
    throw new Error(`Failed to read back newly created proposal ${id}`);
  }
  return created;
}

/**
 * Marks a proposal approved. `txHash` should only be supplied once a real
 * execution layer exists (see ARCHITECTURE.md, "Sub-agents — propose via
 * Base MCP") — until then this records the approval decision without a
 * real transaction behind it.
 */
export function approveProposal(id: string, txHash?: string): Proposal | undefined {
  db.prepare("UPDATE proposals SET status = 'approved', tx_hash = ? WHERE id = ?").run(txHash ?? null, id);
  return getProposal(id);
}

export function skipProposal(id: string): Proposal | undefined {
  db.prepare("UPDATE proposals SET status = 'skipped' WHERE id = ?").run(id);
  return getProposal(id);
}
