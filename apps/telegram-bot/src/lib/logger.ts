import { pino } from "pino";

// In production, we log strictly as JSON so Railway can ingest it easily.
// In development, we use pino-pretty for human-readable logs.
const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        },
      },
});
