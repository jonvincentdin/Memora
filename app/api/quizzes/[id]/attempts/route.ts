import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserOrNull } from "@/lib/auth/session";
import { canView } from "@/lib/permissions";
import { submitAttemptSchema } from "@/lib/validation/quiz";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { gradeQuiz } from "@/lib/quiz-grading";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";

// GET: list this user's past attempts for a quiz. POST: submit a new attempt (auto-graded).
export const GET = withApiErrorHandling(async (_request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await canView(user.id, "QUIZ", params.id);
  if (!allowed) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: params.id, userId: user.id },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json({ attempts });
});

export const POST = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const params = await context.params;
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  const allowed = await canView(user.id, "QUIZ", params.id);
  if (!allowed) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = submitAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission." }, { status: 400 });
  }

  const active = await prisma.quizAttempt.findFirst({ where: { id: parsed.data.attemptId, userId: user.id, quizId: quiz.id } });
  if (!active) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (active.status !== "IN_PROGRESS") return NextResponse.json({ error: "This attempt was already submitted." }, { status: 409 });
  const expired = Boolean(active.deadline && active.deadline < new Date());
  const submittedAnswers = expired && active.answers && typeof active.answers === "object"
    ? active.answers as Record<string, unknown>
    : parsed.data.answers;
  const submittedFlags = expired && Array.isArray(active.flagged) ? active.flagged as string[] : parsed.data.flagged;
  const questions = quiz.questions as unknown as QuizQuestion[];
  const { score, gradedAnswers } = gradeQuiz(questions, submittedAnswers);
  const attempt = await prisma.quizAttempt.update({
    where: { id: active.id },
    data: { score, totalQuestions: questions.length, answers: gradedAnswers as unknown as Prisma.InputJsonValue, flagged: submittedFlags as Prisma.InputJsonValue, status: "COMPLETED", completedAt: active.deadline && expired ? active.deadline : new Date() },
  });

  return NextResponse.json({ attempt }, { status: 201 });
});
