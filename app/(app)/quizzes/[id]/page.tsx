import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, PlayCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getAccessLevel } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { DeleteQuizButton } from "@/components/quizzes/delete-quiz-button";
import { ShareDialog } from "@/components/sharing/share-dialog";
import { ExportQuizPdfButton } from "@/components/quizzes/export-quiz-pdf-button";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/validation/quiz";

export default async function QuizDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const access = await getAccessLevel(user.id, "QUIZ", params.id);
  if (access === "NONE") notFound();

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz) notFound();

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: quiz.id, userId: user.id, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 10,
  });

  const questionCount = Array.isArray(quiz.questions) ? (quiz.questions as unknown[]).length : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/quizzes" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to quizzes
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Badge tone="neutral">{quiz.mode.replace("_", " ")}</Badge>
        <div className="flex items-center gap-2">
          <a href={`/api/quizzes/export?id=${quiz.id}&format=json`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-ink hover:bg-ink/5">
            <Download className="h-3.5 w-3.5" /> JSON
          </a>
          <ExportQuizPdfButton
            title={quiz.title}
            questions={quiz.questions as unknown as QuizQuestion[]}
            author={user.name}
            mode={quiz.mode}
          />
          {access === "OWNER" && <ShareDialog resourceType="QUIZ" resourceId={quiz.id} />}
          {access === "OWNER" && <DeleteQuizButton quizId={quiz.id} />}
        </div>
      </div>

      <h1 className="font-display text-2xl text-ink">{quiz.title}</h1>
      {quiz.description && <p className="mt-1 text-ink-soft">{quiz.description}</p>}
      <p className="mt-1 text-xs text-ink-faint">{questionCount} questions · updated {formatDate(quiz.updatedAt)}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href={`/quizzes/${quiz.id}/play?mode=review`} className="card p-4 hover:border-accent hover:shadow-card-hover">
          <span className="flex items-center gap-2 font-medium text-ink"><PlayCircle className="h-4 w-4" /> Review mode</span>
          <span className="mt-1 block text-xs text-ink-soft">Check each answer immediately and learn as you go.</span>
        </Link>
        <Link href={`/quizzes/${quiz.id}/play?mode=exam`} className="card p-4 hover:border-accent hover:shadow-card-hover">
          <span className="flex items-center gap-2 font-medium text-ink"><PlayCircle className="h-4 w-4" /> Exam mode</span>
          <span className="mt-1 block text-xs text-ink-soft">Finish the full test before seeing results or explanations.</span>
        </Link>
      </div>

      {attempts.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 font-display text-lg text-ink">Past attempts</h2>
          <div className="space-y-2">
            {attempts.map((a) => (
              <Link
                key={a.id}
                href={`/quizzes/${quiz.id}/results?attempt=${a.id}`}
                className="card flex items-center justify-between p-3 hover:shadow-card-hover"
              >
                <span className="text-sm text-ink">
                  {a.score}/{a.totalQuestions} ({Math.round((a.score / Math.max(a.totalQuestions, 1)) * 100)}%)
                </span>
                <span className="text-xs text-ink-faint">{a.completedAt ? formatRelativeTime(a.completedAt) : ""}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
