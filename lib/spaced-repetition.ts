export interface ReviewState {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
}

export function scheduleReview(current: ReviewState, grade: 1 | 2 | 3 | 4, now = new Date()) {
  let { intervalDays, easeFactor, repetitions, lapses } = current;
  if (grade === 1) {
    intervalDays = 1;
    repetitions = 0;
    lapses += 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (grade === 2) {
    intervalDays = Math.max(1, intervalDays * 1.2 || 1);
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (grade === 3) {
    intervalDays = repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.max(1, intervalDays * easeFactor);
    repetitions += 1;
  } else {
    intervalDays = repetitions === 0 ? 4 : Math.max(2, intervalDays * easeFactor * 1.3);
    repetitions += 1;
    easeFactor = Math.min(3.2, easeFactor + 0.15);
  }
  intervalDays = Math.round(intervalDays * 10) / 10;
  return { intervalDays, easeFactor, repetitions, lapses, dueAt: new Date(now.getTime() + intervalDays * 86_400_000), lastGrade: grade };
}
