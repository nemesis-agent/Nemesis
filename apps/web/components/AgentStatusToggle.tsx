"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import type { AgentStatus } from "@nemesis/db";

interface AgentStatusToggleProps {
  agentId: string;
  status: AgentStatus;
}

/**
 * Calls the real pause/resume Route Handlers (apps/web/app/api/agents/[id]/...)
 * which mutate the Postgres database, then refreshes the page so the
 * Server Component above re-reads the new state. This is a genuinely
 * working mutation — not a UI-only placeholder — see CONTEXT.md, "What
 * changed in the database pass".
 */
export function AgentStatusToggle({ agentId, status }: AgentStatusToggleProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle(nextAction: "pause" | "resume") {
    setPending(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/${nextAction}`, { method: "POST" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      router.refresh();
    } catch (error) {
      console.error(`[AgentStatusToggle] failed to ${nextAction} agent`, error instanceof Error ? error.message : "unknown");
    } finally {
      setPending(false);
    }
  }

  if (status === "active") {
    return (
      <Button variant="secondary" magnetic disabled={pending} onClick={() => toggle("pause")}>
        {pending ? "pausing…" : "pause agent"}
      </Button>
    );
  }

  if (status === "paused") {
    return (
      <Button variant="resolve" magnetic disabled={pending} onClick={() => toggle("resume")}>
        {pending ? "resuming…" : "resume agent"}
      </Button>
    );
  }

  return null;
}
