import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 10;

/**
 * A database-backed fixed-window limiter. The atomic PostgreSQL upsert makes
 * the counter consistent across Vercel instances and cold starts.
 */
export async function isRateLimited(
  key: string,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  windowMs = DEFAULT_WINDOW_MS
): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);
  const buckets = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    INSERT INTO "rate_limit_buckets" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, ${now}, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limit_buckets"."expiresAt" <= ${now} THEN 1
        ELSE "rate_limit_buckets"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "rate_limit_buckets"."expiresAt" <= ${now} THEN ${now}
        ELSE "rate_limit_buckets"."windowStart"
      END,
      "expiresAt" = CASE
        WHEN "rate_limit_buckets"."expiresAt" <= ${now} THEN ${expiresAt}
        ELSE "rate_limit_buckets"."expiresAt"
      END
    RETURNING "count"
  `);

  return (buckets[0]?.count ?? maxAttempts + 1) > maxAttempts;
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
