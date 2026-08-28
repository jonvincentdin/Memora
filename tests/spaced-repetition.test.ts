import { describe, expect, it } from "vitest";
import { scheduleReview } from "@/lib/spaced-repetition";

const start = new Date("2026-08-28T00:00:00.000Z");

describe("spaced repetition", () => {
  it("graduates successful cards from one to six days", () => {
    const first = scheduleReview({ intervalDays: 0, easeFactor: 2.5, repetitions: 0, lapses: 0 }, 3, start);
    const second = scheduleReview(first, 3, start);
    expect(first.intervalDays).toBe(1);
    expect(second.intervalDays).toBe(6);
  });

  it("resets a forgotten card and never drops ease below the floor", () => {
    let state = { intervalDays: 30, easeFactor: 1.35, repetitions: 6, lapses: 0 };
    for (let index = 0; index < 4; index += 1) state = scheduleReview(state, 1, start);
    expect(state).toMatchObject({ intervalDays: 1, repetitions: 0, lapses: 4, easeFactor: 1.3 });
  });

  it("schedules easy new cards farther out", () => {
    const result = scheduleReview({ intervalDays: 0, easeFactor: 2.5, repetitions: 0, lapses: 0 }, 4, start);
    expect(result.intervalDays).toBe(4);
    expect(result.dueAt.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });
});
