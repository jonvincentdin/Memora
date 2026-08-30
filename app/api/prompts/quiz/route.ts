import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";
import { canView } from "@/lib/permissions";
import { buildQuizGenerationPrompt, type QuizPromptOptions } from "@/lib/prompts/quiz-prompt";
import { findNotesByIds } from "@/lib/notes-repo";
import { findReviewersByIds } from "@/lib/reviewers-repo";
import { withApiErrorHandling } from "@/lib/api/handler";

// POST { noteIds: string[], reviewerIds: string[], options: QuizPromptOptions }
export const POST = withApiErrorHandling(async (request: Request) => {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const noteIds: string[] = body?.noteIds ?? [];
  const reviewerIds: string[] = body?.reviewerIds ?? [];
  const options: QuizPromptOptions = {
    questionCount: Number(body?.options?.questionCount) || 10,
    difficulty: ["EASY", "NORMAL", "HARD", "MIXED"].includes(body?.options?.difficulty) ? body.options.difficulty : "MIXED",
    mode: ["QUIZ", "PRACTICE_EXAM", "MOCK_EXAM", "TIMED_EXAM", "MASTERY_TEST"].includes(body?.options?.mode) ? body.options.mode : "QUIZ",
    questionTypes: Array.isArray(body?.options?.questionTypes) && body.options.questionTypes.length > 0
      ? body.options.questionTypes
      : ["multiple_choice", "true_false"],
    distribution: body?.options?.distribution ?? "balanced",
    includeExplanations: body?.options?.includeExplanations ?? true,
    randomize: body?.options?.randomize ?? true,
  };

  if (noteIds.length === 0 && reviewerIds.length === 0) {
    return NextResponse.json({ error: "Select at least one memory or reviewer." }, { status: 400 });
  }

  for (const id of noteIds) {
    if (!(await canView(user.id, "NOTE", id))) return NextResponse.json({ error: "One or more memories could not be found." }, { status: 404 });
  }
  for (const id of reviewerIds) {
    if (!(await canView(user.id, "REVIEWER", id))) return NextResponse.json({ error: "One or more reviewers could not be found." }, { status: 404 });
  }

  const [notes, reviewers] = await Promise.all([
    findNotesByIds(noteIds),
    findReviewersByIds(reviewerIds),
  ]);

  const sources = [
    ...notes.map((n) => ({ title: n.title, content: n.content })),
    ...reviewers.map((r) => ({ title: r.title, content: r.content })),
  ];

  const text = buildQuizGenerationPrompt(sources, options);
  return NextResponse.json({ text });
});
