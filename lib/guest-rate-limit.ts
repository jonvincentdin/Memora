import { NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

/**
 * Shared rate limiting for public, unauthenticated endpoints.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

/** Returns a 429 NextResponse if the caller is over the limit, or null to proceed. */
export async function guestRateLimit(request: Request): Promise<NextResponse | null> {
  const key = `guest:${getClientIp(request.headers)}`;
  if (await isRateLimited(key, MAX_REQUESTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  }
  return null;
}
