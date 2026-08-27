import type { QuizQuestion } from "@/lib/validation/quiz";

export function isAnswerCorrect(question: QuizQuestion, given: unknown): boolean {
  switch (question.type) {
    case "multiple_choice":
      return given === question.answer;
    case "true_false":
      return given === question.answer;
    case "multiple_select": {
      const g = Array.isArray(given) ? [...given].sort() : [];
      const a = [...question.answer].sort();
      return JSON.stringify(g) === JSON.stringify(a);
    }
    case "identification":
    case "fill_in_the_blank":
    case "short_answer": {
      const normalized = typeof given === "string" ? given.trim().toLowerCase() : "";
      return question.acceptableAnswers.some((ans) => ans.trim().toLowerCase() === normalized);
    }
    case "matching": {
      if (!given || typeof given !== "object") return false;
      const map = given as Record<string, string>;
      return question.pairs.every((pair) => map[pair.left]?.trim().toLowerCase() === pair.right.trim().toLowerCase());
    }
    default:
      return false;
  }
}

export interface GradedAnswer {
  given: unknown;
  correct: boolean;
}

/** Human-readable answer used by review mode and printable answer keys. */
export function formatCorrectAnswer(question: QuizQuestion): string {
  switch (question.type) {
    case "multiple_choice":
      return `${String.fromCharCode(65 + question.answer)}. ${question.choices[question.answer] ?? "Unknown option"}`;
    case "true_false":
      return question.answer ? "True" : "False";
    case "multiple_select":
      return question.answer
        .map((index) => `${String.fromCharCode(65 + index)}. ${question.choices[index] ?? "Unknown option"}`)
        .join("; ");
    case "identification":
    case "fill_in_the_blank":
    case "short_answer":
      return question.acceptableAnswers.join(" / ");
    case "matching":
      return question.pairs.map((pair) => `${pair.left} -> ${pair.right}`).join("; ");
  }
}

export function gradeQuiz(questions: QuizQuestion[], answers: Record<string, unknown>) {
  const gradedAnswers: Record<string, GradedAnswer> = {};
  let score = 0;
  for (const question of questions) {
    const given = answers[question.id];
    const correct = given !== undefined && isAnswerCorrect(question, given);
    if (correct) score += 1;
    gradedAnswers[question.id] = { given: given ?? null, correct };
  }
  return { score, gradedAnswers, total: questions.length };
}
