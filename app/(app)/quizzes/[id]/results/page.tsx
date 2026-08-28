import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevelForOwner } from "@/lib/permissions";
import type { QuizQuestion } from "@/lib/validation/quiz";
import { formatCorrectAnswer } from "@/lib/quiz-grading";

export default async function QuizResultsPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ attempt?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireUser();
  const attemptQuery = searchParams.attempt
    ? prisma.quizAttempt.findFirst({ where: { id: searchParams.attempt, quizId: params.id, userId: user.id } })
    : prisma.quizAttempt.findFirst({
        where: { quizId: params.id, userId: user.id, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
      });
  const [quiz, attempt] = await Promise.all([
    prisma.quiz.findUnique({ where: { id: params.id } }),
    attemptQuery,
  ]);
  if (!quiz) notFound();
  const access = await getAccessLevelForOwner(user.id, "QUIZ", params.id, quiz.ownerId);
  if (access === "NONE") notFound();
  if (!attempt) notFound();

  const rawQuestions = quiz.questions as unknown as QuizQuestion[];
  const order = Array.isArray(attempt.questionOrder) ? attempt.questionOrder as string[] : [];
  const byId = new Map(rawQuestions.map((question) => [question.id, question]));
  const questions = order.length ? order.map((id) => byId.get(id)).filter((question): question is QuizQuestion => Boolean(question)) : rawQuestions;
  const gradedAnswers = attempt.answers as Record<string, { given: unknown; correct: boolean }>;
  const percentage = Math.round((attempt.score / Math.max(attempt.totalQuestions, 1)) * 100);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/quizzes/${quiz.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to quiz
      </Link>

      <div className="card p-8 text-center">
        <p className="text-xs uppercase tracking-wide text-ink-faint">Your score</p>
        <p className="mt-2 font-display text-5xl text-ink">{percentage}%</p>
        <p className="mt-1 text-sm text-ink-soft">
          {attempt.score} out of {attempt.totalQuestions} correct
        </p>
        <Link
          href={`/quizzes/${quiz.id}/play`}
          className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink/90"
        >
          <RotateCcw className="h-4 w-4" /> Retake
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        <h2 className="font-display text-lg text-ink">Question review</h2>
        {questions.map((q, i) => {
          const graded = gradedAnswers[q.id];
          return (
            <div key={q.id} className="card p-4">
              <div className="flex items-start gap-2">
                {graded?.correct ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {i + 1}. {q.question}
                  </p>
                  {!graded?.correct && (
                    <p className="mt-1 text-xs text-ink-faint">
                      Your answer: {formatGiven(graded?.given)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink"><strong>Correct answer:</strong> {formatCorrectAnswer(q)}</p>
                  {q.explanation && <p className="mt-1.5 text-sm text-ink-soft">{q.explanation}</p>}
                  {q.sourceSection && <p className="mt-2 text-xs text-ink-faint">Source: {q.sourceSection}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatGiven(given: unknown): string {
  if (given === null || given === undefined) return "No answer";
  if (typeof given === "object") return JSON.stringify(given);
  return String(given);
}
