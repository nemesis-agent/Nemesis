import { logger } from "./logger.js";
import { redactForOps } from "./privacy.js";

type AlertSeverity = "info" | "warning" | "critical";

interface AlertPayload {
  event: string;
  severity: AlertSeverity;
  message: string;
  context?: Record<string, unknown>;
}

const webhookUrl = process.env.NEMESIS_ALERT_WEBHOOK_URL;

export async function sendOpsAlert(payload: AlertPayload): Promise<void> {
  const safePayload = redactForOps(payload);
  logger[safePayload.severity === "critical" ? "error" : safePayload.severity === "warning" ? "warn" : "info"]({
    msg: safePayload.message,
    event: safePayload.event,
    severity: safePayload.severity,
    context: safePayload.context,
  });

  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "nemesis",
        timestamp: new Date().toISOString(),
        ...safePayload,
      }),
    });
  } catch (error) {
    logger.warn({ msg: "failed to send ops alert", err: redactForOps(error), event: safePayload.event });
  }
}