import { logger } from "./logger.js";

type AlertSeverity = "info" | "warning" | "critical";

interface AlertPayload {
  event: string;
  severity: AlertSeverity;
  message: string;
  context?: Record<string, unknown>;
}

const webhookUrl = process.env.NEMESIS_ALERT_WEBHOOK_URL;

export async function sendOpsAlert(payload: AlertPayload): Promise<void> {
  logger[payload.severity === "critical" ? "error" : payload.severity === "warning" ? "warn" : "info"]({
    msg: payload.message,
    event: payload.event,
    severity: payload.severity,
    context: payload.context,
  });

  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "nemesis",
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });
  } catch (error) {
    logger.warn({ msg: "failed to send ops alert", err: error, event: payload.event });
  }
}