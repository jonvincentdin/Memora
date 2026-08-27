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
