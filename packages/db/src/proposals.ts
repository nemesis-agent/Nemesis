import { randomUUID } from "node:crypto";

import { pool } from "./client.js";

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
  unsignedTxPayload: string | null;
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
  unsigned_tx_payload: string | null;
  created_at: Date;
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
    unsignedTxPayload: row.unsigned_tx_payload,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listProposalsForAgent(agentId: string): Promise<Proposal[]> {
  const { rows } = await pool.query("SELECT * FROM proposals WHERE agent_id = $1 ORDER BY created_at DESC", [agentId]);
  return (rows as ProposalRow[]).map(rowToProposal);
}

export async function getProposal(id: string): Promise<Proposal | undefined> {
  const { rows } = await pool.query("SELECT * FROM proposals WHERE id = $1", [id]);
  const row = rows[0] as ProposalRow | undefined;
  return row ? rowToProposal(row) : undefined;
}

export interface CreateProposalInput {
  agentId: string;
  title: string;
  details: ProposalDetail[];
  proposedAction: string;
  estimatedGasUsd: string;
  unsignedTxPayload?: string;
}

export async function createProposal(input: CreateProposalInput): Promise<Proposal> {
  const id = `prop_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO proposals (id, agent_id, title, details, proposed_action, estimated_gas_usd, unsigned_tx_payload, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
    [id, input.agentId, input.title, JSON.stringify(input.details), input.proposedAction, input.estimatedGasUsd, input.unsignedTxPayload ?? null]
  );

  const created = await getProposal(id);
  if (!created) {
    throw new Error(`Failed to read back newly created proposal ${id}`);
  }
  return created;
}

export async function approveProposal(id: string, txHash?: string): Promise<Proposal | undefined> {
  await pool.query("UPDATE proposals SET status = 'approved', tx_hash = $1 WHERE id = $2", [txHash ?? null, id]);
  return getProposal(id);
}

export async function skipProposal(id: string): Promise<Proposal | undefined> {
  await pool.query("UPDATE proposals SET status = 'skipped' WHERE id = $1", [id]);
  return getProposal(id);
}
