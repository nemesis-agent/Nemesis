import { randomInt } from "node:crypto";

import { pool } from "./client.js";

const LINK_CODE_TTL_MINUTES = 10;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids ambiguous codes

function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export async function generateLinkCode(walletAddress: string): Promise<{ code: string; expiresAt: string }> {
  await pool.query("INSERT INTO users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING", [walletAddress]);

  let code = generateCode();
  while (((await pool.query("SELECT 1 FROM link_codes WHERE code = $1 AND used_at IS NULL", [code])).rowCount ?? 0) > 0) {
    code = generateCode();
  }

  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60_000).toISOString();
  await pool.query("INSERT INTO link_codes (code, wallet_address, expires_at) VALUES ($1, $2, $3)", [code, walletAddress, expiresAt]);

  return { code, expiresAt };
}

export type ConsumeLinkResult =
  | { ok: true; walletAddress: string }
  | { ok: false; reason: "not-found" | "expired" | "already-used" };

interface LinkCodeRow {
  code: string;
  wallet_address: string;
  expires_at: Date;
  used_at: Date | null;
}

export async function consumeLinkCode(code: string, telegramChatId: string): Promise<ConsumeLinkResult> {
  const existing = await pool.query("SELECT * FROM link_codes WHERE code = $1", [code]);
  const row = existing.rows[0] as LinkCodeRow | undefined;

  if (!row) return { ok: false, reason: "not-found" };
  if (row.used_at) return { ok: false, reason: "already-used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const consumed = await client.query(
      `UPDATE link_codes
       SET used_at = CURRENT_TIMESTAMP
       WHERE code = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       RETURNING wallet_address`,
      [code],
    );

    const consumedRow = consumed.rows[0] as { wallet_address: string } | undefined;
    if (!consumedRow) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "already-used" };
    }

    await client.query("UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = $1 AND wallet_address != $2", [
      telegramChatId,
      consumedRow.wallet_address,
    ]);
    await client.query("UPDATE users SET telegram_chat_id = $1 WHERE wallet_address = $2", [
      telegramChatId,
      consumedRow.wallet_address,
    ]);
    await client.query("COMMIT");

    return { ok: true, walletAddress: consumedRow.wallet_address };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getTelegramChatIdForWallet(walletAddress: string): Promise<string | undefined> {
  const { rows } = await pool.query("SELECT telegram_chat_id FROM users WHERE wallet_address = $1", [walletAddress]);
  const row = rows[0] as { telegram_chat_id: string | null } | undefined;
  return row?.telegram_chat_id ?? undefined;
}

export async function getWalletForTelegramChatId(telegramChatId: string): Promise<string | undefined> {
  const { rows } = await pool.query("SELECT wallet_address FROM users WHERE telegram_chat_id = $1", [telegramChatId]);
  const row = rows[0] as { wallet_address: string } | undefined;
  return row?.wallet_address;
}

export async function isWalletLinked(walletAddress: string): Promise<boolean> {
  return (await getTelegramChatIdForWallet(walletAddress)) !== undefined;
}
