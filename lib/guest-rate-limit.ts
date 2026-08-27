import { NextResponse } from "next/server";

/**
 * Best-effort rate limiting for public, unauthenticated endpoints.
 *
 * This is an in-memory counter, so it only limits requests hitting the same
 * warm serverless instance — it resets on cold start and doesn't coordinate
 * across instances. That's a real limitation, not a full defense. For
 * production-grade protection, put this behind a durable store (Upstash
 * Redis, Vercel KV, etc.) or your edge/CDN's rate limiting instead.
 *
 * TODO: replace with a durable rate limiter before relying on this in
 * production — this only meaningfully slows down casual abuse, not a
 * determined attacker distributing requests across cold starts.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const hits = new Map<string, { count: number; windowStart: number }>();

function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** Returns a 429 NextResponse if the caller is over the limit, or null to proceed. */
export function guestRateLimit(request: Request): NextResponse | null {
  const key = getClientKey(request);
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return null;
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  }
  return null;
}
