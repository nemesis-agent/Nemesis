import { NextResponse } from "next/server";

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

interface Bucket {
  resetAt: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimitKey(request: Request, scope: string, identity?: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown-ip";
  return `${scope}:${identity?.toLowerCase() ?? ip}`;
}

export function enforceRateLimit({ key, limit, windowMs }: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  current.count += 1;
  if (current.count <= limit) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(current.resetAt / 1000)),
      },
    },
  );
}

export function pruneRateLimitBuckets(): number {
  const now = Date.now();
  let deleted = 0;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
      deleted += 1;
    }
  }
  return deleted;
}