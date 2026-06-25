import type { Context } from "telegraf";

import { getAgent, setAgentStatus } from "@nemesis/db";

export async function pauseCommand(ctx: Context): Promise<void> {
  const text = "text" in ctx.message! ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  if (!agentId) {
    await ctx.reply("Usage: /pause <agent_id>");
    return;
  }

  const agent = getAgent(agentId);
  if (!agent) {
    await ctx.reply(`No agent found with id <code>${agentId}</code>.`, { parse_mode: "HTML" });
    return;
  }

  setAgentStatus(agentId, "paused");
  await ctx.reply(`<b>${agent.name}</b> (${agent.id}) is now paused.`, { parse_mode: "HTML" });
}

export async function resumeCommand(ctx: Context): Promise<void> {
  const text = "text" in ctx.message! ? ctx.message.text : "";
  const [, agentId] = text.split(/\s+/);

  if (!agentId) {
    await ctx.reply("Usage: /resume <agent_id>");
    return;
  }

  const agent = getAgent(agentId);
  if (!agent) {
    await ctx.reply(`No agent found with id <code>${agentId}</code>.`, { parse_mode: "HTML" });
    return;
  }

  setAgentStatus(agentId, "active");
  await ctx.reply(`<b>${agent.name}</b> (${agent.id}) is now active.`, { parse_mode: "HTML" });
}
