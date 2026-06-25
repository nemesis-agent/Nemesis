import { randomUUID } from "node:crypto";

import { pool } from "./client.js";

export type AgentStatus = "active" | "paused" | "awaiting-approval";

export interface Agent {
  id: string;
  walletAddress: string;
  templateId: string;
  name: string;
  status: AgentStatus;
  parameters: Record<string, string | number | boolean>;
  lastCheckedAt: string | null;
  lastEvent: string | null;
  createdAt: string;
}

interface AgentRow {
  id: string;
  wallet_address: string;
  template_id: string;
  name: string;
  status: AgentStatus;
  parameters: string;
  last_checked_at: Date | null;
  last_event: string | null;
  created_at: Date;
}

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    templateId: row.template_id,
    name: row.name,
    status: row.status,
    parameters: JSON.parse(row.parameters),
    lastCheckedAt: row.last_checked_at ? row.last_checked_at.toISOString() : null,
    lastEvent: row.last_event,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listAgents(): Promise<Agent[]> {
  const { rows } = await pool.query("SELECT * FROM agents ORDER BY created_at DESC");
  return (rows as AgentRow[]).map(rowToAgent);
}

export async function listAgentsForWallet(walletAddress: string): Promise<Agent[]> {
  const { rows } = await pool.query("SELECT * FROM agents WHERE wallet_address = $1 ORDER BY created_at DESC", [walletAddress]);
  return (rows as AgentRow[]).map(rowToAgent);
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  const { rows } = await pool.query("SELECT * FROM agents WHERE id = $1", [id]);
  const row = rows[0] as AgentRow | undefined;
  return row ? rowToAgent(row) : undefined;
}

export interface CreateAgentInput {
  walletAddress: string;
  templateId: string;
  name: string;
  parameters?: Record<string, string | number | boolean>;
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const id = `agent_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO agents (id, wallet_address, template_id, name, status, parameters, last_event)
     VALUES ($1, $2, $3, $4, 'active', $5, 'Deployed — waiting for first monitoring cycle')`,
    [id, input.walletAddress, input.templateId, input.name, JSON.stringify(input.parameters ?? {})]
  );

  const created = await getAgent(id);
  if (!created) {
    throw new Error(`Failed to read back newly created agent ${id}`);
  }
  return created;
}

export async function setAgentStatus(id: string, status: AgentStatus): Promise<Agent | undefined> {
  await pool.query("UPDATE agents SET status = $1 WHERE id = $2", [status, id]);
  return getAgent(id);
}

export async function recordAgentCheck(id: string, lastEvent: string): Promise<void> {
  await pool.query("UPDATE agents SET last_checked_at = CURRENT_TIMESTAMP, last_event = $1 WHERE id = $2", [lastEvent, id]);
}
