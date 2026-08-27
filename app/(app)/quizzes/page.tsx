import Link from "next/link";
import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { QuizWizard } from "@/components/quizzes/quiz-wizard";
import { formatRelativeTime } from "@/lib/utils";

export default async function QuizzesPage({ searchParams }: { searchParams: { fromReviewer?: string } }) {
  const user = await requireUser();
  const [quizzes, notes, reviewers] = await Promise.all([
    prisma.quiz.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" } }),
    prisma.note.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Quizzes</h1>
          <p className="mt-1 text-sm text-ink-soft">Test yourself with questions built from your own material.</p>
        </div>
        <QuizWizard notes={notes} reviewers={reviewers} defaultReviewerId={searchParams.fromReviewer} />
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Create a quiz from your study material."
          description="Pick notes or reviewers above and generate quiz questions."
          actionLabel="Import a note first"
          actionHref="/notes/import"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => {
            const questionCount = Array.isArray(q.questions) ? (q.questions as unknown[]).length : 0;
            return (
              <Link key={q.id} href={`/quizzes/${q.id}`} className="card p-4 hover:shadow-card-hover">
                <div className="mb-2 flex items-center justify-between">
                  <Badge tone="neutral">{q.mode.replace("_", " ")}</Badge>
                  <span className="text-xs text-ink-faint">{formatRelativeTime(q.updatedAt)}</span>
                </div>
                <p className="font-display text-base text-ink line-clamp-1">{q.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{questionCount} question{questionCount !== 1 ? "s" : ""}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
