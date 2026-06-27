import type { Context, MiddlewareFn } from "telegraf";

let warnedOpenAccess = false;

/**
 * Restricts the bot to a known set of Telegram user IDs, read from
 * NEMESIS_ALLOWED_USER_IDS (comma-separated). If unset, the bot warns
 * once and allows anyone to start the bot. Wallet-scoped commands still
 * require a valid dashboard-generated link code before they can access
 * wallet data.
 */
export function createAccessControl(): MiddlewareFn<Context> {
  const allowList = (process.env.NEMESIS_ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return async (ctx, next) => {
    if (allowList.length === 0) {
      if (!warnedOpenAccess) {
        console.warn(
          "[nemesis-bot] NEMESIS_ALLOWED_USER_IDS is not set - the bot will respond to any user. " +
            "Set it before deploying publicly.",
        );
        warnedOpenAccess = true;
      }
      return next();
    }

    const userId = ctx.from?.id?.toString();
    if (userId && allowList.includes(userId)) {
      return next();
    }

    await ctx.reply("This bot instance is not configured for your account yet.");
  };
}
