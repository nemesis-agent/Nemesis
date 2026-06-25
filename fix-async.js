import fs from 'fs';
import path from 'path';
import { globSync } from 'glob'; // wait I dont have glob... I will use recursion
function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBUSY') filelist.push(dirFile);
    }
  });
  return filelist;
}

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { from, to } of replacements) {
    if(typeof from === 'string') content = content.split(from).join(to);
    else content = content.replace(from, to);
  }
  fs.writeFileSync(filePath, content);
}

// 1. Fix types in DB
const dbDir = 'packages/db/src';
replaceInFile(path.join(dbDir, 'agents.ts'), [
  { from: '): Agent[] {', to: '): Promise<Agent[]> {' },
  { from: '): Agent | undefined {', to: '): Promise<Agent | undefined> {' },
  { from: '): Agent {', to: '): Promise<Agent> {' },
  { from: '): void {', to: '): Promise<void> {' }
]);
replaceInFile(path.join(dbDir, 'proposals.ts'), [
  { from: '): Proposal[] {', to: '): Promise<Proposal[]> {' },
  { from: '): Proposal | undefined {', to: '): Promise<Proposal | undefined> {' },
  { from: '): Proposal {', to: '): Promise<Proposal> {' }
]);
replaceInFile(path.join(dbDir, 'links.ts'), [
  { from: '): { code: string; expiresAt: string } {', to: '): Promise<{ code: string; expiresAt: string }> {' },
  { from: '): ConsumeLinkResult {', to: '): Promise<ConsumeLinkResult> {' },
  { from: '): string | undefined {', to: '): Promise<string | undefined> {' }
]);

// 2. Add await in apps/web and apps/telegram-bot
const files = [...walkSync('apps/web'), ...walkSync('apps/telegram-bot')].filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  
  c = c.replace(/listAgents\(\)/g, 'await listAgents()');
  c = c.replace(/listAgentsForWallet\((.*?)\)/g, 'await listAgentsForWallet($1)');
  c = c.replace(/getAgent\((.*?)\)/g, 'await getAgent($1)');
  c = c.replace(/createAgent\((.*?)\)/g, 'await createAgent($1)');
  c = c.replace(/setAgentStatus\((.*?)\)/g, 'await setAgentStatus($1)');
  c = c.replace(/recordAgentCheck\((.*?)\)/g, 'await recordAgentCheck($1)');
  
  c = c.replace(/listProposalsForAgent\((.*?)\)/g, 'await listProposalsForAgent($1)');
  c = c.replace(/getProposal\((.*?)\)/g, 'await getProposal($1)');
  c = c.replace(/createProposal\((.*?)\)/g, 'await createProposal($1)');
  c = c.replace(/approveProposal\((.*?)\)/g, 'await approveProposal($1)');
  c = c.replace(/skipProposal\((.*?)\)/g, 'await skipProposal($1)');
  
  c = c.replace(/generateLinkCode\((.*?)\)/g, 'await generateLinkCode($1)');
  c = c.replace(/consumeLinkCode\((.*?)\)/g, 'await consumeLinkCode($1)');
  c = c.replace(/getTelegramChatIdForWallet\((.*?)\)/g, 'await getTelegramChatIdForWallet($1)');
  c = c.replace(/getWalletForTelegramChatId\((.*?)\)/g, 'await getWalletForTelegramChatId($1)');
  c = c.replace(/isWalletLinked\((.*?)\)/g, 'await isWalletLinked($1)');

  // Fix "await await" if it already had one
  c = c.replace(/await await/g, 'await');

  fs.writeFileSync(file, c);
}
console.log('Fixed types and added awaits');
