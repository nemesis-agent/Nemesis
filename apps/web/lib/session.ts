import type { SessionOptions } from "iron-session";

export interface SessionData {
  /** The authenticated wallet address (checksum format). null = guest. */
  address?: `0x${string}`;
  /** Nonce issued during the SIWE challenge. Consumed on verify. */
  nonce?: string;
}

const sessionPassword = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === "production") {
  if (!sessionPassword || sessionPassword.length < 32 || sessionPassword === "change-me-in-production-min-32-chars!!") {
    throw new Error("SESSION_SECRET must be set to a strong, unique value of at least 32 characters in production.");
  }
}

export const SESSION_OPTIONS: SessionOptions = {
  cookieName: process.env.NODE_ENV === "production" ? "__Host-nemesis_session" : "nemesis_session",
  password: sessionPassword ?? "change-me-in-production-min-32-chars!!",
  cookieOptions: {
    // Must be true in production (HTTPS). Allow false locally for dev.
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};
