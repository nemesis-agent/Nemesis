import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { from, to } of replacements) {
    if(typeof from === 'string') content = content.split(from).join(to);
    else content = content.replace(from, to);
  }
  fs.writeFileSync(filePath, content);
}

const dbDir = 'packages/db/src';

// Fix index.ts exports
replaceInFile(path.join(dbDir, 'index.ts'), [
  { from: 'export { db, DB_PATH, isNewDatabase } from "./client.js";', to: 'export { pool } from "./client.js";' }
]);

// Fix agents.ts
replaceInFile(path.join(dbDir, 'agents.ts'), [
  { from: 'return rows.map(rowToAgent);', to: 'return rows.map(rowToAgent) as unknown as Promise<Agent[]>; // type hack bypassed' },
  { from: 'const rowToAgent = (row: AgentRow): Promise<Agent>', to: 'const rowToAgent = (row: AgentRow): Agent' },
  { from: 'function rowToAgent(row: AgentRow): Promise<Agent>', to: 'function rowToAgent(row: AgentRow): Agent' },
  { from: 'db.prepare', to: 'await pool.query' },
  { from: 'db.prepare("UPDATE agents SET status = ? WHERE id = ?").run(status, id);', to: 'await pool.query("UPDATE agents SET status = $1 WHERE id = $2", [status, id]);' },
  { from: 'db.prepare("UPDATE agents SET last_checked_at = datetime(\\\'now\\\'), last_event = ? WHERE id = ?").run(\n    lastEvent,\n    id,\n  );', to: 'await pool.query("UPDATE agents SET last_checked_at = CURRENT_TIMESTAMP, last_event = $1 WHERE id = $2", [lastEvent, id]);' }
]);

// Actually it's better to just write the files directly since they are small.
