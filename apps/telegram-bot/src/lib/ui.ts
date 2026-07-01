import { Markup } from "telegraf";

import type { Agent, Proposal } from "@nemesis/db";
import { summarizeExecutionPayload } from "@nemesis/execution";
import { dashboardProposalUrl } from "./base-payload.js";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nemesis-agent.xyz").replace(/\/$/, "");

export const DASHBOARD_URL = `${SITE_URL}/dashboard`;
export function shortWallet(wallet: string): string {
  return wallet.startsWith("solana:")
    ? `${wallet.slice(0, 13)}...${wallet.slice(-4)}`
    : `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}


export function mainMenuKeyboard(linked: boolean) {
  return Markup.inlineKeyboard([
    [Markup.button.url("open dashboard", DASHBOARD_URL)],
    linked
      ? [Markup.button.callback("list agents", "menu:agents"), Markup.button.callback("status", "menu:status")]
      : [Markup.button.callback("how to link", "menu:link")],
    [Markup.button.callback("help", "menu:help")],
  ]);
}

export function linkedWalletKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url("open dashboard", DASHBOARD_URL)],
    [Markup.button.callback("list agents", "menu:agents"), Markup.button.callback("status", "menu:status")],
    [Markup.button.callback("help", "menu:help")],
  ]);
}

export function unlinkedWalletKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url("open dashboard", DASHBOARD_URL)],
    [Markup.button.callback("how to link", "menu:link"), Markup.button.callback("help", "menu:help")],
  ]);
}

export function agentKeyboard(agent: Agent) {
  const action = agent.status === "paused"
    ? Markup.button.callback("resume", `agent:resume:${agent.id}`)
    : Markup.button.callback("pause", `agent:pause:${agent.id}`);

  return Markup.inlineKeyboard([
    [Markup.button.callback("status", `agent:status:${agent.id}`), action],
    [Markup.button.url("open dashboard", DASHBOARD_URL)],
  ]);
}

export function proposalKeyboard(proposal: Proposal, agentId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.url("open in dashboard", dashboardProposalUrl(agentId))],
    [Markup.button.callback("acknowledge", `approve:${proposal.id}`), Markup.button.callback("skip proposal", `skip:${proposal.id}`)],
  ]);
}