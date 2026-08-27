import Link from "next/link";
import { GraduationCap, Layers, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";

export default async function StudyHubPage() {
  const user = await requireUser();
  const [reviewers, recentMistakeAttempts] = await Promise.all([
    prisma.reviewer.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, updatedAt: true } }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 5,
      include: { quiz: { select: { id: true, title: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="font-display text-2xl text-ink">Study</h1>
        <p className="mt-1 text-sm text-ink-soft">Flashcards and mistake review, built from what you already have.</p>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-ink">
          <Layers className="h-4 w-4 text-accent-dark" /> Flashcards from a reviewer
        </h2>
        {reviewers.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No reviewers yet."
            description="Build a reviewer from your notes first, then study it here as flashcards."
            actionLabel="Create a reviewer"
            actionHref="/reviewers"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reviewers.map((r) => (
              <Link key={r.id} href={`/study/flashcards/${r.id}`} className="card p-4 hover:shadow-card-hover">
                <p className="font-display text-base text-ink line-clamp-1">{r.title}</p>
                <p className="mt-1 text-xs text-ink-faint">{formatRelativeTime(r.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-ink">
          <RotateCcw className="h-4 w-4 text-accent-dark" /> Review recent quiz mistakes
        </h2>
        {recentMistakeAttempts.length === 0 ? (
          <p className="text-sm text-ink-soft">Complete a quiz to review your mistakes here.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentMistakeAttempts.map((a) => (
              <Link key={a.id} href={`/quizzes/${a.quiz.id}/results?attempt=${a.id}`} className="card p-4 hover:shadow-card-hover">
                <p className="font-display text-base text-ink line-clamp-1">{a.quiz.title}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {a.score}/{a.totalQuestions} · {a.completedAt ? formatRelativeTime(a.completedAt) : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* TODO: mastery-mode practice (adaptive difficulty based on attempt history) is not implemented yet. */}
    </div>
  );
}
