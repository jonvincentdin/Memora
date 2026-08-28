import { NextResponse } from "next/server";
import { Prisma, type TestMode } from "@prisma/client";
import { withApiErrorHandling, type RouteContext } from "@/lib/api/handler";
import { requireUserOrNull } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getAccessLevelForOwner } from "@/lib/permissions";
import type { QuizConfiguration, QuizQuestion } from "@/lib/validation/quiz";

export const POST = withApiErrorHandling(async (request: Request, context: RouteContext<{ id: string }>) => {
  const [{ id }, user, body] = await Promise.all([context.params, requireUserOrNull(), request.json().catch(() => null)]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const testMode: TestMode = body?.testMode === "review" ? "REVIEW" : "EXAM";
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  const access = await getAccessLevelForOwner(user.id, "QUIZ", id, quiz.ownerId);
  if (access === "NONE") return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  const configuration = quiz.configuration as unknown as QuizConfiguration;
  const now = new Date();
  const active = await prisma.quizAttempt.findFirst({
    where: { quizId: id, userId: user.id, testMode, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  if (active && (!active.deadline || active.deadline > now)) return NextResponse.json({ attempt: active, resumed: true });
  if (active) await prisma.quizAttempt.update({ where: { id: active.id }, data: { status: "EXPIRED" } });

  if (configuration.attempts !== "unlimited") {
    const completed = await prisma.quizAttempt.count({ where: { quizId: id, userId: user.id, status: "COMPLETED" } });
    const limit = configuration.attempts === "one" ? 1 : configuration.customAttemptLimit ?? 1;
    if (completed >= limit) return NextResponse.json({ error: "You have reached the attempt limit for this quiz." }, { status: 409 });
  }

  const questions = quiz.questions as unknown as QuizQuestion[];
  const questionOrder = questions.map((question) => question.id);
  if (quiz.mode === "MASTERY_TEST") {
    const recent = await prisma.quizAttempt.findMany({ where: { quizId: id, userId: user.id, status: "COMPLETED" }, orderBy: { completedAt: "desc" }, take: 10, select: { answers: true } });
    const misses = new Map<string, number>();
    for (const attempt of recent) {
      const graded = attempt.answers as Record<string, { correct?: boolean }>;
      for (const [questionId, answer] of Object.entries(graded)) if (answer?.correct === false) misses.set(questionId, (misses.get(questionId) ?? 0) + 1);
    }
    questionOrder.sort((left, right) => (misses.get(right) ?? 0) - (misses.get(left) ?? 0) || Math.random() - 0.5);
  } else if (configuration.randomizeQuestions) shuffle(questionOrder);
  const deadline = testMode === "EXAM" && configuration.timeLimitMinutes
    ? new Date(now.getTime() + configuration.timeLimitMinutes * 60_000)
    : null;
  try {
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        quizId: id,
        totalQuestions: questions.length,
        questionOrder: questionOrder as unknown as Prisma.InputJsonValue,
        testMode,
        deadline,
      },
    });
    return NextResponse.json({ attempt, resumed: false }, { status: 201 });
  } catch (error) {
    // A partial unique index allows only one active attempt per user/mode.
    // React Strict Mode or a double click can race the earlier lookup.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const resumed = await prisma.quizAttempt.findFirst({ where: { quizId: id, userId: user.id, testMode, status: "IN_PROGRESS" }, orderBy: { startedAt: "desc" } });
      if (resumed) return NextResponse.json({ attempt: resumed, resumed: true });
    }
    throw error;
  }
});

function shuffle<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
}
