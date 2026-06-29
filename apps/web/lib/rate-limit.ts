import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { consumeRateLimit } from "@nemesis/db";

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

function identityDigest(scope: string, identity: string): string {
  return createHash("sha256").update(`${scope}:${identity}`).digest("hex");
}

export function rateLimitKey(request: Request, scope: string, identity?: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const source = identity?.toLowerCase() ?? forwardedFor ?? realIp ?? "unknown-ip";
  return `${scope}:${identityDigest(scope, source)}`;
}

export async function enforceRateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<NextResponse | null> {
  try {
    const result = await consumeRateLimit({ key, limit, windowMs });
    if (result.allowed) return null;

    const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1_000));
    return NextResponse.json(
      { error: "Too many requests. Slow down and try again shortly." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1_000)),
        },
      },
    );
  } catch {
    console.error("[RateLimit] shared limiter unavailable");
    return NextResponse.json(
      { error: "Request protection is temporarily unavailable. Try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } },
    );
  }
}
