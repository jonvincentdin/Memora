import Link from "next/link";
import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { QuizWizardLauncher } from "@/components/quizzes/quiz-wizard-launcher";
import { formatRelativeTime } from "@/lib/utils";
import { LibraryNavigation } from "@/components/library/library-navigation";
import { TagList } from "@/components/library/tag-list";

export default async function QuizzesPage(props: { searchParams: Promise<{ create?: string; fromNote?: string; fromReviewer?: string; source?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [quizzes, notes, reviewers, settings] = await Promise.all([
    prisma.quiz.findMany({
      where: { ownerId: user.id, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * 24,
      take: 24,
      select: { id: true, title: true, mode: true, questions: true, updatedAt: true, isFavorite: true, tags: { select: { tag: { select: { id: true, name: true, color: true } } } } },
    }),
    prisma.note.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
    prisma.reviewer.findMany({ where: { ownerId: user.id, archivedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }),
    prisma.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {}, select: { defaultQuestionCount: true, defaultDifficulty: true, defaultQuizMode: true } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Quizzes</h1>
          <p className="mt-1 text-sm text-ink-soft">Test yourself with questions built from your own material.</p>
        </div>
        <QuizWizardLauncher key={`${searchParams.create}-${searchParams.source}-${searchParams.fromNote}-${searchParams.fromReviewer}`} notes={notes} reviewers={reviewers} defaultNoteId={searchParams.fromNote} defaultReviewerId={searchParams.fromReviewer} initiallyOpen={searchParams.create === "1"} initialMode={searchParams.source === "import" ? "import" : "existing"} defaults={{ questionCount: settings.defaultQuestionCount, difficulty: settings.defaultDifficulty, mode: settings.defaultQuizMode }} />
      </div>
      <LibraryNavigation basePath="/quizzes" page={page} hasNext={quizzes.length === 24} />

      {quizzes.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Create a quiz from your study material."
          description="Pick notes or reviewers above and generate quiz questions."
          actionLabel={notes.length > 0 || reviewers.length > 0 ? "Choose existing study material" : "Import a note first"}
          actionHref={notes.length > 0 || reviewers.length > 0 ? "/quizzes?create=1&source=existing" : "/notes/import"}
          secondaryActionLabel="Import quiz"
          secondaryActionHref="/quizzes?create=1&source=import"
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
                {q.isFavorite && <span className="text-xs text-accent-dark">★ Favorite</span>}
                <p className="mt-1 text-sm text-ink-soft">{questionCount} question{questionCount !== 1 ? "s" : ""}</p>
                <TagList tags={q.tags.map(({ tag }) => tag)} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
