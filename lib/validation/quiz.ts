import { z } from "zod";

/** Accepts any casing/whitespace variant of an enum value from AI output (e.g. "Mixed", " mixed ") and normalizes it before matching. */
function looseEnum<T extends [string, ...string[]]>(values: T) {
  return z.preprocess((val) => {
    if (typeof val !== "string") return val;
    const normalized = val.trim().toUpperCase().replace(/[\s-]+/g, "_");
    return values.find((v) => v === normalized) ?? val;
  }, z.enum(values));
}

/** Accepts "1", "1.0", 1, or 1.0 as a valid version tag — AI output is inconsistent about this. */
const looseVersionSchema = z.preprocess((val) => String(val), z.string().refine((v) => ["1", "1.0"].includes(v), "Unsupported version."));

const baseQuestionFields = {
  id: z.string().min(1),
  question: z.string().min(1),
  explanation: z.string().optional(),
  sourceSection: z.string().optional(),
};

export const quizQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    ...baseQuestionFields,
    type: z.literal("multiple_choice"),
    choices: z.array(z.string().min(1)).min(2),
    answer: z.number().int().nonnegative(),
  }),
  z.object({
    ...baseQuestionFields,
    type: z.literal("true_false"),
    answer: z.boolean(),
  }),
  z.object({
    ...baseQuestionFields,
    type: z.literal("multiple_select"),
    choices: z.array(z.string().min(1)).min(2),
    answer: z.array(z.number().int().nonnegative()).min(1),
  }),
  z.object({
    ...baseQuestionFields,
    type: z.literal("identification"),
    acceptableAnswers: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    ...baseQuestionFields,
    type: z.literal("fill_in_the_blank"),
    acceptableAnswers: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    ...baseQuestionFields,
    type: z.literal("matching"),
    pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2),
  }),
  z.object({
    ...baseQuestionFields,
    type: z.literal("short_answer"),
    acceptableAnswers: z.array(z.string().min(1)).min(1),
  }),
]);

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const quizDifficultyEnum = z.enum(["EASY", "NORMAL", "HARD", "MIXED"]);
export const quizModeEnum = z.enum(["QUIZ", "PRACTICE_EXAM", "MOCK_EXAM", "TIMED_EXAM", "MASTERY_TEST"]);

// AI-facing versions of the above — tolerant of casing since the prompt asks
// for lowercase values (matching how a human would naturally write them) but
// models don't always follow instructions on casing exactly.
const aiDifficultyEnum = looseEnum(["EASY", "NORMAL", "HARD", "MIXED"]);
const aiModeEnum = looseEnum(["QUIZ", "PRACTICE_EXAM", "MOCK_EXAM", "TIMED_EXAM", "MASTERY_TEST"]);

export const quizSettingsSchema = z.object({
  mode: aiModeEnum.default("QUIZ"),
  difficulty: aiDifficultyEnum.default("MIXED"),
  questionCount: z.number().int().positive(),
});

export const structuredQuizSchema = z.object({
  format: z.literal("memora-quiz"),
  version: looseVersionSchema,
  title: z.string().min(1),
  settings: quizSettingsSchema,
  questions: z.array(quizQuestionSchema).min(1),
});

export type StructuredQuiz = z.infer<typeof structuredQuizSchema>;

/** Validates a parsed quiz JSON payload and reports duplicate question IDs. */
export function validateStructuredQuiz(data: unknown) {
  const normalized = normalizeQuizPayload(data);
  const result = structuredQuizSchema.safeParse(normalized);
  if (!result.success) {
    return {
      success: false as const,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];
  for (const q of result.data.questions) {
    if (seenIds.has(q.id)) duplicateIds.push(q.id);
    seenIds.add(q.id);
  }
  if (duplicateIds.length > 0) {
    return {
      success: false as const,
      errors: duplicateIds.map((id) => ({ path: "questions", message: `Duplicate question id "${id}".` })),
    };
  }

  return { success: true as const, data: result.data };
}

/**
 * Best-effort repair of common, harmless AI mistakes before strict
 * validation: missing question ids get auto-assigned (q1, q2, ...) instead
 * of failing the whole import over a cosmetic omission.
 */
function normalizeQuizPayload(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.questions)) return data;

  const usedIds = new Set<string>();
  const questions = obj.questions.map((q, i) => {
    if (!q || typeof q !== "object") return q;
    const question = { ...(q as Record<string, unknown>) };
    let id = typeof question.id === "string" && question.id.trim() ? question.id.trim() : "";
    if (!id || usedIds.has(id)) id = `q${i + 1}`;
    usedIds.add(id);
    question.id = id;
    return question;
  });

  return { ...obj, questions };
}

export const quizConfigurationSchema = z.object({
  questionCount: z.number().int().positive().default(10),
  difficulty: quizDifficultyEnum.default("MIXED"),
  distribution: z.enum(["balanced", "concept_heavy", "definition_heavy", "application_heavy", "custom"]).default("balanced"),
  randomizeQuestions: z.boolean().default(true),
  randomizeChoices: z.boolean().default(true),
  randomizeSections: z.boolean().default(false),
  feedback: z.enum(["immediate", "after_submission", "none_until_completion"]).default("after_submission"),
  attempts: z.enum(["unlimited", "one", "custom"]).default("unlimited"),
  customAttemptLimit: z.number().int().positive().optional(),
  // Exam-only fields
  timeLimitMinutes: z.number().int().positive().optional(),
  allowBackNavigation: z.boolean().default(true),
  showProgress: z.boolean().default(true),
  hideAnswersUntilEnd: z.boolean().default(false),
});

export type QuizConfiguration = z.infer<typeof quizConfigurationSchema>;

export const createQuizSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  noteIds: z.array(z.string()).default([]),
  reviewerIds: z.array(z.string()).default([]),
  mode: quizModeEnum.default("QUIZ"),
  configuration: quizConfigurationSchema,
  questions: z.array(quizQuestionSchema).min(1),
});

export const submitAttemptSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
  flagged: z.array(z.string()).default([]),
});

export const saveAttemptSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  flagged: z.array(z.string()).default([]),
});

/** Strips ```json / ``` code fences some AI responses wrap output in, despite being asked not to. */
export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/** Parses pasted AI text into JSON, tolerating a wrapping code fence. Throws with a friendly message on failure. */
export function parseAiJson(raw: string): unknown {
  const cleaned = stripJsonFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("That's not valid JSON. Make sure you copied the AI's full response, including the opening { and closing }.");
  }
}
