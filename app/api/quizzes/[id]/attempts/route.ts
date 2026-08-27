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

  const allowed = await canView(user.id, "QUIZ", params.id);
  if (!allowed) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = submitAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission." }, { status: 400 });
  }

  const questions = quiz.questions as unknown as QuizQuestion[];
  const { score, gradedAnswers } = gradeQuiz(questions, parsed.data.answers);

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      quizId: quiz.id,
      score,
      totalQuestions: questions.length,
      answers: gradedAnswers as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ attempt }, { status: 201 });
});
