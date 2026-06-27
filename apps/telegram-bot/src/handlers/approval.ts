import type { Telegraf, Context } from "telegraf";
import { Markup } from "telegraf";

import {
  createProposal,
  getAgent,
  getProposal,
  getWalletForTelegramChatId,
  listAgentsForWallet,
  skipProposal,
  type Proposal,
} from "@nemesis/db";
import { buildWalletSignatureCheckPayload, dashboardProposalUrl } from "../lib/base-payload.js";
import { escapeHtml, formatProposalMessage } from "../lib/format.js";

/**
 * Sends a proposal to a chat with Approve / Skip buttons. Call this from
 * your agent runtime when a sub-agent's condition is met, passing the
 * Telegram chat ID retrieved via await getTelegramChatIdForWallet().
 */
export async function sendProposal(
  bot: Telegraf,
  chatId: number | string,
  proposal: Proposal,
  agentName: string,
): Promise<void> {
  await bot.telegram.sendMessage(chatId, formatProposalMessage(proposal, agentName), {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      Markup.button.callback("approve", `approve:${proposal.id}`),
      Markup.button.callback("skip", `skip:${proposal.id}`),
    ]),
  });
}

/**
 * /demo - creates a REAL pending proposal in the database against the
 * first available agent, then sends it here. This lets you verify the
 * full flow (Telegram message -> approve/skip -> DB updated) without a
 * running agent runner.
 */
export async function demoCommand(ctx: Context): Promise<void> {
  const wallet = await getWalletForTelegramChatId(String(ctx.chat?.id ?? ""));
  if (!wallet) {
    await ctx.reply("Link this chat from the dashboard first with /link <code>.");
    return;
  }

  const agents = await listAgentsForWallet(wallet);
  const agent = agents[0];

  if (!agent) {
    await ctx.reply("No agents in your wallet yet. Deploy one from the dashboard first.");
    return;
  }

  const proposal = await createProposal({
    agentId: agent.id,
    title: "Demo signal detected",
    details: [
      { label: "network", value: "Base mainnet" },
      { label: "liquidity", value: "$48,200" },
      { label: "holders", value: "312" },
      { label: "payload", value: "zero-value wallet signature check" },
    ],
    proposedAction: "Sign a zero-value Base wallet check from your own wallet",
    estimatedGasUsd: "$0.04",
    unsignedTxPayload: buildWalletSignatureCheckPayload(wallet),
  });

  await ctx.reply(formatProposalMessage(proposal, agent.name), {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      Markup.button.callback("approve", `approve:${proposal.id}`),
      Markup.button.callback("skip", `skip:${proposal.id}`),
    ]),
  });
}

/**
 * Registers the approve / skip callback handlers. Approval from Telegram
 * routes the user to the dashboard for final wallet signature. The database
 * only moves to approved after the web app verifies the on-chain transaction.
 */
export function registerApprovalHandlers(
  bot: Telegraf,
  options: {
    onApprove?: (proposal: Proposal, ctx: Context) => Promise<void>;
    onSkip?: (proposal: Proposal, ctx: Context) => Promise<void>;
  } = {},
): void {
  bot.action(/^approve:(.+)$/, async (ctx) => {
    const proposalId = ctx.match[1];
    if (!proposalId) return;

    const proposal = await getProposal(proposalId);
    if (!proposal) {
      await ctx.answerCbQuery("Proposal not found");
      return;
    }

    if (proposal.status !== "pending") {
      await ctx.answerCbQuery(`Already ${proposal.status}`);
      await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
      return;
    }

    const wallet = await getWalletForTelegramChatId(String(ctx.chat?.id ?? ""));
    const agent = await getAgent(proposal.agentId);
    if (!wallet || !agent || agent.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
      await ctx.answerCbQuery("Not authorized");
      return;
    }

    // Phase 6: Market Expiry Guard (24 hours)
    const proposalAgeMs = Date.now() - new Date(proposal.createdAt).getTime();
    if (proposalAgeMs > 24 * 60 * 60 * 1000) {
      await skipProposal(proposalId);
      await ctx.answerCbQuery("Proposal expired");
      await ctx.editMessageReplyMarkup(undefined);
      await ctx.reply("<code>&gt; expired</code>\nProposal is older than 24 hours and has been skipped for safety.", { parse_mode: "HTML" });
      return;
    }

    await ctx.answerCbQuery("open dashboard to sign");

    if (options.onApprove) {
      await options.onApprove(proposal, ctx);
    }

    await ctx.editMessageReplyMarkup(undefined);
    const dashboardUrl = dashboardProposalUrl(agent.id);
    await ctx.reply(
      [
        `<code>&gt; ready for wallet signature</code>`,
        agent ? `agent: <b>${escapeHtml(agent.name)}</b>` : "",
        `proposal: <code>${proposalId}</code>`,
        ``,
        proposal.unsignedTxPayload
          ? `<b>Open dashboard and sign from your own wallet:</b>\n${escapeHtml(dashboardUrl)}`
          : `<i>No executable payload generated yet. Review this proposal in the dashboard.</i>`,
        ``,
        `<i>NEMESIS never signs or broadcasts from the server.</i>`
      ]
        .filter(Boolean)
        .join("\n"),
      { parse_mode: "HTML" },
    );
  });

  bot.action(/^skip:(.+)$/, async (ctx) => {
    const proposalId = ctx.match[1];
    if (!proposalId) return;

    const proposal = await getProposal(proposalId);
    if (!proposal) {
      await ctx.answerCbQuery("Proposal not found");
      return;
    }

    if (proposal.status !== "pending") {
      await ctx.answerCbQuery(`Already ${proposal.status}`);
      await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
      return;
    }

    const wallet = await getWalletForTelegramChatId(String(ctx.chat?.id ?? ""));
    const agent = await getAgent(proposal.agentId);
    if (!wallet || !agent || agent.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
      await ctx.answerCbQuery("Not authorized");
      return;
    }

    const updated = await skipProposal(proposalId);
    await ctx.answerCbQuery("skipped");

    if (updated && options.onSkip) {
      await options.onSkip(updated, ctx);
    }

    await ctx.editMessageReplyMarkup(undefined);
    await ctx.reply("<code>&gt; skipped</code>", { parse_mode: "HTML" });
  });
}
