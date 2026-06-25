import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { from, to } of replacements) {
    content = content.replace(from, to);
  }
  fs.writeFileSync(filePath, content);
}

// 1. Refactor DB files
const dbDir = 'packages/db/src';

// agents.ts
replaceInFile(path.join(dbDir, 'agents.ts'), [
  { from: 'import { db } from "./client.js";', to: 'import { pool } from "./client.js";' },
  { from: 'export function listAgents()', to: 'export async function listAgents()' },
  { from: 'const rows = db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all() as unknown as AgentRow[];', to: 'const { rows } = await pool.query("SELECT * FROM agents ORDER BY created_at DESC");' },
  { from: 'export function listAgentsForWallet(walletAddress: string)', to: 'export async function listAgentsForWallet(walletAddress: string)' },
  { from: 'const rows = db\n    .prepare("SELECT * FROM agents WHERE wallet_address = ? ORDER BY created_at DESC")\n    .all(walletAddress) as unknown as AgentRow[];', to: 'const { rows } = await pool.query("SELECT * FROM agents WHERE wallet_address = $1 ORDER BY created_at DESC", [walletAddress]);' },
  { from: 'export function getAgent(id: string)', to: 'export async function getAgent(id: string)' },
  { from: 'const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow | undefined;', to: 'const { rows } = await pool.query("SELECT * FROM agents WHERE id = $1", [id]);\n  const row = rows[0] as AgentRow | undefined;' },
  { from: 'export function createAgent(input: CreateAgentInput)', to: 'export async function createAgent(input: CreateAgentInput)' },
  { from: 'db.prepare(\n    `INSERT INTO agents (id, wallet_address, template_id, name, status, parameters, last_event)\n     VALUES (?, ?, ?, ?, \\\'active\\\', ?, \\\'Deployed — waiting for first monitoring cycle\\\')`,\n  ).run(id, input.walletAddress, input.templateId, input.name, JSON.stringify(input.parameters ?? {}));', to: 'await pool.query(\n    `INSERT INTO agents (id, wallet_address, template_id, name, status, parameters, last_event)\n     VALUES ($1, $2, $3, $4, \\\'active\\\', $5, \\\'Deployed — waiting for first monitoring cycle\\\')`,\n    [id, input.walletAddress, input.templateId, input.name, JSON.stringify(input.parameters ?? {})]\n  );' },
  { from: 'const created = getAgent(id);', to: 'const created = await getAgent(id);' },
  { from: 'export function setAgentStatus(id: string, status: AgentStatus)', to: 'export async function setAgentStatus(id: string, status: AgentStatus)' },
  { from: 'db.prepare("UPDATE agents SET status = ? WHERE id = ?").run(status, id);', to: 'await pool.query("UPDATE agents SET status = $1 WHERE id = $2", [status, id]);' },
  { from: 'return getAgent(id);', to: 'return getAgent(id);' }, // getAgent returns promise now
  { from: 'export function recordAgentCheck(id: string, lastEvent: string)', to: 'export async function recordAgentCheck(id: string, lastEvent: string)' },
  { from: 'db.prepare("UPDATE agents SET last_checked_at = datetime(\\\'now\\\'), last_event = ? WHERE id = ?").run(\n    lastEvent,\n    id,\n  );', to: 'await pool.query("UPDATE agents SET last_checked_at = CURRENT_TIMESTAMP, last_event = $1 WHERE id = $2", [lastEvent, id]);' }
]);

// proposals.ts
replaceInFile(path.join(dbDir, 'proposals.ts'), [
  { from: 'import { db } from "./client.js";', to: 'import { pool } from "./client.js";' },
  { from: 'export function listProposalsForAgent(agentId: string)', to: 'export async function listProposalsForAgent(agentId: string)' },
  { from: 'const rows = db\n    .prepare("SELECT * FROM proposals WHERE agent_id = ? ORDER BY created_at DESC")\n    .all(agentId) as unknown as ProposalRow[];', to: 'const { rows } = await pool.query("SELECT * FROM proposals WHERE agent_id = $1 ORDER BY created_at DESC", [agentId]);' },
  { from: 'export function getProposal(id: string)', to: 'export async function getProposal(id: string)' },
  { from: 'const row = db.prepare("SELECT * FROM proposals WHERE id = ?").get(id) as ProposalRow | undefined;', to: 'const { rows } = await pool.query("SELECT * FROM proposals WHERE id = $1", [id]);\n  const row = rows[0] as ProposalRow | undefined;' },
  { from: 'export function createProposal(input: CreateProposalInput)', to: 'export async function createProposal(input: CreateProposalInput)' },
  { from: 'db.prepare(\n    `INSERT INTO proposals (id, agent_id, title, details, proposed_action, estimated_gas_usd, status)\n     VALUES (?, ?, ?, ?, ?, ?, \\\'pending\\\')`,\n  ).run(id, input.agentId, input.title, JSON.stringify(input.details), input.proposedAction, input.estimatedGasUsd);', to: 'await pool.query(\n    `INSERT INTO proposals (id, agent_id, title, details, proposed_action, estimated_gas_usd, status)\n     VALUES ($1, $2, $3, $4, $5, $6, \\\'pending\\\')`,\n    [id, input.agentId, input.title, JSON.stringify(input.details), input.proposedAction, input.estimatedGasUsd]\n  );' },
  { from: 'const created = getProposal(id);', to: 'const created = await getProposal(id);' },
  { from: 'export function approveProposal(id: string, txHash?: string)', to: 'export async function approveProposal(id: string, txHash?: string)' },
  { from: 'db.prepare("UPDATE proposals SET status = \\\'approved\\\', tx_hash = ? WHERE id = ?").run(txHash ?? null, id);', to: 'await pool.query("UPDATE proposals SET status = \\\'approved\\\', tx_hash = $1 WHERE id = $2", [txHash ?? null, id]);' },
  { from: 'return getProposal(id);', to: 'return getProposal(id);' },
  { from: 'export function skipProposal(id: string)', to: 'export async function skipProposal(id: string)' },
  { from: 'db.prepare("UPDATE proposals SET status = \\\'skipped\\\' WHERE id = ?").run(id);', to: 'await pool.query("UPDATE proposals SET status = \\\'skipped\\\' WHERE id = $1", [id]);' }
]);

