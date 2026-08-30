import { NextResponse } from "next/server";
import { z } from "zod";
import { buildQuizGenerationPrompt, type QuizPromptOptions } from "@/lib/prompts/quiz-prompt";
import { guestRateLimit } from "@/lib/guest-rate-limit";
import { withApiErrorHandling } from "@/lib/api/handler";

const MAX_GUEST_CONTENT_CHARS = 60_000;

const optionsSchema = z.object({
  questionCount: z.number().int().positive().max(100).default(10),
  difficulty: z.enum(["EASY", "NORMAL", "HARD", "MIXED"]).default("MIXED"),
  mode: z.enum(["QUIZ", "PRACTICE_EXAM", "MOCK_EXAM", "TIMED_EXAM", "MASTERY_TEST"]).default("QUIZ"),
  questionTypes: z.array(z.string()).min(1).default(["multiple_choice", "true_false"]),
});

const bodySchema = z.object({
  title: z.string().min(1).max(200).default("My memories"),
  content: z.string().min(1).max(MAX_GUEST_CONTENT_CHARS),
  options: optionsSchema.default({}),
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const limited = await guestRateLimit(request);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const options: QuizPromptOptions = {
    ...parsed.data.options,
    distribution: "balanced",
    includeExplanations: true,
    randomize: true,
  };

  const text = buildQuizGenerationPrompt([{ title: parsed.data.title, content: parsed.data.content }], options);
  return NextResponse.json({ text });
});
