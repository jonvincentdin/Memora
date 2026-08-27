/**
 * Best-effort rate limiting for sensitive endpoints (login, register).
 *
 * This is an in-memory counter scoped to a single warm serverless instance —
 * it resets on cold start and doesn't coordinate across instances or
 * regions. That meaningfully slows down casual credential-stuffing/brute
 * force from a single source, but is not a substitute for a durable,
 * distributed rate limiter in production.
 *
 * TODO: replace with Upstash Redis / Vercel KV (or your platform's built-in
 * rate limiting / WAF) before relying on this against a determined attacker.
 */
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS_PER_WINDOW = 10;

const hits = new Map<string, { count: number; windowStart: number }>();

// Periodically forget old entries so this map doesn't grow unbounded across
// a long-lived warm instance.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now - entry.windowStart > WINDOW_MS) hits.delete(key);
  }
}, WINDOW_MS).unref?.();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS_PER_WINDOW;
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
