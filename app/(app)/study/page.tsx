import Link from "next/link";
import { GraduationCap, Layers, RotateCcw, CalendarCheck, Flame } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";

export default async function StudyHubPage() {
  const user = await requireUser();
  const [reviewers, recentMistakeAttempts, dueCount, recentReviews] = await Promise.all([
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, updatedAt: true } }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: {
        id: true,
        score: true,
        totalQuestions: true,
        completedAt: true,
        quiz: { select: { id: true, title: true } },
      },
    }),
    prisma.flashcard.count({ where: { ownerId: user.id, OR: [{ progress: { none: { userId: user.id } } }, { progress: { some: { userId: user.id, dueAt: { lte: new Date() } } } }] } }),
    prisma.flashcardReview.findMany({ where: { userId: user.id, reviewedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, select: { reviewedAt: true }, orderBy: { reviewedAt: "desc" } }),
  ]);
  const reviewDays = new Set(recentReviews.map((review) => review.reviewedAt.toISOString().slice(0, 10)));
  let streak = 0;
  for (let offset = 0; offset < 30; offset++) {
    const day = new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
    if (reviewDays.has(day)) streak += 1;
    else if (offset > 0) break;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="font-display text-2xl text-ink">Study</h1>
        <p className="mt-1 text-sm text-ink-soft">Flashcards and mistake review, built from what you already have.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/study/review" className="card flex items-center gap-3 p-4 hover:shadow-card-hover"><CalendarCheck className="h-5 w-5 text-accent-dark" /><div><p className="font-medium text-ink">{dueCount} card{dueCount === 1 ? "" : "s"} due</p><p className="text-xs text-ink-soft">Start your spaced-repetition queue</p></div></Link>
        <div className="card flex items-center gap-3 p-4"><Flame className="h-5 w-5 text-accent-dark" /><div><p className="font-medium text-ink">{streak}-day streak</p><p className="text-xs text-ink-soft">Reviews completed on consecutive days</p></div></div>
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
            actionHref="/reviewers?create=1"
            secondaryActionLabel="Import a note"
            secondaryActionHref="/notes/import"
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

    </div>
  );
}
