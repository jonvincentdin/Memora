import { describe, expect, it } from "vitest";
import { calculateStudyStreak } from "@/lib/study-streak";

const now = new Date("2026-08-30T12:00:00.000Z");

describe("study streak", () => {
  it("counts consecutive review days including today", () => {
    expect(calculateStudyStreak([
      new Date("2026-08-30T08:00:00.000Z"),
      new Date("2026-08-29T08:00:00.000Z"),
      new Date("2026-08-28T08:00:00.000Z"),
    ], now)).toBe(3);
  });

  it("keeps yesterday's streak until the current day ends", () => {
    expect(calculateStudyStreak([
      new Date("2026-08-29T08:00:00.000Z"),
      new Date("2026-08-28T08:00:00.000Z"),
    ], now)).toBe(2);
  });

  it("returns zero after a missed day", () => {
    expect(calculateStudyStreak([
      new Date("2026-08-28T08:00:00.000Z"),
    ], now)).toBe(0);
  });
});
