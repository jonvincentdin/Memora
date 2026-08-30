import { describe, expect, it } from "vitest";
import {
  isSessionExpired,
  REMEMBERED_SESSION_MAX_AGE_SECONDS,
  sessionExpiresAt,
  STANDARD_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session-duration";

describe("login session duration", () => {
  const now = Date.parse("2026-08-30T00:00:00.000Z");

  it("uses a 12-hour session by default", () => {
    expect(sessionExpiresAt(false, now)).toBe(now + STANDARD_SESSION_MAX_AGE_SECONDS * 1000);
  });

  it("keeps remembered sessions for 30 days", () => {
    expect(sessionExpiresAt(true, now)).toBe(now + REMEMBERED_SESSION_MAX_AGE_SECONDS * 1000);
  });

  it("invalidates a session at its server-enforced expiry", () => {
    const expiresAt = sessionExpiresAt(false, now);
    expect(isSessionExpired(expiresAt, expiresAt - 1)).toBe(false);
    expect(isSessionExpired(expiresAt, expiresAt)).toBe(true);
  });
});