// links.ts
replaceInFile(path.join(dbDir, 'links.ts'), [
  { from: 'import { db } from "./client.js";', to: 'import { pool } from "./client.js";' },
  { from: 'export function generateLinkCode(walletAddress: string)', to: 'export async function generateLinkCode(walletAddress: string)' },
  { from: 'db.prepare("INSERT OR IGNORE INTO users (wallet_address) VALUES (?)").run(walletAddress);', to: 'await pool.query("INSERT INTO users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING", [walletAddress]);' },
  { from: 'while (db.prepare("SELECT 1 FROM link_codes WHERE code = ? AND used_at IS NULL").get(code))', to: 'while ((await pool.query("SELECT 1 FROM link_codes WHERE code = $1 AND used_at IS NULL", [code])).rowCount > 0)' },
  { from: 'db.prepare("INSERT INTO link_codes (code, wallet_address, expires_at) VALUES (?, ?, ?)").run(\n    code,\n    walletAddress,\n    expiresAt,\n  );', to: 'await pool.query("INSERT INTO link_codes (code, wallet_address, expires_at) VALUES ($1, $2, $3)", [code, walletAddress, expiresAt]);' },
  { from: 'export function consumeLinkCode(code: string, telegramChatId: string)', to: 'export async function consumeLinkCode(code: string, telegramChatId: string)' },
  { from: 'const row = db.prepare("SELECT * FROM link_codes WHERE code = ?").get(code) as LinkCodeRow | undefined;', to: 'const { rows } = await pool.query("SELECT * FROM link_codes WHERE code = $1", [code]);\n  const row = rows[0] as LinkCodeRow | undefined;' },
  { from: 'db.prepare("UPDATE link_codes SET used_at = datetime(\\\'now\\\') WHERE code = ?").run(code);', to: 'await pool.query("UPDATE link_codes SET used_at = CURRENT_TIMESTAMP WHERE code = $1", [code]);' },
  { from: 'db.prepare("UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = ? AND wallet_address != ?").run(\n    telegramChatId,\n    row.wallet_address,\n  );', to: 'await pool.query("UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = $1 AND wallet_address != $2", [telegramChatId, row.wallet_address]);' },
  { from: 'db.prepare("UPDATE users SET telegram_chat_id = ? WHERE wallet_address = ?").run(\n    telegramChatId,\n    row.wallet_address,\n  );', to: 'await pool.query("UPDATE users SET telegram_chat_id = $1 WHERE wallet_address = $2", [telegramChatId, row.wallet_address]);' },
  { from: 'export function getTelegramChatIdForWallet(walletAddress: string)', to: 'export async function getTelegramChatIdForWallet(walletAddress: string)' },
  { from: 'const row = db\n    .prepare("SELECT telegram_chat_id FROM users WHERE wallet_address = ?")\n    .get(walletAddress) as { telegram_chat_id: string | null } | undefined;', to: 'const { rows } = await pool.query("SELECT telegram_chat_id FROM users WHERE wallet_address = $1", [walletAddress]);\n  const row = rows[0] as { telegram_chat_id: string | null } | undefined;' },
  { from: 'export function getWalletForTelegramChatId(telegramChatId: string)', to: 'export async function getWalletForTelegramChatId(telegramChatId: string)' },
  { from: 'const row = db\n    .prepare("SELECT wallet_address FROM users WHERE telegram_chat_id = ?")\n    .get(telegramChatId) as { wallet_address: string } | undefined;', to: 'const { rows } = await pool.query("SELECT wallet_address FROM users WHERE telegram_chat_id = $1", [telegramChatId]);\n  const row = rows[0] as { wallet_address: string } | undefined;' },
  { from: 'export function isWalletLinked(walletAddress: string): boolean {', to: 'export async function isWalletLinked(walletAddress: string): Promise<boolean> {' },
  { from: 'return getTelegramChatIdForWallet(walletAddress) !== undefined;', to: 'return (await getTelegramChatIdForWallet(walletAddress)) !== undefined;' }
]);

console.log('Database layer migrated to async pg');
