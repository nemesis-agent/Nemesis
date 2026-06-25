import type { SessionOptions } from "iron-session";

export interface SessionData {
  /** The authenticated wallet address (checksum format). null = guest. */
  address?: `0x${string}`;
  /** Nonce issued during the SIWE challenge. Consumed on verify. */
  nonce?: string;
}

export const SESSION_OPTIONS: SessionOptions = {
  cookieName: "nemesis_session",
  password: process.env.SESSION_SECRET ?? "change-me-in-production-min-32-chars!!",
  cookieOptions: {
    // Must be true in production (HTTPS). Allow false locally for dev.
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};
