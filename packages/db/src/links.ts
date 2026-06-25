import { db } from "./client.js";

const LINK_CODE_TTL_MINUTES = 10;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids ambiguous codes

function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Creates a one-time link code for a wallet address. The web dashboard
 * shows this code and asks the user to send it to the Telegram bot via
 * `/link <code>`. Codes expire after 10 minutes and can only be used
 * once. This is the real implementation of the flow described in
 * ARCHITECTURE.md, "Telegram bot — user mapping" — that section can now
 * be considered resolved rather than a TODO.
 */
export function generateLinkCode(walletAddress: string): { code: string; expiresAt: string } {
  // Ensure the user row exists so later joins/lookups are simple.
  db.prepare("INSERT OR IGNORE INTO users (wallet_address) VALUES (?)").run(walletAddress);

  let code = generateCode();
  // Extremely unlikely to collide (33^6 ≈ 1.3 billion combinations), but
  // guard against it cheaply rather than assume it away.
  while (db.prepare("SELECT 1 FROM link_codes WHERE code = ? AND used_at IS NULL").get(code)) {
    code = generateCode();
  }

  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60_000).toISOString();
  db.prepare("INSERT INTO link_codes (code, wallet_address, expires_at) VALUES (?, ?, ?)").run(
    code,
    walletAddress,
    expiresAt,
  );

  return { code, expiresAt };
}

export type ConsumeLinkResult =
  | { ok: true; walletAddress: string }
  | { ok: false; reason: "not-found" | "expired" | "already-used" };

interface LinkCodeRow {
  code: string;
  wallet_address: string;
  expires_at: string;
  used_at: string | null;
}

/**
 * Called by the Telegram bot when a user sends `/link <code>`. On
 * success, stores the chat ID against the wallet address so future
 * proposals for that wallet's agents can be delivered to the right chat.
 */
export function consumeLinkCode(code: string, telegramChatId: string): ConsumeLinkResult {
  const row = db.prepare("SELECT * FROM link_codes WHERE code = ?").get(code) as LinkCodeRow | undefined;

  if (!row) return { ok: false, reason: "not-found" };
  if (row.used_at) return { ok: false, reason: "already-used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  db.prepare("UPDATE link_codes SET used_at = datetime('now') WHERE code = ?").run(code);
  // Clear any previous link for this chat ID so one Telegram chat can
  // only be linked to one wallet at a time.
  db.prepare("UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = ? AND wallet_address != ?").run(
    telegramChatId,
    row.wallet_address,
  );
  db.prepare("UPDATE users SET telegram_chat_id = ? WHERE wallet_address = ?").run(
    telegramChatId,
    row.wallet_address,
  );

  return { ok: true, walletAddress: row.wallet_address };
}

export function getTelegramChatIdForWallet(walletAddress: string): string | undefined {
  const row = db
    .prepare("SELECT telegram_chat_id FROM users WHERE wallet_address = ?")
    .get(walletAddress) as { telegram_chat_id: string | null } | undefined;
  return row?.telegram_chat_id ?? undefined;
}

export function getWalletForTelegramChatId(telegramChatId: string): string | undefined {
  const row = db
    .prepare("SELECT wallet_address FROM users WHERE telegram_chat_id = ?")
    .get(telegramChatId) as { wallet_address: string } | undefined;
  return row?.wallet_address;
}

export function isWalletLinked(walletAddress: string): boolean {
  return getTelegramChatIdForWallet(walletAddress) !== undefined;
}
