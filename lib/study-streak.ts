const DAY_MS = 86_400_000;

/**
 * Counts consecutive UTC calendar days with study activity. A user keeps
 * yesterday's streak until the current day ends, so they do not lose it first
 * thing in the morning before completing today's review.
 */
export function calculateStudyStreak(reviewedAt: Date[], now = new Date()): number {
  const reviewDays = new Set(reviewedAt.map((date) => date.toISOString().slice(0, 10)));
  let streak = 0;

  for (let offset = 0; offset < 30; offset++) {
    const day = new Date(now.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
    if (reviewDays.has(day)) streak += 1;
    else if (offset > 0) break;
  }

  return streak;
}
