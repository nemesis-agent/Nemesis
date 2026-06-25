import { randomUUID } from "node:crypto";

import { db } from "./client.js";

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
  last_checked_at: string | null;
  last_event: string | null;
  created_at: string;
}

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    templateId: row.template_id,
    name: row.name,
    status: row.status,
    parameters: JSON.parse(row.parameters),
    lastCheckedAt: row.last_checked_at,
    lastEvent: row.last_event,
    createdAt: row.created_at,
  };
}

export function listAgents(): Agent[] {
  const rows = db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all() as unknown as AgentRow[];
  return rows.map(rowToAgent);
}

export function listAgentsForWallet(walletAddress: string): Agent[] {
  const rows = db
    .prepare("SELECT * FROM agents WHERE wallet_address = ? ORDER BY created_at DESC")
    .all(walletAddress) as unknown as AgentRow[];
  return rows.map(rowToAgent);
}

export function getAgent(id: string): Agent | undefined {
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow | undefined;
  return row ? rowToAgent(row) : undefined;
}

export interface CreateAgentInput {
  walletAddress: string;
  templateId: string;
  name: string;
  parameters?: Record<string, string | number | boolean>;
}

export function createAgent(input: CreateAgentInput): Agent {
  const id = `agent_${randomUUID().slice(0, 8)}`;
  db.prepare(
    `INSERT INTO agents (id, wallet_address, template_id, name, status, parameters, last_event)
     VALUES (?, ?, ?, ?, 'active', ?, 'Deployed — waiting for first monitoring cycle')`,
  ).run(id, input.walletAddress, input.templateId, input.name, JSON.stringify(input.parameters ?? {}));

  const created = getAgent(id);
  if (!created) {
    throw new Error(`Failed to read back newly created agent ${id}`);
  }
  return created;
}

export function setAgentStatus(id: string, status: AgentStatus): Agent | undefined {
  db.prepare("UPDATE agents SET status = ? WHERE id = ?").run(status, id);
  return getAgent(id);
}

export function recordAgentCheck(id: string, lastEvent: string): void {
  db.prepare("UPDATE agents SET last_checked_at = datetime('now'), last_event = ? WHERE id = ?").run(
    lastEvent,
    id,
  );
}
