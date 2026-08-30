export const STANDARD_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
export const REMEMBERED_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function sessionExpiresAt(keepLoggedIn: boolean, now = Date.now()): number {
  const durationSeconds = keepLoggedIn
    ? REMEMBERED_SESSION_MAX_AGE_SECONDS
    : STANDARD_SESSION_MAX_AGE_SECONDS;
  return now + durationSeconds * 1000;
}

export function isSessionExpired(expiresAt: number | undefined, now = Date.now()): boolean {
  return typeof expiresAt === "number" && now >= expiresAt;
}
