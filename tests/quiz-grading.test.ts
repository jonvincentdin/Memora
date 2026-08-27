import { describe, expect, it } from "vitest";
import { gradeQuiz, isAnswerCorrect } from "@/lib/quiz-grading";
import type { QuizQuestion } from "@/lib/validation/quiz";

const questions: QuizQuestion[] = [
  { id: "choice", type: "multiple_choice", question: "Pick B", choices: ["A", "B"], answer: 1 },
  { id: "boolean", type: "true_false", question: "True?", answer: true },
  { id: "select", type: "multiple_select", question: "Pick both", choices: ["A", "B", "C"], answer: [0, 2] },
  { id: "text", type: "identification", question: "Name it", acceptableAnswers: ["Memora"] },
  { id: "match", type: "matching", question: "Match", pairs: [{ left: "A", right: "One" }, { left: "B", right: "Two" }] },
];

describe("quiz grading", () => {
  it("grades every supported answer shape", () => {
    const result = gradeQuiz(questions, {
      choice: 1,
      boolean: true,
      select: [2, 0],
      text: "  memora ",
      match: { A: "one", B: " TWO " },
    });

    expect(result).toMatchObject({ score: 5, total: 5 });
    expect(Object.values(result.gradedAnswers).every((answer) => answer.correct)).toBe(true);
  });

  it("does not count missing or malformed answers", () => {
    expect(gradeQuiz(questions, {}).score).toBe(0);
    expect(isAnswerCorrect(questions[2], [0, 1])).toBe(false);
    expect(isAnswerCorrect(questions[4], { A: "One" })).toBe(false);
  });
});
