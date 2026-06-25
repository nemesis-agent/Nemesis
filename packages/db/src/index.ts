export { db, DB_PATH, isNewDatabase } from "./client.js";

export {
  listAgents,
  listAgentsForWallet,
  getAgent,
  createAgent,
  setAgentStatus,
  recordAgentCheck,
  type Agent,
  type AgentStatus,
  type CreateAgentInput,
} from "./agents.js";

export {
  listProposalsForAgent,
  getProposal,
  createProposal,
  approveProposal,
  skipProposal,
  type Proposal,
  type ProposalStatus,
  type ProposalDetail,
  type CreateProposalInput,
} from "./proposals.js";

export {
  generateLinkCode,
  consumeLinkCode,
  getTelegramChatIdForWallet,
  getWalletForTelegramChatId,
  isWalletLinked,
  type ConsumeLinkResult,
} from "./links.js";
